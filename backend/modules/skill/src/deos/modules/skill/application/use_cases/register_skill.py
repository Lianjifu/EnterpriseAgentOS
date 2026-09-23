"""RegisterSkillUseCase.

Creates a new SkillPackage row. Raises `SkillAlreadyExists` if a row with
the same `(tenant_id, workspace_id, name, version)` already exists.
"""

from __future__ import annotations

from dataclasses import dataclass

from eos_schema.ids import TenantId, UserId, WorkspaceId

from deos.modules.skill.application.ports import (
    SkillEventPublisher,
    UnitOfWork,
)
from deos.modules.skill.domain.entities import (
    NetworkPolicy,
    SkillPackage,
)
from deos.modules.skill.domain.errors import SkillAlreadyExists
from deos.modules.skill.domain.events import SkillRegistered


@dataclass(slots=True)
class RegisterSkillUseCase:
    uow_factory: type[UnitOfWork]
    publisher: SkillEventPublisher

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        registered_by: UserId,
        name: str,
        version: str,
        description: str,
        entrypoint: str,
        image: str,
        parameters_schema: dict,
        artifact_uri: str = "",
        network_policy: NetworkPolicy = NetworkPolicy.DEFAULT,
        cpu_quota: float | None = None,
        memory_bytes: int | None = None,
        timeout_seconds: int = 30,
    ) -> SkillPackage:
        async with self.uow_factory() as uow:
            existing = await uow.skills.get_by_name(
                tenant_id=tenant_id, workspace_id=workspace_id, name=name
            )
            if existing is not None and existing.version == version:
                raise SkillAlreadyExists(
                    f"skill {name}@{version} already registered",
                    code="SKILL_ALREADY_EXISTS",
                )
            package = SkillPackage.create(
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                name=name,
                version=version,
                description=description,
                entrypoint=entrypoint,
                image=image,
                parameters_schema=parameters_schema,
                artifact_uri=artifact_uri,
                network_policy=network_policy,
                cpu_quota=cpu_quota,
                memory_bytes=memory_bytes,
                timeout_seconds=timeout_seconds,
            )
            await uow.skills.add(package)
            await uow.commit()
            await self.publisher.publish(
                SkillRegistered(
                    skill_id=package.id,
                    tenant_id=package.tenant_id,
                    workspace_id=package.workspace_id,
                    name=package.name,
                    version=package.version,
                    registered_by=registered_by,
                    image=package.image,
                    entrypoint=package.entrypoint,
                    network_policy=package.network_policy,
                    timeout_seconds=package.timeout_seconds,
                )
            )
            return package
