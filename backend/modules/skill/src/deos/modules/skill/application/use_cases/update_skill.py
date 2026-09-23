"""UpdateSkillUseCase.

Optimistic-locked update via `SkillPackage.update(expected_version_lock)`.
Raises `SkillVersionMismatch` (412) on lock mismatch.
"""

from __future__ import annotations

from dataclasses import dataclass

from eos_schema.ids import SkillId, TenantId, UserId, WorkspaceId

from deos.modules.skill.application.ports import (
    SkillEventPublisher,
    UnitOfWork,
)
from deos.modules.skill.domain.entities import NetworkPolicy, SkillPackage
from deos.modules.skill.domain.errors import SkillNotFound
from deos.modules.skill.domain.events import SkillUpdated


@dataclass(slots=True)
class UpdateSkillUseCase:
    uow_factory: type[UnitOfWork]
    publisher: SkillEventPublisher

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        skill_id: SkillId,
        updated_by: UserId,
        expected_version_lock: int,
        description: str | None = None,
        entrypoint: str | None = None,
        image: str | None = None,
        parameters_schema: dict | None = None,
        artifact_uri: str | None = None,
        network_policy: NetworkPolicy | None = None,
        cpu_quota: float | None = None,
        memory_bytes: int | None = None,
        timeout_seconds: int | None = None,
        enabled: bool | None = None,
    ) -> SkillPackage:
        async with self.uow_factory() as uow:
            pkg = await uow.skills.get(tenant_id=tenant_id, skill_id=skill_id)
            if pkg is None:
                raise SkillNotFound(
                    f"skill {skill_id} not found",
                    code="SKILL_NOT_FOUND",
                )
            if pkg.workspace_id != workspace_id:
                raise SkillNotFound(
                    f"skill {skill_id} not in workspace {workspace_id}",
                    code="SKILL_NOT_FOUND",
                )
            updated = pkg.update(
                expected_version_lock=expected_version_lock,
                description=description,
                entrypoint=entrypoint,
                image=image,
                parameters_schema=parameters_schema,
                artifact_uri=artifact_uri,
                network_policy=network_policy,
                cpu_quota=cpu_quota,
                memory_bytes=memory_bytes,
                timeout_seconds=timeout_seconds,
                enabled=enabled,
            )
            await uow.skills.update(updated)
            await uow.commit()
            await self.publisher.publish(
                SkillUpdated(
                    skill_id=updated.id,
                    tenant_id=updated.tenant_id,
                    workspace_id=updated.workspace_id,
                    new_version_lock=updated.version_lock,
                    updated_by=updated_by,
                )
            )
            return updated
