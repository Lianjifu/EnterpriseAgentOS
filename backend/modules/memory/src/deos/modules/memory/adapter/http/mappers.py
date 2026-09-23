"""DTO ↔ domain mappers for the memory HTTP layer."""

from __future__ import annotations

from deos.modules.memory.adapter.http.dto import (
    MemoryEntryResponse,
    MemoryHitResponse,
)
from deos.modules.memory.application.memory_service_port import MemoryHit
from deos.modules.memory.domain.entities import EMBEDDING_DIM, MemoryEntry
from deos.modules.memory.domain.value_objects import MemoryScope


def _scope(scope: MemoryScope) -> str:
    return scope.value


def memory_entry_to_dto(entry: MemoryEntry) -> MemoryEntryResponse:
    return MemoryEntryResponse(
        id=str(entry.id),
        tenant_id=str(entry.tenant_id),
        workspace_id=str(entry.workspace_id),
        owner_id=str(entry.owner_id),
        scope=_scope(entry.scope),  # type: ignore[arg-type]
        content=entry.content,
        metadata={k: str(v) for k, v in (entry.metadata or {}).items()},
        revoked=entry.revoked,
        version_lock=entry.version_lock,
        embedding_dim=len(entry.embedding) if entry.embedding else EMBEDDING_DIM,
        created_at=entry.created_at.isoformat(),
        updated_at=entry.updated_at.isoformat(),
        expires_at=entry.expires_at.isoformat() if entry.expires_at else None,
    )


def memory_hit_to_dto(hit: MemoryHit) -> MemoryHitResponse:
    return MemoryHitResponse(
        id=str(hit.entry.id),
        content=hit.entry.content,
        scope=_scope(hit.entry.scope),  # type: ignore[arg-type]
        score=hit.score,
        created_at=hit.entry.created_at.isoformat(),
        expires_at=hit.entry.expires_at.isoformat() if hit.entry.expires_at else None,
    )


__all__ = ["memory_entry_to_dto", "memory_hit_to_dto"]