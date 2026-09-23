"""Ports — protocols the application layer depends on.

The Ports & Adapters split keeps domain & use cases free of FastAPI /
SQLAlchemy / pgvector.  Each port is satisfied by an adapter in
``adapter/``; tests provide in-memory fakes.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol, runtime_checkable

from eos_schema.ids import MemoryEntryId, TenantId, WorkspaceId

from deos.modules.memory.domain.entities import MemoryEntry
from deos.modules.memory.domain.value_objects import MemoryScope

__all__ = [
    "EmbeddingPort",
    "MemoryEventPublisher",
    "MemoryRepository",
    "VectorSearchHit",
    "VectorSearchPort",
]


@runtime_checkable
class EmbeddingPort(Protocol):
    """Converts text → embedding vector.

    Implementations are remote (HTTP to embedding_runtime) or local
    (sentence-transformers).  The contract returns ONE vector per input
    in input order.  Empty input yields an empty list.
    """

    async def embed(self, texts: list[str]) -> list[list[float]]: ...


@runtime_checkable
class MemoryRepository(Protocol):
    """SQL / in-memory persistence port for :class:`MemoryEntry`.

    All methods are tenant-scoped; cross-tenant reads MUST be impossible
    from this port alone (the SQL repo joins ``tenant_id`` into every
    WHERE clause and the ORM ``TenantScopedMixin`` blocks the rest).
    """

    async def add(self, entry: MemoryEntry) -> MemoryEntry: ...

    async def get(
        self, *, tenant_id: TenantId, memory_id: MemoryEntryId
    ) -> MemoryEntry | None: ...

    async def list(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        scope: MemoryScope | None = None,
        limit: int = 50,
    ) -> list[MemoryEntry]: ...

    async def update(self, entry: MemoryEntry) -> MemoryEntry: ...

    async def revoke(
        self, *, tenant_id: TenantId, memory_id: MemoryEntryId
    ) -> MemoryEntry: ...

    async def purge_expired(self, *, tenant_id: TenantId, now: datetime) -> int: ...


@dataclass(slots=True, frozen=True)
class VectorSearchHit:
    """One row returned by :class:`VectorSearchPort.search`."""

    memory_id: MemoryEntryId
    score: float  # higher = closer (1 - cosine distance)


@runtime_checkable
class VectorSearchPort(Protocol):
    """Narrow facade over ``eos_vector.VectorStore``.

    Keeps the use case free of ``VectorItem`` / ``SearchResult`` so we
    can change the index implementation later (HNSW → IVFFlat →
    Milvus) without touching the application layer.
    """

    async def upsert(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        memory_id: MemoryEntryId,
        embedding: tuple[float, ...],
    ) -> None: ...

    async def delete(
        self, *, tenant_id: TenantId, memory_id: MemoryEntryId
    ) -> None: ...

    async def search(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        query_embedding: tuple[float, ...],
        top_k: int,
        scope_filter: MemoryScope | None = None,
    ) -> list[VectorSearchHit]: ...


@runtime_checkable
class MemoryEventPublisher(Protocol):
    """Publishes domain events onto the in-process bus."""

    async def publish(self, event: object) -> None: ...
