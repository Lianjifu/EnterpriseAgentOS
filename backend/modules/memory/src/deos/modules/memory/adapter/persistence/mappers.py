"""Mappers between ``MemoryEntry`` domain entities and ORM rows."""

from __future__ import annotations

from typing import Any

from deos.modules.memory.adapter.persistence.models import MemoryEntryORM
from deos.modules.memory.domain.entities import MemoryEntry
from deos.modules.memory.domain.value_objects import MemoryScope


def memory_entry_orm_to_domain(o: MemoryEntryORM) -> MemoryEntry:
    # Embedding lives on ``MemoryEmbeddingORM`` (separate table joined via
    # ``memory_id``). The repository doesn't preload it; the use case loads
    # embeddings via ``PgMemoryVectorAdapter``. Return an empty tuple here.
    embedding: tuple[float, ...] = ()
    return MemoryEntry(
        id=o.id,  # type: ignore[arg-type]
        tenant_id=o.tenant_id,  # type: ignore[arg-type]
        workspace_id=o.workspace_id,
        owner_id=o.owner_id,
        scope=MemoryScope(o.scope),
        content=o.content,
        metadata=dict(o.metadata_),
        embedding=embedding,
        revoked=o.revoked,
        version_lock=o.version_lock,
        expires_at=o.expires_at,
        created_at=o.created_at,
        updated_at=o.updated_at,
    )


def memory_entry_domain_to_orm(e: MemoryEntry) -> MemoryEntryORM:
    """Build a NEW ORM row from a domain entry.

    Caller must ``session.add(...)`` it.  For updates use
    :func:`apply_domain_to_orm` instead.
    """
    payload: dict[str, Any] = {
        "id": e.id,
        "tenant_id": e.tenant_id,
        "workspace_id": e.workspace_id,
        "owner_id": e.owner_id,
        "scope": e.scope.value,
        "content": e.content,
        "metadata_": dict(e.metadata),
        "revoked": e.revoked,
        "version_lock": e.version_lock,
        "expires_at": e.expires_at,
        "created_at": e.created_at,
        "updated_at": e.updated_at,
    }
    return MemoryEntryORM(**payload)


def apply_domain_to_orm(o: MemoryEntryORM, e: MemoryEntry) -> None:
    """Copy mutable fields from domain entity onto an existing ORM instance."""
    o.content = e.content
    o.metadata_ = dict(e.metadata)
    o.revoked = e.revoked
    o.version_lock = e.version_lock
    o.expires_at = e.expires_at
    o.updated_at = e.updated_at


__all__ = [
    "apply_domain_to_orm",
    "memory_entry_domain_to_orm",
    "memory_entry_orm_to_domain",
]
