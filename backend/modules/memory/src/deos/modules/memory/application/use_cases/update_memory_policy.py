"""UpdateMemoryPolicyUseCase — upsert the per-workspace policy."""

from __future__ import annotations

from dataclasses import dataclass

from eos_schema.ids import WorkspaceId

from deos.modules.memory.application.ports import MemoryPolicyRepository
from deos.modules.memory.domain.entities import MemoryPolicy


@dataclass(slots=True)
class UpdateMemoryPolicyUseCase:
    repository: MemoryPolicyRepository

    async def execute(
        self,
        *,
        workspace_id: WorkspaceId,
        **fields: object,
    ) -> MemoryPolicy:
        stored = await self.repository.get(workspace_id=workspace_id)
        base = stored if stored is not None else MemoryPolicy.default(
            workspace_id=workspace_id
        )
        merged = base.update(**fields)
        return await self.repository.update(merged)