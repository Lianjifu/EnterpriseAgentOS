"""InvokeSkillUseCase.

Validates the active install exists, persists a queued `SkillInvocation`
row, then kicks off `InvocationRunner.start(...)`. Returns the queued
invocation; the HTTP layer can call `runner.wait(...)` for the sync
(`?wait=true`) variant.
"""

from __future__ import annotations

from dataclasses import dataclass

from eos_schema.ids import SkillId, TenantId, UserId, WorkspaceId

from deos.modules.skill.application.invocation_runner import InvocationRunner
from deos.modules.skill.application.ports import (
    SkillEventPublisher,
    UnitOfWork,
)
from deos.modules.skill.domain.entities import SkillInvocation
from deos.modules.skill.domain.errors import (
    SkillDisabled,
    SkillInstallFailed,
    SkillNotFound,
)
from deos.modules.skill.domain.events import SkillInvocationQueued


@dataclass(slots=True)
class InvokeSkillUseCase:
    uow_factory: type[UnitOfWork]
    publisher: SkillEventPublisher
    runner: InvocationRunner
    policy_guard: object | None = None

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        invoked_by: UserId,
        skill_id: SkillId,
        arguments: dict,
    ) -> SkillInvocation:
        # P5: gate sensitive skill invocations behind the policy engine
        if self.policy_guard is not None:
            from eos_vault.actor import ActorContext

            await self.policy_guard.check(  # type: ignore[attr-defined]
                actor=ActorContext(
                    tenant_id=tenant_id,
                    workspace_id=workspace_id,
                    principal_id=invoked_by,
                ),
                action=f"skill:invoke:{skill_id}",
                resource={
                    "skill_id": str(skill_id),
                    "workspace_id": str(workspace_id),
                },
            )

        async with self.uow_factory() as uow:
            pkg = await uow.skills.get(tenant_id=tenant_id, skill_id=skill_id)
            if pkg is None or pkg.workspace_id != workspace_id:
                raise SkillNotFound(
                    f"skill {skill_id} not found", code="SKILL_NOT_FOUND"
                )
            if not pkg.enabled:
                raise SkillDisabled(
                    f"skill {skill_id} is disabled", code="SKILL_DISABLED"
                )
            install = await uow.installs.get_active(
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                skill_id=pkg.id,
            )
            if install is None:
                raise SkillInstallFailed(
                    "no active install — call /install first",
                    code="SKILL_INSTALL_FAILED",
                )

            invocation = SkillInvocation.create(
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                install_id=install.id,
                package_id=pkg.id,
                arguments=arguments,
            )
            await uow.invocations.add(invocation)
            await uow.commit()

        await self.publisher.publish(
            SkillInvocationQueued(
                skill_id=pkg.id,
                install_id=install.id,
                invocation_id=invocation.id,
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                invoked_by=invoked_by,
                arguments=arguments,
            )
        )
        await self.runner.start(invocation=invocation, package=pkg, install=install)
        return invocation
