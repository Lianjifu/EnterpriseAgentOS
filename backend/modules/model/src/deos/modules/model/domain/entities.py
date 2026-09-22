"""Model module — entities.

All entities are frozen dataclasses (``slots=True``). Mutations go through
factory / ``with_*`` methods that return new instances.

The ``ModelCredential`` entity intentionally does NOT hold the plaintext
API key — only the AES-GCM ciphertext (12-byte nonce || ct || 16-byte
tag). Decryption happens in the application / adapter layer via the
``CredentialCipher`` port.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from eos_schema.ids import (
    CredentialId,
    ModelId,
    RoutingPolicyId,
    TenantId,
    WorkspaceId,
)

from deos.modules.model.domain.value_objects import ModelProvider, RoutingStrategy


def _utcnow() -> datetime:
    return datetime.now(UTC)


# ── Model ──────────────────────────────────────────────────────────────────


@dataclass(slots=True, frozen=True)
class Model:
    """A per-tenant model alias.

    ``name`` is the alias a workspace chooses (``gpt4o``); ``upstream_model``
    is the upstream identifier passed to the provider (``gpt-4o``).

    A model may point at a credential (for OpenAI / Anthropic / custom
    providers) and at a routing policy (for failover). Both are optional;
    ``enabled=False`` excludes the model from evaluation without deletion.
    """

    id: ModelId
    tenant_id: TenantId
    workspace_id: WorkspaceId | None
    name: str
    provider: ModelProvider
    upstream_model: str
    enabled: bool = True
    credential_id: CredentialId | None = None
    routing_policy_id: RoutingPolicyId | None = None
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)

    def with_enabled(self, enabled: bool) -> Model:
        now = _utcnow()
        return Model(
            id=self.id,
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            name=self.name,
            provider=self.provider,
            upstream_model=self.upstream_model,
            enabled=enabled,
            credential_id=self.credential_id,
            routing_policy_id=self.routing_policy_id,
            created_at=self.created_at,
            updated_at=now,
        )

    def with_credential(self, credential_id: CredentialId | None) -> Model:
        now = _utcnow()
        return Model(
            id=self.id,
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            name=self.name,
            provider=self.provider,
            upstream_model=self.upstream_model,
            enabled=self.enabled,
            credential_id=credential_id,
            routing_policy_id=self.routing_policy_id,
            created_at=self.created_at,
            updated_at=now,
        )

    def with_routing_policy(self, policy_id: RoutingPolicyId | None) -> Model:
        now = _utcnow()
        return Model(
            id=self.id,
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            name=self.name,
            provider=self.provider,
            upstream_model=self.upstream_model,
            enabled=self.enabled,
            credential_id=self.credential_id,
            routing_policy_id=policy_id,
            created_at=self.created_at,
            updated_at=now,
        )


def make_model(
    *,
    tenant_id: TenantId,
    workspace_id: WorkspaceId | None,
    name: str,
    provider: ModelProvider,
    upstream_model: str,
    credential_id: CredentialId | None = None,
    routing_policy_id: RoutingPolicyId | None = None,
    enabled: bool = True,
    model_id: ModelId | None = None,
    now: datetime | None = None,
) -> Model:
    """Factory: validate name + upstream_model, stamp times, assign id."""
    if not name or len(name) > 256:
        raise ValueError("model name must be 1-256 chars")
    if not upstream_model or len(upstream_model) > 256:
        raise ValueError("upstream_model must be 1-256 chars")
    ts = now or _utcnow()
    return Model(
        id=model_id or ModelId(uuid4()),
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        name=name,
        provider=provider,
        upstream_model=upstream_model,
        enabled=enabled,
        credential_id=credential_id,
        routing_policy_id=routing_policy_id,
        created_at=ts,
        updated_at=ts,
    )


# ── ModelCredential ───────────────────────────────────────────────────────


@dataclass(slots=True, frozen=True)
class ModelCredential:
    """Encrypted provider credential.

    ``encrypted_payload`` is ``nonce(12) || ciphertext || tag(16)`` produced
    by ``eos_vault.crypto.aes_gcm.encrypt``. Plaintext keys never appear
    in memory outside the cipher call boundary.

    ``key_version`` enables master-key rotation: if the version embedded
    here no longer matches the active master key, the loader decrypts
    with the historical key. (P10 implements rotation logic; P6 keeps
    ``key_version=1`` invariant.)
    """

    id: CredentialId
    tenant_id: TenantId
    provider: ModelProvider
    label: str
    encrypted_payload: bytes
    key_version: int = 1
    created_at: datetime = field(default_factory=_utcnow)
    rotated_at: datetime | None = None

    def with_rotated(
        self, *, encrypted_payload: bytes, key_version: int
    ) -> ModelCredential:
        return ModelCredential(
            id=self.id,
            tenant_id=self.tenant_id,
            provider=self.provider,
            label=self.label,
            encrypted_payload=encrypted_payload,
            key_version=key_version,
            created_at=self.created_at,
            rotated_at=_utcnow(),
        )


def make_credential(
    *,
    tenant_id: TenantId,
    provider: ModelProvider,
    label: str,
    encrypted_payload: bytes,
    key_version: int = 1,
    credential_id: CredentialId | None = None,
    now: datetime | None = None,
) -> ModelCredential:
    if not label or len(label) > 256:
        raise ValueError("credential label must be 1-256 chars")
    if not encrypted_payload:
        raise ValueError("encrypted_payload must be non-empty")
    return ModelCredential(
        id=credential_id or CredentialId(uuid4()),
        tenant_id=tenant_id,
        provider=provider,
        label=label,
        encrypted_payload=encrypted_payload,
        key_version=key_version,
        created_at=now or _utcnow(),
    )


# ── RoutingPolicy ─────────────────────────────────────────────────────────


@dataclass(slots=True, frozen=True)
class RoutingPolicy:
    """How a tenant picks a primary + failover chain at invoke time."""

    id: RoutingPolicyId
    tenant_id: TenantId
    strategy: RoutingStrategy
    primary_model_id: ModelId | None
    failover_model_ids: list[ModelId] = field(default_factory=list)
    selection_rules: dict[str, Any] = field(default_factory=dict)
    version_lock: int = 1
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)


def make_routing_policy(
    *,
    tenant_id: TenantId,
    strategy: RoutingStrategy,
    primary_model_id: ModelId | None = None,
    failover_model_ids: list[ModelId] | None = None,
    selection_rules: dict[str, Any] | None = None,
    policy_id: RoutingPolicyId | None = None,
    now: datetime | None = None,
) -> RoutingPolicy:
    if strategy == RoutingStrategy.PRIORITY and primary_model_id is None:
        raise ValueError("priority strategy requires primary_model_id")
    ts = now or _utcnow()
    return RoutingPolicy(
        id=policy_id or RoutingPolicyId(uuid4()),
        tenant_id=tenant_id,
        strategy=strategy,
        primary_model_id=primary_model_id,
        failover_model_ids=list(failover_model_ids or []),
        selection_rules=dict(selection_rules or {}),
        created_at=ts,
        updated_at=ts,
    )


# ── QuotaCounter ──────────────────────────────────────────────────────────


@dataclass(slots=True, frozen=True)
class QuotaCounter:
    """Per-tenant, per-model usage bucket.

    Identified by the composite ``(tenant_id, model_id, window_start)``.
    ``window_start`` is the start of the bucket (truncated to minute /
    hour / day depending on the ``QuotaWindow`` policy).

    Hot path is ``UPDATE ... SET input_tokens = input_tokens + :delta
    WHERE pk = :pk RETURNING *`` — single round-trip and atomic.
    """

    tenant_id: TenantId
    model_id: ModelId
    window_start: datetime
    input_tokens: int = 0
    output_tokens: int = 0
    requests: int = 0
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)

    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens


def bucket_start(now: datetime, window: str = "minute") -> datetime:
    """Truncate ``now`` to the start of the bucket.

    ``window`` is one of ``"minute"`` / ``"hour"`` / ``"day"`` — kept as
    a string here so callers don't need to import the enum; the enum is
    only used at the policy-check boundary.
    """
    if not now.tzinfo:
        now = now.replace(tzinfo=UTC)
    if window == "minute":
        return now.replace(second=0, microsecond=0)
    if window == "hour":
        return now.replace(minute=0, second=0, microsecond=0)
    if window == "day":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    raise ValueError(f"unknown window: {window!r}")


__all__ = [
    "Model",
    "ModelCredential",
    "QuotaCounter",
    "RoutingPolicy",
    "bucket_start",
    "make_credential",
    "make_model",
    "make_routing_policy",
]