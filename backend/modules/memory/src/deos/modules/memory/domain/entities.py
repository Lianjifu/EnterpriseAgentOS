"""Memory domain entities.

``MemoryEntry`` is the aggregate root for a stored memory.  It is
frozen; mutating operations return a new instance (revoke).  The
embedding lives alongside the entry so reads return a single
self-contained value object.

Note on ``id``: callers passing through a repository ``add()`` flow do
not need to mint an id — the DB default of ``uuid_generate_v4()`` (or
whatever the migration sets) provides it.  The in-memory repo fills
this in; the SQL repo lets the column default fire.
"""

from __future__ import annotations

import dataclasses
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from eos_schema.ids import MemoryEntryId, TenantId, UserId, WorkspaceId

from deos.modules.memory.domain.errors import InvalidMemorySpec, MemoryAlreadyRevoked
from deos.modules.memory.domain.value_objects import MemoryScope

EMBEDDING_DIM = 1536


def _utcnow() -> datetime:
    return datetime.now(UTC)


@dataclass(slots=True, frozen=True)
class MemoryEntry:
    """A single memory entry — content + embedding + soft-delete + expiry."""

    id: MemoryEntryId
    tenant_id: TenantId
    workspace_id: WorkspaceId
    owner_id: UserId
    scope: MemoryScope
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)
    embedding: tuple[float, ...] = ()
    revoked: bool = False
    version_lock: int = 1
    expires_at: datetime | None = None
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)

    @classmethod
    def create(
        cls,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        owner_id: UserId,
        scope: MemoryScope,
        content: str,
        embedding: list[float] | tuple[float, ...],
        metadata: dict[str, Any] | None = None,
        expires_at: datetime | None = None,
        id: MemoryEntryId | None = None,
        now: datetime | None = None,
    ) -> MemoryEntry:
        if not content or not content.strip():
            raise InvalidMemorySpec("content must be non-empty")
        if not isinstance(scope, MemoryScope):
            raise InvalidMemorySpec(
                f"scope must be MemoryScope, got {type(scope).__name__}"
            )
        if len(embedding) != EMBEDDING_DIM:
            raise InvalidMemorySpec(
                f"embedding must have {EMBEDDING_DIM} dims, got {len(embedding)}"
            )
        ts = now or _utcnow()
        entry_id: MemoryEntryId = id if id is not None else MemoryEntryId(uuid4())
        return cls(
            id=entry_id,
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            owner_id=owner_id,
            scope=scope,
            content=content,
            metadata=dict(metadata or {}),
            embedding=tuple(float(x) for x in embedding),
            revoked=False,
            version_lock=1,
            expires_at=expires_at,
            created_at=ts,
            updated_at=ts,
        )

    def revoke(self, *, now: datetime | None = None) -> MemoryEntry:
        if self.revoked:
            raise MemoryAlreadyRevoked(
                f"memory {self.id} is already revoked",
                code="MEMORY_ALREADY_REVOKED",
            )
        ts = now or _utcnow()
        return MemoryEntry(
            id=self.id,
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            owner_id=self.owner_id,
            scope=self.scope,
            content=self.content,
            metadata=dict(self.metadata),
            embedding=self.embedding,
            revoked=True,
            version_lock=self.version_lock + 1,
            expires_at=self.expires_at,
            created_at=self.created_at,
            updated_at=ts,
        )

    def is_visible(self, *, now: datetime | None = None) -> bool:
        if self.revoked:
            return False
        if self.expires_at is None:
            return True
        return self.expires_at > (now or _utcnow())


@dataclass(slots=True, frozen=True)
class MemoryPolicy:
    """Per-workspace memory governance settings.

    Mirrors the frontend's `MemoryPolicy` (12 fields). Stored one-per-
    workspace; ``default()`` provides the sensible starting point that
    GET returns when no row exists yet. PATCH builds a new instance via
    ``update(**fields)`` so the entity stays frozen.
    """

    workspace_id: WorkspaceId
    short_term_ttl_hours: int = 24
    working_memory_ttl_days: int = 7
    daily_refinement_time: str = "02:00"
    short_to_working_enabled: bool = True
    working_to_long_enabled: bool = True
    long_to_knowledge_enabled: bool = True
    minimum_confidence: float = 0.6
    long_term_write_approval: bool = True
    sensitive_data_masking: bool = True
    long_term_capacity: int = 50000
    used_capacity: int = 0

    @classmethod
    def default(cls, *, workspace_id: WorkspaceId) -> MemoryPolicy:
        return cls(workspace_id=workspace_id)

    def update(self, **fields: object) -> MemoryPolicy:
        unknown = set(fields) - set(self.__dataclass_fields__)
        if unknown:
            raise ValueError(f"unknown policy fields: {sorted(unknown)}")
        return dataclasses.replace(self, **fields)  # type: ignore[arg-type]


__all__ = ["EMBEDDING_DIM", "MemoryEntry", "MemoryPolicy"]
