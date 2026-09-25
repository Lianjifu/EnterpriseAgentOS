"""GetMemoryPolicyUseCase — read or default-init the per-workspace policy."""

from __future__ import annotations

from dataclasses import dataclass

from eos_schema.ids import WorkspaceId

from deos.modules.memory.application.ports import MemoryPolicyRepository
from deos.modules.memory.domain.entities import MemoryPolicy


@dataclass(slots=True)
class GetMemoryPolicyUseCase:
    repository: MemoryPolicyRepository

    async def execute(self, *, workspace_id: WorkspaceId) -> MemoryPolicy:
        stored = await self.repository.get(workspace_id=workspace_id)
        if stored is not None:
            return stored
        return MemoryPolicy.default(workspace_id=workspace_id)