"""ListInvocationsUseCase."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from eos_schema.ids import SkillId, TenantId, WorkspaceId

from deos.modules.skill.application.ports import UnitOfWork
from deos.modules.skill.domain.entities import (
    SkillInvocation,
    SkillInvocationStatus,
)


@dataclass(slots=True)
class ListInvocationsUseCase:
    uow_factory: type[UnitOfWork]

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        skill_id: SkillId | None = None,
        status: SkillInvocationStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[SkillInvocation]:
        async with self.uow_factory() as uow:
            return await uow.invocations.list(
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                skill_id=skill_id,
                status=status,
                limit=limit,
                offset=offset,
            )
