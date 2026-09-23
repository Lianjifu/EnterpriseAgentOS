"""SkillServiceAdapter — adapts `SkillService` to `SkillPort`.

Resolves the latest INSTALLED install for `(tenant, workspace, skill_name)`
and forwards to `SkillService.invoke_skill().execute(...)`.
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from deos.modules.skill.application.services import SkillService
from deos.modules.skill.domain.entities import SkillInvocation
from eos_schema.ids import TenantId, UserId, WorkspaceId

from deos.modules.agent_runtime.application.ports import SkillPort


@dataclass(slots=True)
class SkillServiceAdapter(SkillPort):
    svc: SkillService
    tenant_id: TenantId
    workspace_id: WorkspaceId
    owner_id: UserId

    async def invoke(
        self,
        *,
        call_id: UUID,
        skill_name: str,
        arguments: dict,
    ) -> dict:
        # Open a fresh UoW (cheap, in-process) and look up the skill by name.
        uow = self.svc.uow_factory()
        async with uow as u:
            pkg = await u.skills.get_by_name(
                tenant_id=self.tenant_id,
                workspace_id=self.workspace_id,
                name=skill_name,
            )
        if pkg is None:
            return {
                "ok": False,
                "error_code": "SKILL_NOT_FOUND",
                "error_message": f"skill {skill_name} not found",
                "call_id": str(call_id),
            }

        invocation: SkillInvocation = await self.svc.invoke_skill().execute(
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            invoked_by=self.owner_id,
            skill_id=pkg.id,
            arguments=arguments,
        )
        return {
            "ok": True,
            "invocation_id": str(invocation.id),
            "status": invocation.status.value,
            "call_id": str(call_id),
        }


__all__ = ["SkillServiceAdapter"]
