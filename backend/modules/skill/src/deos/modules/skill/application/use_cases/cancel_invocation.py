"""CancelInvocationUseCase.

Idempotent: missing invocation → 404, missing task/run_id in the runner
→ no-op success. Truth lives in the DB row (status=CANCELLED).
"""

from __future__ import annotations

from dataclasses import dataclass

from eos_schema.ids import SkillInvocationId, TenantId, WorkspaceId

from deos.modules.skill.application.invocation_runner import InvocationRunner
from deos.modules.skill.application.ports import UnitOfWork
from deos.modules.skill.domain.entities import SkillInvocation
from deos.modules.skill.domain.errors import (
    SkillCancelled,
    SkillInvocationNotFound,
)


@dataclass(slots=True)
class CancelInvocationUseCase:
    uow_factory: type[UnitOfWork]
    runner: InvocationRunner

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        invocation_id: SkillInvocationId,
    ) -> SkillInvocation:
        async with self.uow_factory() as uow:
            invocation = await uow.invocations.get(
                tenant_id=tenant_id, invocation_id=invocation_id
            )
            if invocation is None or invocation.workspace_id != workspace_id:
                raise SkillInvocationNotFound(
                    f"invocation {invocation_id} not found",
                    code="SKILL_INVOCATION_NOT_FOUND",
                )

            await self.runner.cancel(invocation_id)

            terminal_now = await uow.invocations.get(
                tenant_id=tenant_id, invocation_id=invocation_id
            )
            if terminal_now is None:
                raise SkillInvocationNotFound(
                    f"invocation {invocation_id} vanished",
                    code="SKILL_INVOCATION_NOT_FOUND",
                )
            if terminal_now.status.value == "cancelled":
                raise SkillCancelled()
            return terminal_now
