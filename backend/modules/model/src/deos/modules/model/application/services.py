"""Model module — application services.

``ModelService`` is the orchestrator: register / invoke / rotate / list.
It depends only on ports (Protocols) — adapters are wired by the
composition container.

The hot path is ``invoke()``:

1. load ``Model`` (tenant-scoped) → raise ModelNotFound / ModelDisabled
2. decrypt credential via ``CredentialCipher`` (cached in adapter layer)
3. check ``selection_rules["quota_cap_per_minute"]`` against the current
   window's bucket — raise QuotaExceeded if cap reached
4. build ``LLMClient`` via ``ModelClientFactory`` and call ``.chat(req)``
5. increment quota counters in a single UPDATE...RETURNING
6. publish ``ModelInvoked`` event
7. return ChatResponse
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from eos_llm import ChatRequest, ChatResponse
from eos_schema.ids import (
    CredentialId,
    ModelId,
    RoutingPolicyId,
    TenantId,
)
from eos_vault.actor import ActorContext

from deos.modules.model.application.ports import (
    ClockPort,
    CredentialCipher,
    CredentialRepository,
    IdGeneratorPort,
    ModelClientFactory,
    ModelEventPublisher,
    ModelRepository,
    QuotaCounterRepository,
    RoutingPolicyRepository,
)
from deos.modules.model.domain.entities import (
    Model,
    ModelCredential,
    bucket_start,
    make_credential,
    make_model,
)
from deos.modules.model.domain.errors import (
    CredentialNotFound,
    ModelAlreadyExists,
    ModelDisabled,
    ModelNotFound,
    QuotaExceeded,
    RoutingPolicyNotFound,
)
from deos.modules.model.domain.events import (
    ModelCredentialRotated,
    ModelInvoked,
    ModelQuotaExceeded,
    ModelRegistered,
)
from deos.modules.model.domain.value_objects import ModelProvider

DEFAULT_QUOTA_WINDOW = "minute"

_log = logging.getLogger(__name__)


@dataclass(slots=True, frozen=True)
class ModelService:
    """Orchestrates the model domain. Construct via ``from_parts``."""

    model_repo: ModelRepository
    credential_repo: CredentialRepository
    routing_repo: RoutingPolicyRepository
    quota_repo: QuotaCounterRepository
    client_factory: ModelClientFactory
    cipher: CredentialCipher
    clock: ClockPort
    ids: IdGeneratorPort
    publisher: ModelEventPublisher | None = None

    # ── factories ────────────────────────────────────────────────────────

    @classmethod
    def from_parts(
        cls,
        *,
        model_repo: ModelRepository,
        credential_repo: CredentialRepository,
        routing_repo: RoutingPolicyRepository,
        quota_repo: QuotaCounterRepository,
        client_factory: ModelClientFactory,
        cipher: CredentialCipher,
        clock: ClockPort,
        ids: IdGeneratorPort,
        publisher: ModelEventPublisher | None = None,
    ) -> ModelService:
        return cls(
            model_repo=model_repo,
            credential_repo=credential_repo,
            routing_repo=routing_repo,
            quota_repo=quota_repo,
            client_factory=client_factory,
            cipher=cipher,
            clock=clock,
            ids=ids,
            publisher=publisher,
        )

    # ── register ────────────────────────────────────────────────────────

    async def register(
        self,
        *,
        actor: ActorContext,
        name: str,
        provider: ModelProvider,
        upstream_model: str,
        workspace_id: Any | None = None,
        credential_id: CredentialId | None = None,
        routing_policy_id: RoutingPolicyId | None = None,
    ) -> Model:
        existing = await self.model_repo.get_by_name(
            tenant_id=actor.tenant_id, name=name
        )
        if existing is not None:
            raise ModelAlreadyExists(
                f"model {name!r} already exists for tenant",
                code="MODEL_ALREADY_EXISTS",
            )
        model = make_model(
            tenant_id=actor.tenant_id,
            workspace_id=workspace_id,
            name=name,
            provider=provider,
            upstream_model=upstream_model,
            credential_id=credential_id,
            routing_policy_id=routing_policy_id,
        )
        await self.model_repo.add(model)
        await self._publish(
            ModelRegistered(
                tenant_id=actor.tenant_id,
                actor_id=actor.principal_id if actor.principal_id else None,
                model_id=model.id,
                provider=provider.value,
                upstream_model=upstream_model,
            ).TOPIC,
            ModelRegistered(
                tenant_id=actor.tenant_id,
                actor_id=actor.principal_id if actor.principal_id else None,
                model_id=model.id,
                provider=provider.value,
                upstream_model=upstream_model,
            ).to_payload(),
        )
        return model

    # ── register credential ─────────────────────────────────────────────

    async def register_credential(
        self,
        *,
        actor: ActorContext,
        provider: ModelProvider,
        label: str,
        api_key: str,
        base_url: str | None = None,
    ) -> ModelCredential:
        if not api_key:
            raise ValueError("api_key must be non-empty")
        # Embed base_url in AAD so the cipher rejects keys bound to a
        # different upstream endpoint (defense-in-depth).
        aad = f"provider={provider.value}|base_url={base_url or ''}".encode()
        ciphertext = self.cipher.encrypt(api_key.encode("utf-8"), aad=aad)
        # The encrypted_payload holds (ciphertext + base_url) so the
        # client factory can rehydrate the credential at invoke time.
        envelope = ciphertext + (
            b"\x00" + base_url.encode("utf-8") if base_url else b""
        )
        cred = make_credential(
            tenant_id=actor.tenant_id,
            provider=provider,
            label=label,
            encrypted_payload=envelope,
            key_version=self.cipher.key_version,
        )
        await self.credential_repo.add(cred)
        return cred

    # ── rotate credential ───────────────────────────────────────────────

    async def rotate_credential(
        self,
        *,
        actor: ActorContext,
        credential_id: CredentialId,
        new_api_key: str,
    ) -> ModelCredential:
        cred = await self.credential_repo.get(
            tenant_id=actor.tenant_id, credential_id=credential_id
        )
        if cred is None:
            raise CredentialNotFound(
                "credential not found",
                code="CREDENTIAL_NOT_FOUND",
            )
        aad = _extract_aad_from_envelope(cred.encrypted_payload, cred.provider)
        new_ct = self.cipher.encrypt(new_api_key.encode("utf-8"), aad=aad)
        new_payload = _build_envelope(
            new_ct, _base_url_from_envelope(cred.encrypted_payload)
        )
        rotated = cred.with_rotated(
            encrypted_payload=new_payload,
            key_version=self.cipher.key_version,
        )
        await self.credential_repo.update(rotated)
        await self._publish(
            ModelCredentialRotated(
                tenant_id=actor.tenant_id,
                actor_id=actor.principal_id if actor.principal_id else None,
                credential_id=cred.id,
                provider=cred.provider.value,
                key_version=rotated.key_version,
            ).TOPIC,
            ModelCredentialRotated(
                tenant_id=actor.tenant_id,
                actor_id=actor.principal_id if actor.principal_id else None,
                credential_id=cred.id,
                provider=cred.provider.value,
                key_version=rotated.key_version,
            ).to_payload(),
        )
        return rotated

    # ── invoke (hot path) ────────────────────────────────────────────────

    async def invoke(
        self,
        *,
        actor: ActorContext,
        model_id: ModelId,
        req: ChatRequest,
    ) -> ChatResponse:
        model = await self.model_repo.get(tenant_id=actor.tenant_id, model_id=model_id)
        if model is None:
            raise ModelNotFound(
                f"model {model_id} not found",
                code="MODEL_NOT_FOUND",
            )
        if not model.enabled:
            raise ModelDisabled(
                f"model {model.name!r} disabled",
                code="MODEL_DISABLED",
            )
        api_key, base_url = await self._decrypt_credential(model)
        cap, window = await self._quota_policy(actor.tenant_id, model)  # type: ignore[arg-type]
        if cap is not None:
            used = await self.quota_repo.get_window_usage(
                tenant_id=actor.tenant_id,
                model_id=model.id,
                window_start=bucket_start(self.clock.now(), window),
            )
            if used >= cap:
                await self._publish_quota_exceeded(
                    actor=actor,
                    model_id=model.id,
                    used=used,
                    cap=cap,
                )
                raise QuotaExceeded(
                    f"quota cap {cap} tokens reached for {model.name!r}",
                    code="QUOTA_EXCEEDED",
                )

        client = self.client_factory.build(
            model=model,
            api_key=api_key,
            base_url=base_url,
        )
        start = self.clock.now()
        try:
            resp = await client.chat(req)
        except Exception as exc:
            latency_ms = int((self.clock.now() - start).total_seconds() * 1000)
            await self._publish_invoked(
                actor=actor,
                model=model,
                input_tokens=0,
                output_tokens=0,
                latency_ms=latency_ms,
                status="error",
                error_code=getattr(exc, "code", None) or "MODEL_INVOKE_ERROR",
            )
            raise
        latency_ms = int((self.clock.now() - start).total_seconds() * 1000)
        in_t = resp.usage.input_tokens
        out_t = resp.usage.output_tokens
        # Atomic increment — single UPDATE...RETURNING.
        await self.quota_repo.increment(
            tenant_id=actor.tenant_id,
            model_id=model.id,
            window_start=bucket_start(self.clock.now(), window),
            input_tokens=in_t,
            output_tokens=out_t,
        )
        await self._publish_invoked(
            actor=actor,
            model=model,
            input_tokens=in_t,
            output_tokens=out_t,
            latency_ms=latency_ms,
            status="ok",
            error_code=None,
        )
        return resp

    # ── list ─────────────────────────────────────────────────────────────

    async def list_models(
        self,
        *,
        actor: ActorContext,
        workspace_id: Any | None = None,
        enabled_only: bool = False,
        limit: int = 100,
    ) -> list[Model]:
        # Default to the actor's workspace so a workspace-scoped caller
        # never sees sibling workspaces' models; pass workspace_id=False
        # to opt out (tenant-wide listing).
        ws = workspace_id if workspace_id is not None else actor.workspace_id
        return await self.model_repo.list(
            tenant_id=actor.tenant_id,
            workspace_id=ws,
            enabled_only=enabled_only,
            limit=limit,
        )

    # ── internal helpers ────────────────────────────────────────────────

    async def _decrypt_credential(self, model: Model) -> tuple[str, str | None]:
        """Return (api_key, base_url) for the model's credential.

        Raises ``CredentialNotFound`` if the model has no credential
        attached (caller should add one before invoking).
        """
        if model.credential_id is None:
            raise CredentialNotFound(
                f"model {model.name!r} has no credential attached",
                code="CREDENTIAL_NOT_FOUND",
            )
        cred = await self.credential_repo.get(
            tenant_id=model.tenant_id, credential_id=model.credential_id
        )
        if cred is None:
            raise CredentialNotFound(
                "credential row missing",
                code="CREDENTIAL_NOT_FOUND",
            )
        ct, base_url = _split_envelope(cred.encrypted_payload)
        aad = _extract_aad_from_envelope(cred.encrypted_payload, cred.provider)
        plaintext = self.cipher.decrypt(ct, aad=aad)
        return plaintext.decode("utf-8"), base_url

    async def _quota_policy(
        self, tenant_id: TenantId, model: Model
    ) -> tuple[int | None, str]:
        """Return (cap, window) for the model — cap=None means unlimited."""
        if model.routing_policy_id is None:
            return None, DEFAULT_QUOTA_WINDOW
        policy = await self.routing_repo.get(
            tenant_id=tenant_id, policy_id=model.routing_policy_id
        )
        if policy is None:
            raise RoutingPolicyNotFound(
                "routing policy row missing",
                code="ROUTING_POLICY_NOT_FOUND",
            )
        cap = policy.selection_rules.get("quota_cap_per_minute")
        window = policy.selection_rules.get("quota_window", DEFAULT_QUOTA_WINDOW)
        if cap is None:
            return None, DEFAULT_QUOTA_WINDOW
        try:
            return int(cap), str(window)
        except (TypeError, ValueError) as exc:
            raise ValueError(
                f"invalid quota policy in selection_rules: {cap!r}/{window!r}"
            ) from exc

    async def _publish(self, topic: str, payload: dict[str, Any]) -> None:
        if self.publisher is None:
            return
        try:
            await self.publisher.publish(topic, payload)
        except Exception:  # noqa: BLE001
            _log.warning("model.event.publish_failed", extra={"topic": topic})

    async def _publish_invoked(
        self,
        *,
        actor: ActorContext,
        model: Model,
        input_tokens: int,
        output_tokens: int,
        latency_ms: int,
        status: str,
        error_code: str | None,
    ) -> None:
        evt = ModelInvoked(
            tenant_id=actor.tenant_id,
            actor_id=actor.principal_id if actor.principal_id else None,
            model_id=model.id,
            provider=model.provider.value,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=latency_ms,
            status=status,
            error_code=error_code,
        )
        await self._publish(evt.TOPIC, evt.to_payload())

    async def _publish_quota_exceeded(
        self,
        *,
        actor: ActorContext,
        model_id: ModelId,
        used: int,
        cap: int,
    ) -> None:
        evt = ModelQuotaExceeded(
            tenant_id=actor.tenant_id,
            actor_id=actor.principal_id if actor.principal_id else None,
            model_id=model_id,
            window_start=bucket_start(self.clock.now(), DEFAULT_QUOTA_WINDOW),
            used_tokens=used,
            cap_tokens=cap,
        )
        await self._publish(evt.TOPIC, evt.to_payload())


# ── envelope helpers (ciphertext + base_url packed together) ─────────────


def _build_envelope(ciphertext: bytes, base_url: str | None) -> bytes:
    """Pack ciphertext with optional base_url suffix."""
    if base_url:
        return ciphertext + b"\x00" + base_url.encode("utf-8")
    return ciphertext


def _split_envelope(envelope: bytes) -> tuple[bytes, str | None]:
    """Inverse of :func:`_build_envelope`."""
    sep = envelope.find(b"\x00")
    if sep == -1:
        return envelope, None
    return envelope[:sep], envelope[sep + 1 :].decode("utf-8")


def _base_url_from_envelope(envelope: bytes) -> str | None:
    return _split_envelope(envelope)[1]


def _extract_aad_from_envelope(envelope: bytes, provider: ModelProvider) -> bytes:
    """Build the AAD that was used to encrypt the credential.

    The AAD binds the credential to its provider + base_url so a
    tampered envelope fails decryption.
    """
    base_url = _base_url_from_envelope(envelope) or ""
    return f"provider={provider.value}|base_url={base_url}".encode()


__all__ = [
    "DEFAULT_QUOTA_WINDOW",
    "ModelService",
    "_build_envelope",
    "_split_envelope",
]
