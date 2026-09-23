"""PgVectorStore-backed implementation of :class:`VectorSearchPort`.

The repository and the vector index are kept in separate tables:
  - ``memory_entries`` holds scalar columns
  - ``memory_embeddings`` holds the 1536-dim vector + HNSW index

This adapter is the only place that talks to ``eos_vector.PgVectorStore``.
The application layer sees a narrow protocol (``VectorSearchPort``)
shaped like the use case needs.
"""

from __future__ import annotations

from uuid import UUID

from eos_schema.ids import MemoryEntryId, TenantId, WorkspaceId
from eos_vector.pg_vector import PgVectorStore
from eos_vector.store import VectorItem

from deos.modules.memory.application.ports import VectorSearchHit, VectorSearchPort
from deos.modules.memory.domain.value_objects import MemoryScope


class PgMemoryVectorAdapter(VectorSearchPort):
    def __init__(self, store: PgVectorStore) -> None:
        self._store = store

    async def upsert(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        memory_id: MemoryEntryId,
        embedding: tuple[float, ...],
        scope: MemoryScope | None = None,
    ) -> None:
        item = VectorItem(
            id=UUID(str(memory_id)),
            tenant_id=UUID(str(tenant_id)),
            workspace_id=UUID(str(workspace_id)),
            embedding=list(embedding),
            payload={
                "workspace_id": str(workspace_id),
                **({"scope": scope.value} if scope is not None else {}),
            },
        )
        await self._store.upsert([item])

    async def delete(self, *, tenant_id: TenantId, memory_id: MemoryEntryId) -> None:
        await self._store.delete([UUID(str(memory_id))])

    async def search(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        query_embedding: tuple[float, ...],
        top_k: int,
        scope_filter: MemoryScope | None = None,
    ) -> list[VectorSearchHit]:
        # PgVectorStore.search takes a payload filter via dict; we add
        # workspace_id as a payload field by upserting it.
        query_item = VectorItem(
            id=UUID(int=0),  # unused for search
            tenant_id=UUID(str(tenant_id)),
            workspace_id=UUID(str(workspace_id)),
            embedding=list(query_embedding),
            payload={
                "workspace_id": str(workspace_id),
                **({"scope": scope_filter.value} if scope_filter is not None else {}),
            },
        )
        results = await self._store.search(
            query_item, top_k=top_k, filter=query_item.payload
        )
        return [
            VectorSearchHit(memory_id=MemoryEntryId(r.id), score=r.score)
            for r in results
        ]


__all__ = ["PgMemoryVectorAdapter"]
