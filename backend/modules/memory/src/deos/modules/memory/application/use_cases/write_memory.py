"""WriteMemoryUseCase.

Flow:
  1. Embed the content via :class:`EmbeddingPort`.
  2. Construct :class:`MemoryEntry` (domain validates content / scope / dim).
  3. Persist via :class:`MemoryRepository`.
  4. Index the vector via :class:`VectorSearchPort`.
  5. Publish ``MemoryWritten`` on the event bus.

If the vector index step fails the SQL row still exists — the entry is
visible via ``GET /v1/memories/{id}`` but won't surface in recall until
the index is backfilled.  Event publish is best-effort (logged but not
re-raised).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from eos_schema.ids import TenantId, UserId, WorkspaceId

from deos.modules.memory.application.ports import (
    EmbeddingPort,
    MemoryEventPublisher,
    MemoryRepository,
    VectorSearchPort,
)
from deos.modules.memory.domain.entities import MemoryEntry
from deos.modules.memory.domain.events import MemoryWritten
from deos.modules.memory.domain.value_objects import MemoryScope

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class WriteMemoryUseCase:
    repository: MemoryRepository
    vector_search: VectorSearchPort
    embedding: EmbeddingPort
    publisher: MemoryEventPublisher | None = None
    policy_guard: object | None = None

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        owner_id: UserId,
        scope: MemoryScope,
        content: str,
        metadata: dict[str, Any] | None = None,
        expires_at: datetime | None = None,
    ) -> MemoryEntry:
        # P5: gate memory writes behind the policy engine
        if self.policy_guard is not None:
            from eos_vault.actor import ActorContext

            await self.policy_guard.check(  # type: ignore[attr-defined]
                actor=ActorContext(
                    tenant_id=tenant_id,
                    workspace_id=workspace_id,
                    principal_id=owner_id,
                ),
                action=f"memory:write:{scope.value}",
                resource={"scope": scope.value, "workspace_id": str(workspace_id)},
            )

        # 1. embed (validate text + produce 1536-dim vector)
        [vector] = await self.embedding.embed([content])

        # 2. build entry (domain raises InvalidMemorySpec on bad input)
        entry = MemoryEntry.create(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            owner_id=owner_id,
            scope=scope,
            content=content,
            embedding=vector,
            metadata=metadata,
            expires_at=expires_at,
        )

        # 3. persist
        saved = await self.repository.add(entry)

        # 4. index — failure does not roll back persistence (visible via get/list)
        try:
            await self.vector_search.upsert(
                tenant_id=saved.tenant_id,
                workspace_id=saved.workspace_id,
                memory_id=saved.id,
                embedding=saved.embedding,
                scope=saved.scope,
            )
        except Exception:
            logger.exception(
                "vector index upsert failed for memory %s — row exists, recall may miss",
                saved.id,
            )

        # 5. event (best-effort)
        if self.publisher is not None:
            try:
                await self.publisher.publish(
                    MemoryWritten(
                        memory_id=saved.id,
                        tenant_id=saved.tenant_id,
                        workspace_id=saved.workspace_id,
                        owner_id=saved.owner_id,
                        scope=saved.scope.value,
                    )
                )
            except Exception:
                logger.exception("publish MemoryWritten failed for %s", saved.id)

        return saved
