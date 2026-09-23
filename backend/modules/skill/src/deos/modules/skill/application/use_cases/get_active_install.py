"""GetActiveInstallUseCase — resolve latest INSTALLED install for a skill.

Used by `SkillServiceAdapter` so the LLM's tool-call layer can refer to
a skill by name without knowing the install_id.
"""

from __future__ import annotations

from dataclasses import dataclass

from eos_schema.ids import SkillId, TenantId, WorkspaceId

from deos.modules.skill.application.ports import UnitOfWork
from deos.modules.skill.domain.entities import SkillInstall
from deos.modules.skill.domain.errors import SkillInstallFailed


@dataclass(slots=True)
class GetActiveInstallUseCase:
    uow_factory: type[UnitOfWork]

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        skill_id: SkillId,
    ) -> SkillInstall:
        async with self.uow_factory() as uow:
            install = await uow.installs.get_active(
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                skill_id=skill_id,
            )
            if install is None:
                raise SkillInstallFailed(
                    "no active install",
                    code="SKILL_INSTALL_FAILED",
                )
            return install
