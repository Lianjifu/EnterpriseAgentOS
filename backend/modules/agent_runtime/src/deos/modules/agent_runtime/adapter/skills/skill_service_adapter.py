"""SkillServiceAdapter — adapts `SkillService` to `SkillPort`.

Resolves a published catalog skill by name and records a catalog call.
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from deos.modules.skill.application.services import SkillService
from deos.modules.skill.domain.errors import SkillDisabled, SkillNotFound
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
        _ = arguments
        try:
            result = await self.svc.bump_and_describe(
                workspace_id=self.workspace_id, name=skill_name
            )
        except SkillNotFound:
            return {
                "ok": False,
                "error_code": "SKILL_NOT_FOUND",
                "error_message": f"skill {skill_name} not found",
                "call_id": str(call_id),
            }
        except SkillDisabled:
            return {
                "ok": False,
                "error_code": "SKILL_DISABLED",
                "error_message": f"skill {skill_name} is not published",
                "call_id": str(call_id),
            }
        return {**result, "call_id": str(call_id)}


__all__ = ["SkillServiceAdapter"]
