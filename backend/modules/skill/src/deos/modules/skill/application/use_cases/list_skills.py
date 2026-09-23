"""ListSkillsUseCase."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from eos_schema.ids import TenantId, WorkspaceId

from deos.modules.skill.application.ports import UnitOfWork
from deos.modules.skill.domain.entities import SkillPackage


@dataclass(slots=True)
class ListSkillsUseCase:
    uow_factory: type[UnitOfWork]

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        limit: int = 50,
        offset: int = 0,
        enabled_only: bool = False,
    ) -> Sequence[SkillPackage]:
        async with self.uow_factory() as uow:
            return await uow.skills.list(
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                limit=limit,
                offset=offset,
                enabled_only=enabled_only,
            )
