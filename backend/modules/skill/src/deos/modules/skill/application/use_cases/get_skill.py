"""GetSkillUseCase."""

from __future__ import annotations

from dataclasses import dataclass

from eos_schema.ids import SkillId, TenantId, WorkspaceId

from deos.modules.skill.application.ports import UnitOfWork
from deos.modules.skill.domain.entities import SkillPackage
from deos.modules.skill.domain.errors import SkillNotFound


@dataclass(slots=True)
class GetSkillUseCase:
    uow_factory: type[UnitOfWork]

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        skill_id: SkillId,
    ) -> SkillPackage:
        async with self.uow_factory() as uow:
            pkg = await uow.skills.get(tenant_id=tenant_id, skill_id=skill_id)
            if pkg is None or pkg.workspace_id != workspace_id:
                raise SkillNotFound(
                    f"skill {skill_id} not found", code="SKILL_NOT_FOUND"
                )
            return pkg
