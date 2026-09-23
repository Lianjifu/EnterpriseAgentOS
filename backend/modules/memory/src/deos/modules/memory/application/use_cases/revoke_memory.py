"""RevokeMemoryUseCase.

Soft-deletes a memory: flips ``revoked=True`` (immutable copy) and
removes the row from the vector index so it stops appearing in recall.
The SQL row remains for audit / undo.

The vector delete is best-effort — if it fails, recall may still
return the entry but ``GetMemoryUseCase`` filters revoked entries.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from eos_schema.ids import MemoryEntryId, TenantId, UserId, WorkspaceId

from deos.modules.memory.application.ports import (
    MemoryEventPublisher,
    MemoryRepository,
    VectorSearchPort,
)
from deos.modules.memory.domain.entities import MemoryEntry
from deos.modules.memory.domain.errors import MemoryNotFound
from deos.modules.memory.domain.events import MemoryRevoked

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class RevokeMemoryUseCase:
    repository: MemoryRepository
    vector_search: VectorSearchPort
    publisher: MemoryEventPublisher | None = None
    policy_guard: object | None = None

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        memory_id: MemoryEntryId,
        actor_id: UserId,
    ) -> MemoryEntry:
        # P5: gate revokes behind the policy engine
        if self.policy_guard is not None:
            from eos_vault.actor import ActorContext

            await self.policy_guard.check(  # type: ignore[attr-defined]
                actor=ActorContext(
                    tenant_id=tenant_id,
                    workspace_id=workspace_id,
                    principal_id=actor_id,
                ),
                action="memory:revoke",
                resource={
                    "memory_id": str(memory_id),
                    "workspace_id": str(workspace_id),
                },
            )

        entry = await self.repository.get(tenant_id=tenant_id, memory_id=memory_id)
        if entry is None or entry.workspace_id != workspace_id:
            raise MemoryNotFound(
                f"memory {memory_id} not found", code="MEMORY_NOT_FOUND"
            )

        revoked = entry.revoke()  # raises MemoryAlreadyRevoked if already revoked
        saved = await self.repository.update(revoked)

        try:
            await self.vector_search.delete(
                tenant_id=saved.tenant_id, memory_id=saved.id
            )
        except Exception:
            logger.exception("vector delete failed for revoked memory %s", saved.id)

        if self.publisher is not None:
            try:
                await self.publisher.publish(
                    MemoryRevoked(
                        memory_id=saved.id,
                        tenant_id=saved.tenant_id,
                        workspace_id=saved.workspace_id,
                        revoked_by=actor_id,
                    )
                )
            except Exception:
                logger.exception("publish MemoryRevoked failed for %s", saved.id)

        return saved


__all__ = ["RevokeMemoryUseCase"]
