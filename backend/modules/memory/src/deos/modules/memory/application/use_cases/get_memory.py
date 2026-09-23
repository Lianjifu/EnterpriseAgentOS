"""GetMemoryUseCase.

Returns the entry by id, scoped to tenant + workspace.  Raises
:class:`MemoryNotFound` if the id does not exist in the tenant, and
:class:`MemoryExpired` if the entry has lapsed.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from eos_schema.ids import MemoryEntryId, TenantId, WorkspaceId

from deos.modules.memory.application.ports import MemoryRepository
from deos.modules.memory.domain.entities import MemoryEntry
from deos.modules.memory.domain.errors import MemoryExpired, MemoryNotFound


def _utcnow() -> datetime:
    return datetime.now(UTC)


@dataclass(slots=True)
class GetMemoryUseCase:
    repository: MemoryRepository

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        memory_id: MemoryEntryId,
    ) -> MemoryEntry:
        entry = await self.repository.get(tenant_id=tenant_id, memory_id=memory_id)
        if entry is None or entry.workspace_id != workspace_id:
            raise MemoryNotFound(
                f"memory {memory_id} not found", code="MEMORY_NOT_FOUND"
            )
        if entry.revoked:
            raise MemoryNotFound(f"memory {memory_id} revoked", code="MEMORY_NOT_FOUND")
        if entry.expires_at is not None and entry.expires_at <= _utcnow():
            raise MemoryExpired(f"memory {memory_id} expired", code="MEMORY_EXPIRED")
        return entry


__all__ = ["GetMemoryUseCase"]
