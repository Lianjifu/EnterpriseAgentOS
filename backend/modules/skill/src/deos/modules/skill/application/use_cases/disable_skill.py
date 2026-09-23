"""DisableSkillUseCase — soft-delete via `SkillPackage.disable()`."""

from __future__ import annotations

from dataclasses import dataclass

from eos_schema.ids import SkillId, TenantId, UserId, WorkspaceId

from deos.modules.skill.application.ports import (
    SkillEventPublisher,
    UnitOfWork,
)
from deos.modules.skill.domain.entities import SkillPackage
from deos.modules.skill.domain.errors import SkillNotFound
from deos.modules.skill.domain.events import SkillDisabled


@dataclass(slots=True)
class DisableSkillUseCase:
    uow_factory: type[UnitOfWork]
    publisher: SkillEventPublisher

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        skill_id: SkillId,
        disabled_by: UserId,
    ) -> SkillPackage:
        async with self.uow_factory() as uow:
            pkg = await uow.skills.get(tenant_id=tenant_id, skill_id=skill_id)
            if pkg is None or pkg.workspace_id != workspace_id:
                raise SkillNotFound(
                    f"skill {skill_id} not found", code="SKILL_NOT_FOUND"
                )
            disabled = pkg.disable()
            await uow.skills.update(disabled)
            await uow.commit()
            await self.publisher.publish(
                SkillDisabled(
                    skill_id=disabled.id,
                    tenant_id=disabled.tenant_id,
                    workspace_id=disabled.workspace_id,
                    disabled_by=disabled_by,
                )
            )
            return disabled
