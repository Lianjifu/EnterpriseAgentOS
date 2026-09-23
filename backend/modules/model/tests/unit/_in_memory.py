"""In-memory test doubles for model application ports.

Used by ``test_model_service`` and the eventual integration tests.
Implements the protocols defined in ``application/ports``.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from eos_llm import ChatMessage, ChatRequest, ChatResponse, LLMClient, Usage
from eos_schema.ids import (
    CredentialId,
    ModelId,
    RoutingPolicyId,
    TenantId,
)

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
    QuotaCounter,
    RoutingPolicy,
)

# ── Clock / ids / publisher ──────────────────────────────────────────────


class FixedClock(ClockPort):
    def __init__(self, initial: datetime | None = None) -> None:
        self._now = initial or datetime(2026, 9, 22, 12, 0, tzinfo=UTC)
        self.advances = 0

    def now(self) -> datetime:
        return self._now

    def advance_seconds(self, seconds: int) -> None:
        self._now = self._now + timedelta(seconds=seconds)
        self.advances += 1


class SequenceIds(IdGeneratorPort):
    def __init__(self) -> None:
        self._counter = 0
        self.generated: list[UUID] = []

    def new_id(self) -> UUID:
        self._counter += 1
        uid = UUID(int=self._counter)
        self.generated.append(uid)
        return uid


class CollectingPublisher(ModelEventPublisher):
    def __init__(self) -> None:
        self.published: list[tuple[str, dict[str, Any]]] = []

    async def publish(self, topic: str, payload: dict[str, Any]) -> None:
        self.published.append((topic, payload))


# ── Cipher (in-memory + reversible) ───────────────────────────────────────


class InMemoryCipher(CredentialCipher):
    """Deterministic xor cipher for tests (NOT a real cipher)."""

    def __init__(self, key_version: int = 1) -> None:
        self._kv = key_version
        self.encrypted: list[bytes] = []
        self.decrypted: list[bytes] = []

    @property
    def key_version(self) -> int:
        return self._kv

    def encrypt(self, plaintext: bytes, *, aad: bytes | None = None) -> bytes:
        # Store plaintext so tests can inspect what was sent.
        self.encrypted.append(plaintext)
        return b"ENC:" + plaintext

    def decrypt(self, blob: bytes, *, aad: bytes | None = None) -> bytes:
        if not blob.startswith(b"ENC:"):
            raise ValueError("cipher: bad blob prefix")
        plain = blob[4:]
        self.decrypted.append(plain)
        return plain


# ── Repositories ──────────────────────────────────────────────────────────


class InMemoryModelRepository(ModelRepository):
    def __init__(self) -> None:
        self._rows: dict[tuple[TenantId, ModelId], Model] = {}

    async def add(self, model: Model) -> None:
        self._rows[(model.tenant_id, model.id)] = model

    async def get(self, *, tenant_id: TenantId, model_id: ModelId) -> Model | None:
        return self._rows.get((tenant_id, model_id))

    async def get_by_name(self, *, tenant_id: TenantId, name: str) -> Model | None:
        for m in self._rows.values():
            if m.tenant_id == tenant_id and m.name == name:
                return m
        return None

    async def list(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: UUID | None = None,
        enabled_only: bool = False,
        limit: int = 100,
    ) -> list[Model]:
        out = [m for m in self._rows.values() if m.tenant_id == tenant_id]
        if workspace_id is not None:
            # Tenant-wide models (workspace_id is None) are always
            # visible to any workspace in the tenant; only sibling
            # workspace rows are filtered out.
            out = [
                m
                for m in out
                if m.workspace_id is None or m.workspace_id == workspace_id
            ]
        if enabled_only:
            out = [m for m in out if m.enabled]
        return out[:limit]

    async def update(self, model: Model) -> None:
        self._rows[(model.tenant_id, model.id)] = model

    async def delete(self, *, tenant_id: TenantId, model_id: ModelId) -> bool:
        return self._rows.pop((tenant_id, model_id), None) is not None


class InMemoryCredentialRepository(CredentialRepository):
    def __init__(self) -> None:
        self._rows: dict[tuple[TenantId, CredentialId], ModelCredential] = {}

    async def add(self, credential: ModelCredential) -> None:
        self._rows[(credential.tenant_id, credential.id)] = credential

    async def get(
        self, *, tenant_id: TenantId, credential_id: CredentialId
    ) -> ModelCredential | None:
        return self._rows.get((tenant_id, credential_id))

    async def list(
        self, *, tenant_id: TenantId, limit: int = 100
    ) -> list[ModelCredential]:
        return [c for c in self._rows.values() if c.tenant_id == tenant_id][:limit]

    async def update(self, credential: ModelCredential) -> None:
        self._rows[(credential.tenant_id, credential.id)] = credential

    async def delete(self, *, tenant_id: TenantId, credential_id: CredentialId) -> bool:
        return self._rows.pop((tenant_id, credential_id), None) is not None


class InMemoryRoutingPolicyRepository(RoutingPolicyRepository):
    def __init__(self) -> None:
        self._rows: dict[tuple[TenantId, RoutingPolicyId], RoutingPolicy] = {}

    async def add(self, policy: RoutingPolicy) -> None:
        self._rows[(policy.tenant_id, policy.id)] = policy

    async def get(
        self, *, tenant_id: TenantId, policy_id: RoutingPolicyId
    ) -> RoutingPolicy | None:
        return self._rows.get((tenant_id, policy_id))

    async def get_for_model(
        self, *, tenant_id: TenantId, model_id: ModelId
    ) -> RoutingPolicy | None:
        for p in self._rows.values():
            if p.tenant_id == tenant_id and (
                p.primary_model_id == model_id or model_id in p.failover_model_ids
            ):
                return p
        return None

    async def list(
        self, *, tenant_id: TenantId, limit: int = 100
    ) -> list[RoutingPolicy]:
        return [p for p in self._rows.values() if p.tenant_id == tenant_id][:limit]


class InMemoryQuotaCounterRepository(QuotaCounterRepository):
    def __init__(self) -> None:
        # (tenant_id, model_id, window_start) → QuotaCounter
        self._rows: dict[tuple[TenantId, ModelId, datetime], QuotaCounter] = {}

    async def get(
        self,
        *,
        tenant_id: TenantId,
        model_id: ModelId,
        window_start: datetime,
    ) -> QuotaCounter | None:
        return self._rows.get((tenant_id, model_id, window_start))

    async def increment(
        self,
        *,
        tenant_id: TenantId,
        model_id: ModelId,
        window_start: datetime,
        input_tokens: int,
        output_tokens: int,
    ) -> QuotaCounter:
        key = (tenant_id, model_id, window_start)
        existing = self._rows.get(key)
        if existing is None:
            existing = QuotaCounter(
                tenant_id=tenant_id,
                model_id=model_id,
                window_start=window_start,
                input_tokens=0,
                output_tokens=0,
                requests=0,
            )
        updated = QuotaCounter(
            tenant_id=existing.tenant_id,
            model_id=existing.model_id,
            window_start=existing.window_start,
            input_tokens=existing.input_tokens + input_tokens,
            output_tokens=existing.output_tokens + output_tokens,
            requests=existing.requests + 1,
            created_at=existing.created_at,
            updated_at=datetime.now(UTC),
        )
        self._rows[key] = updated
        return updated

    async def get_window_usage(
        self,
        *,
        tenant_id: TenantId,
        model_id: ModelId,
        window_start: datetime,
    ) -> int:
        qc = self._rows.get((tenant_id, model_id, window_start))
        if qc is None:
            return 0
        return qc.input_tokens + qc.output_tokens


# ── Mock LLM client + factory ────────────────────────────────────────────


class EchoLLMClient(LLMClient):
    """Returns an echo of the last user message with deterministic usage."""

    name = "mock-echo"

    def __init__(self) -> None:
        self.calls: list[ChatRequest] = []
        self.fail_next = False
        self.fail_code: str = "MODEL_INVOKE_ERROR"

    async def chat(self, req: ChatRequest) -> ChatResponse:
        self.calls.append(req)
        if self.fail_next:
            self.fail_next = False
            from deos.modules.model.domain.errors import ModelError

            raise ModelError("forced failure", code=self.fail_code)
        last_user = next((m for m in reversed(req.messages) if m.role == "user"), None)
        text = (last_user.content if last_user else "") or ""
        return ChatResponse(
            model=req.model,
            message=ChatMessage(role="assistant", content=text),
            finish_reason="stop",
            usage=Usage(input_tokens=len(text), output_tokens=len(text)),
        )


class EchoClientFactory(ModelClientFactory):
    def __init__(self) -> None:
        self.client = EchoLLMClient()
        self.builds: list[tuple[str, str | None]] = []

    def build(
        self,
        *,
        model: Model,
        api_key: str,
        base_url: str | None,
    ) -> LLMClient:
        self.builds.append((api_key, base_url))
        return self.client


__all__ = [
    "CollectingPublisher",
    "EchoClientFactory",
    "EchoLLMClient",
    "FixedClock",
    "InMemoryCipher",
    "InMemoryCredentialRepository",
    "InMemoryModelRepository",
    "InMemoryQuotaCounterRepository",
    "InMemoryRoutingPolicyRepository",
    "SequenceIds",
]
