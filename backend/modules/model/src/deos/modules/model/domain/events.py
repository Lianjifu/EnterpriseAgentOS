"""Model module — domain events published to the EventBus.

Each event carries the actor + a structured payload so downstream
subscribers (audit log, observability, governance) can ingest it
without needing to query the model domain for context.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from eos_schema.ids import CredentialId, ModelId, TenantId, UserId


def _utcnow() -> datetime:
    return datetime.now(UTC)


@dataclass(slots=True, frozen=True)
class ModelRegistered:
    tenant_id: TenantId
    actor_id: UserId | None
    model_id: ModelId
    provider: str
    upstream_model: str
    occurred_at: datetime = field(default_factory=_utcnow)

    TOPIC = "model.registered"

    def to_payload(self) -> dict[str, Any]:
        return {
            "tenant_id": str(self.tenant_id),
            "actor_id": str(self.actor_id) if self.actor_id else None,
            "model_id": str(self.model_id),
            "provider": self.provider,
            "upstream_model": self.upstream_model,
            "occurred_at": self.occurred_at.isoformat(),
        }


@dataclass(slots=True, frozen=True)
class ModelInvoked:
    tenant_id: TenantId
    actor_id: UserId | None
    model_id: ModelId
    provider: str
    input_tokens: int
    output_tokens: int
    latency_ms: int
    status: str  # "ok" | "error"
    error_code: str | None
    occurred_at: datetime = field(default_factory=_utcnow)

    TOPIC = "model.invoked"

    def to_payload(self) -> dict[str, Any]:
        return {
            "tenant_id": str(self.tenant_id),
            "actor_id": str(self.actor_id) if self.actor_id else None,
            "model_id": str(self.model_id),
            "provider": self.provider,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "latency_ms": self.latency_ms,
            "status": self.status,
            "error_code": self.error_code,
            "occurred_at": self.occurred_at.isoformat(),
        }


@dataclass(slots=True, frozen=True)
class ModelQuotaExceeded:
    tenant_id: TenantId
    actor_id: UserId | None
    model_id: ModelId
    window_start: datetime
    used_tokens: int
    cap_tokens: int
    occurred_at: datetime = field(default_factory=_utcnow)

    TOPIC = "model.quota_exceeded"

    def to_payload(self) -> dict[str, Any]:
        return {
            "tenant_id": str(self.tenant_id),
            "actor_id": str(self.actor_id) if self.actor_id else None,
            "model_id": str(self.model_id),
            "window_start": self.window_start.isoformat(),
            "used_tokens": self.used_tokens,
            "cap_tokens": self.cap_tokens,
            "occurred_at": self.occurred_at.isoformat(),
        }


@dataclass(slots=True, frozen=True)
class ModelCredentialRotated:
    tenant_id: TenantId
    actor_id: UserId | None
    credential_id: CredentialId
    provider: str
    key_version: int
    occurred_at: datetime = field(default_factory=_utcnow)

    TOPIC = "model.credential_rotated"

    def to_payload(self) -> dict[str, Any]:
        return {
            "tenant_id": str(self.tenant_id),
            "actor_id": str(self.actor_id) if self.actor_id else None,
            "credential_id": str(self.credential_id),
            "provider": self.provider,
            "key_version": self.key_version,
            "occurred_at": self.occurred_at.isoformat(),
        }


__all__ = [
    "ModelCredentialRotated",
    "ModelInvoked",
    "ModelQuotaExceeded",
    "ModelRegistered",
]
