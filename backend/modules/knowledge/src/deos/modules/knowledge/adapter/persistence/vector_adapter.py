"""PgVectorStore-backed implementation of :class:`VectorSearchPort`.

The knowledge module keeps a vector mirror table ``knowledge_chunks_vec``
managed by ``eos_vector.PgVectorStore`` so filtered search (workspace_id,
package_ids, asset_kind) rides the same payload-filter machinery used by
the memory module.  Scalar columns + HNSW index live on
``knowledge_chunks.embedding`` for SQL-side recall.

Both layers are kept in sync by the ingest use case.
"""

from __future__ import annotations

from uuid import UUID

from eos_schema.ids import (
    KnowledgeAssetId,
    KnowledgeChunkId,
    KnowledgePackageId,
    TenantId,
    WorkspaceId,
)
from eos_vector.pg_vector import PgVectorStore
from eos_vector.store import VectorItem
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from deos.modules.knowledge.application.ports import (
    VectorSearchHit,
    VectorSearchPort,
)
from deos.modules.knowledge.domain.value_objects import KnowledgeAssetKind


class PgKnowledgeVectorAdapter(VectorSearchPort):
    """Adapter bridging the knowledge port to ``PgVectorStore``.

    The ``delete_for_*`` methods issue raw SQL because PgVectorStore only
    exposes a ``delete(ids)`` API; for asset/package cascade we need to
    look up the matching chunk ids by payload.  SQL stays inside this
    adapter — the application layer never sees it.
    """

    def __init__(
        self,
        store: PgVectorStore,
        engine: AsyncEngine,
        *,
        table: str = "knowledge_chunks_vec",
    ) -> None:
        self._store = store
        self._engine = engine
        self._table = table

    # ── write paths ───────────────────────────────────────────────────────

    async def upsert(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        chunk_id: KnowledgeChunkId,
        embedding: tuple[float, ...],
        payload: dict[str, object] | None = None,
    ) -> None:
        item = VectorItem(
            id=UUID(str(chunk_id)),
            tenant_id=UUID(str(tenant_id)),
            workspace_id=UUID(str(workspace_id)),
            embedding=list(embedding),
            payload=dict(payload or {}),
        )
        await self._store.upsert([item])

    async def delete(self, *, tenant_id: TenantId, chunk_id: KnowledgeChunkId) -> None:
        await self._store.delete([UUID(str(chunk_id))])

    async def delete_for_asset(
        self, *, tenant_id: TenantId, asset_id: KnowledgeAssetId
    ) -> int:
        return await self._delete_by_payload(
            tenant_id=tenant_id, key="asset_id", value=str(asset_id)
        )

    async def delete_for_package(
        self, *, tenant_id: TenantId, package_id: KnowledgePackageId
    ) -> int:
        return await self._delete_by_payload(
            tenant_id=tenant_id, key="package_id", value=str(package_id)
        )

    async def _delete_by_payload(
        self, *, tenant_id: TenantId, key: str, value: str
    ) -> int:
        async with self._engine.begin() as conn:
            result = await conn.execute(
                text(
                    f"DELETE FROM {self._table} "
                    "WHERE tenant_id = :tid "
                    f"  AND payload ->> :key = :value"
                ),
                {"tid": str(tenant_id), "key": key, "value": value},
            )
            return int(result.rowcount or 0)

    # ── read paths ────────────────────────────────────────────────────────

    async def search(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        query_embedding: tuple[float, ...],
        top_k: int,
        workspace_filter_required: bool = True,
        package_ids: tuple[str, ...] = (),
        asset_kind_filter: KnowledgeAssetKind | None = None,
    ) -> list[VectorSearchHit]:
        payload: dict[str, object] = {}
        if workspace_filter_required:
            payload["workspace_id"] = str(workspace_id)
        if package_ids and len(package_ids) == 1:
            # PgVectorStore filter does exact match on a single value; we
            # only narrow by package_ids when exactly one is supplied —
            # for multiple IDs the caller should fall back to post-filter
            # via the SQL repository's chunk hydration.
            payload["package_id"] = package_ids[0]
        if asset_kind_filter is not None:
            payload["asset_kind"] = asset_kind_filter.value

        query_item = VectorItem(
            id=UUID(int=0),  # unused for search
            tenant_id=UUID(str(tenant_id)),
            workspace_id=UUID(str(workspace_id)),
            embedding=list(query_embedding),
            payload=payload,
        )
        results = await self._store.search(
            query_item, top_k=top_k, filter=payload or None
        )
        return [
            VectorSearchHit(chunk_id=KnowledgeChunkId(r.id), score=r.score)
            for r in results
        ]


__all__ = ["PgKnowledgeVectorAdapter"]
