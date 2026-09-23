"""ListMemoriesUseCase.

Lists non-revoked, non-expired memories in a workspace, optionally
filtered by ``scope``.  Default page size 50 (caller may lower).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from eos_schema.ids import TenantId, WorkspaceId

from deos.modules.memory.application.ports import MemoryRepository
from deos.modules.memory.domain.entities import MemoryEntry
from deos.modules.memory.domain.value_objects import MemoryScope


def _utcnow() -> datetime:
    return datetime.now(UTC)


@dataclass(slots=True)
class ListMemoriesUseCase:
    repository: MemoryRepository

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        scope: MemoryScope | None = None,
        limit: int = 50,
    ) -> list[MemoryEntry]:
        if limit < 1 or limit > 200:
            raise ValueError("limit must be in 1..200")
        rows = await self.repository.list(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            scope=scope,
            limit=limit,
        )
        now = _utcnow()
        return [r for r in rows if r.is_visible(now=now)]


__all__ = ["ListMemoriesUseCase"]
