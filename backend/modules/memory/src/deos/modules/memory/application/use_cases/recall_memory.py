"""RecallMemoryUseCase.

Flow:
  1. Embed the query via :class:`EmbeddingPort`.
  2. Run vector search via :class:`VectorSearchPort` (tenant + workspace scoped).
  3. Fetch each hit's full :class:`MemoryEntry` and pair with its score.
  4. Drop revoked / expired entries (vector index may lag behind).
  5. Return ``list[MemoryHit]`` ordered by descending similarity.

The vector store is the source of truth for ordering; entries missing
from the repository (purged mid-flight) are silently skipped.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from eos_schema.ids import TenantId, WorkspaceId

from deos.modules.memory.application.memory_service_port import MemoryHit
from deos.modules.memory.application.ports import (
    EmbeddingPort,
    MemoryRepository,
    VectorSearchPort,
)
from deos.modules.memory.domain.value_objects import MemoryQuery, MemoryScope


def _utcnow() -> datetime:
    return datetime.now(UTC)


@dataclass(slots=True)
class RecallMemoryUseCase:
    repository: MemoryRepository
    vector_search: VectorSearchPort
    embedding: EmbeddingPort
    policy_guard: object | None = None

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        query: MemoryQuery | None = None,
        query_text: str | None = None,
        top_k: int = 10,
        scope_filter: MemoryScope | None = None,
    ) -> list[MemoryHit]:
        # accept either a MemoryQuery object or the raw shape — both end up here.
        if query is None:
            if not query_text or not query_text.strip():
                raise ValueError("query_text is required when query is not supplied")
            query = MemoryQuery(
                query=query_text, top_k=top_k, scope_filter=scope_filter
            )

        # P5: gate recall reads behind the policy engine. Default scope is
        # ``workspace`` when caller didn't pin one.
        effective_scope = query.scope_filter or MemoryScope.WORKSPACE
        if self.policy_guard is not None:
            from eos_vault.actor import ActorContext

            await self.policy_guard.check(  # type: ignore[attr-defined]
                actor=ActorContext(
                    tenant_id=tenant_id,
                    workspace_id=workspace_id,
                ),
                action=f"memory:read:{effective_scope.value}",
                resource={
                    "scope": effective_scope.value,
                    "workspace_id": str(workspace_id),
                },
            )

        [query_vector] = await self.embedding.embed([query.query])
        query_tuple = tuple(float(x) for x in query_vector)

        hits = await self.vector_search.search(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            query_embedding=query_tuple,
            top_k=query.top_k,
            scope_filter=query.scope_filter,
        )

        now = _utcnow()
        out: list[MemoryHit] = []
        for hit in hits:
            entry = await self.repository.get(
                tenant_id=tenant_id, memory_id=hit.memory_id
            )
            if entry is None:
                continue
            if entry.workspace_id != workspace_id:
                # defense-in-depth: vector store should already scope, but enforce
                continue
            if not entry.is_visible(now=now):
                continue
            out.append(MemoryHit(entry=entry, score=hit.score))
        return out


__all__ = ["RecallMemoryUseCase"]
