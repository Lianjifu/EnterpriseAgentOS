"""SearchKnowledgeUseCase — top-k RAG retrieval.

Flow:
  1. Embed the query text via :class:`EmbeddingPort`.
  2. Run vector search via :class:`VectorSearchPort`.
  3. Hydrate each hit's chunk (id, asset_id, package_id, content).
  4. Filter to chunks whose parent asset is in ``READY`` and whose
     package is ``ACTIVE`` (defense-in-depth).
  5. Return ordered hits capped at ``top_k``.

The use case does NOT raise ``NotFound``; an empty result list means
nothing matched.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from eos_schema.ids import TenantId, WorkspaceId

from deos.modules.knowledge.application.ports import (
    EmbeddingPort,
    KnowledgeRepository,
    VectorSearchPort,
)
from deos.modules.knowledge.domain.value_objects import (
    KnowledgeAssetKind,
    KnowledgeAssetStatus,
    KnowledgePackageStatus,
    RetrievalQuery,
)


@dataclass(slots=True)
class SearchKnowledgeUseCase:
    repository: KnowledgeRepository
    vector_search: VectorSearchPort
    embedding: EmbeddingPort
    policy_guard: object | None = None

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        query: RetrievalQuery,
    ) -> list[dict[str, Any]]:
        # P5 gate
        if self.policy_guard is not None:
            from eos_vault.actor import ActorContext

            await self.policy_guard.check(  # type: ignore[attr-defined]
                actor=ActorContext(
                    tenant_id=tenant_id,
                    workspace_id=workspace_id,
                ),
                action="knowledge:search",
                resource={"workspace_id": str(workspace_id)},
            )

        [query_vector] = await self.embedding.embed([query.query])
        hits = await self.vector_search.search(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            query_embedding=tuple(float(x) for x in query_vector),
            top_k=query.top_k,
            workspace_filter_required=True,
            package_ids=tuple(str(p) for p in query.package_ids),
            asset_kind_filter=query.asset_kind_filter,
        )

        out: list[dict[str, Any]] = []
        for hit in hits:
            chunk = await self.repository.find_chunk(
                tenant_id=tenant_id, chunk_id=hit.chunk_id
            )
            if chunk is None:
                continue
            asset = await self.repository.get_asset(
                tenant_id=tenant_id, asset_id=chunk.asset_id
            )
            if asset is None or asset.status != KnowledgeAssetStatus.READY:
                continue
            if (
                query.asset_kind_filter is not None
                and asset.kind != query.asset_kind_filter
            ):
                continue
            pkg = await self.repository.get_package(
                tenant_id=tenant_id, package_id=chunk.package_id
            )
            if pkg is None or pkg.status != KnowledgePackageStatus.ACTIVE:
                continue
            out.append(
                {
                    "id": str(chunk.id),
                    "asset_id": str(chunk.asset_id),
                    "package_id": str(chunk.package_id),
                    "package_name": pkg.name,
                    "asset_name": asset.name,
                    "content": chunk.content,
                    "score": float(hit.score),
                    "ordinal": chunk.ordinal,
                }
            )
            if len(out) >= query.top_k:
                break
        return out


__all__ = ["SearchKnowledgeUseCase"]


# Type-only re-export to avoid import cycles in tests
_ = KnowledgeAssetKind
