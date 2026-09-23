"""Domain events emitted by the memory module.

All events descend from :class:`eos_kernel.events.DomainEvent` and carry
the tenant + workspace they belong to so the messaging layer can route
them through the bus without an extra lookup.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import UUID, uuid4

from eos_kernel.events import DomainEvent
from eos_schema.ids import MemoryEntryId, TenantId, UserId, WorkspaceId


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _memory_event_id() -> UUID:
    return uuid4()


@dataclass(slots=True, frozen=True)
class MemoryWritten(DomainEvent):
    """Emitted after a new memory entry is persisted."""

    memory_id: MemoryEntryId
    tenant_id: TenantId
    workspace_id: WorkspaceId
    owner_id: UserId
    scope: str
    event_id: UUID = field(default_factory=_memory_event_id)
    occurred_at: datetime = field(default_factory=_utcnow)
    event_name: str = "memory.written"


@dataclass(slots=True, frozen=True)
class MemoryRevoked(DomainEvent):
    """Emitted when an existing entry is soft-deleted (revoked=True)."""

    memory_id: MemoryEntryId
    tenant_id: TenantId
    workspace_id: WorkspaceId
    revoked_by: UserId
    event_id: UUID = field(default_factory=_memory_event_id)
    occurred_at: datetime = field(default_factory=_utcnow)
    event_name: str = "memory.revoked"


@dataclass(slots=True, frozen=True)
class MemoryExpiredPurged(DomainEvent):
    """Emitted after a batch of expired entries is hard-deleted."""

    tenant_id: TenantId
    workspace_id: WorkspaceId | None
    purged_count: int
    event_id: UUID = field(default_factory=_memory_event_id)
    occurred_at: datetime = field(default_factory=_utcnow)
    event_name: str = "memory.expired_purged"


__all__ = ["MemoryExpiredPurged", "MemoryRevoked", "MemoryWritten"]
