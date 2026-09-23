"""GetInvocationUseCase."""

from __future__ import annotations

from dataclasses import dataclass

from eos_schema.ids import SkillInvocationId, TenantId, WorkspaceId

from deos.modules.skill.application.ports import UnitOfWork
from deos.modules.skill.domain.entities import SkillInvocation
from deos.modules.skill.domain.errors import SkillInvocationNotFound


@dataclass(slots=True)
class GetInvocationUseCase:
    uow_factory: type[UnitOfWork]

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        invocation_id: SkillInvocationId,
    ) -> SkillInvocation:
        async with self.uow_factory() as uow:
            inv = await uow.invocations.get(
                tenant_id=tenant_id, invocation_id=invocation_id
            )
            if inv is None or inv.workspace_id != workspace_id:
                raise SkillInvocationNotFound(
                    f"invocation {invocation_id} not found",
                    code="SKILL_INVOCATION_NOT_FOUND",
                )
            return inv
