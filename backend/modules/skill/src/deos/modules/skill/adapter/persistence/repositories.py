"""SQLAlchemy repository implementations of the skill application ports.

PK-only lookups verify `tenant_id` against the value bound via
`bind_tenant_to_session` (defense in depth on top of the auto-filter
installed by `eos_persistence.tenant_guard.install_tenant_loader`).
"""

from __future__ import annotations

from collections.abc import Sequence
from uuid import UUID

from eos_persistence.tenant_guard import current_tenant_id
from eos_schema.ids import (
    SkillId,
    SkillInstallId,
    SkillInvocationId,
    TenantId,
    WorkspaceId,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deos.modules.skill.adapter.persistence.mappers import (
    skill_install_domain_to_orm,
    skill_install_orm_to_domain,
    skill_invocation_domain_to_orm,
    skill_invocation_orm_to_domain,
    skill_package_domain_to_orm,
    skill_package_orm_to_domain,
)
from deos.modules.skill.adapter.persistence.models import (
    SkillInstallORM,
    SkillInvocationORM,
    SkillPackageORM,
)
from deos.modules.skill.application.ports import (
    SkillInstallRepository,
    SkillInvocationRepository,
    SkillRepository,
)
from deos.modules.skill.domain.entities import (
    SkillInstall,
    SkillInstallStatus,
    SkillInvocation,
    SkillInvocationStatus,
    SkillPackage,
)


def _cross_tenant(o: object) -> bool:
    bound = current_tenant_id()
    if bound is None:
        return False
    return getattr(o, "tenant_id", None) != bound


class SqlSkillRepository(SkillRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def add(self, package: SkillPackage) -> None:
        self._s.add(skill_package_domain_to_orm(package))

    async def update(self, package: SkillPackage) -> None:
        o = await self._s.get(SkillPackageORM, package.id)
        if o is None or _cross_tenant(o):
            return
        o.name = package.name
        o.version = package.version
        o.description = package.description
        o.entrypoint = package.entrypoint
        o.image = package.image
        o.parameters_schema = dict(package.parameters_schema)
        o.artifact_uri = package.artifact_uri
        o.network_policy = package.network_policy.value
        o.cpu_quota = package.cpu_quota
        o.memory_bytes = package.memory_bytes
        o.timeout_seconds = package.timeout_seconds
        o.enabled = package.enabled
        o.version_lock = package.version_lock
        o.updated_at = package.updated_at

    async def get(
        self, *, tenant_id: TenantId, skill_id: SkillId
    ) -> SkillPackage | None:
        o = await self._s.get(SkillPackageORM, skill_id)
        if o is None or _cross_tenant(o):
            return None
        if o.tenant_id != tenant_id:
            return None
        return skill_package_orm_to_domain(o)

    async def get_by_name(
        self, *, tenant_id: TenantId, workspace_id: WorkspaceId, name: str
    ) -> SkillPackage | None:
        q = select(SkillPackageORM).where(
            SkillPackageORM.name == name,
            SkillPackageORM.workspace_id == workspace_id,
        )
        rows = (await self._s.execute(q)).scalars().all()
        for o in rows:
            if o.tenant_id == tenant_id:
                return skill_package_orm_to_domain(o)
        return None

    async def list(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        limit: int = 50,
        offset: int = 0,
        enabled_only: bool = False,
    ) -> Sequence[SkillPackage]:
        q = (
            select(SkillPackageORM)
            .where(SkillPackageORM.workspace_id == workspace_id)
            .order_by(SkillPackageORM.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if enabled_only:
            q = q.where(SkillPackageORM.enabled.is_(True))
        rows = (await self._s.execute(q)).scalars().all()
        return [
            skill_package_orm_to_domain(o) for o in rows if o.tenant_id == tenant_id
        ]


class SqlSkillInstallRepository(SkillInstallRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def add(self, install: SkillInstall) -> None:
        self._s.add(skill_install_domain_to_orm(install))

    async def update(self, install: SkillInstall) -> None:
        o = await self._s.get(SkillInstallORM, install.id)
        if o is None or _cross_tenant(o):
            return
        o.status = install.status.value
        o.last_used_at = install.last_used_at
        o.run_token_jti = install.run_token_jti

    async def get(
        self, *, tenant_id: TenantId, install_id: SkillInstallId
    ) -> SkillInstall | None:
        o = await self._s.get(SkillInstallORM, install_id)
        if o is None or _cross_tenant(o):
            return None
        if o.tenant_id != tenant_id:
            return None
        return skill_install_orm_to_domain(o)

    async def get_active(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        skill_id: SkillId,
    ) -> SkillInstall | None:
        q = (
            select(SkillInstallORM)
            .where(
                SkillInstallORM.workspace_id == workspace_id,
                SkillInstallORM.package_id == skill_id,
                SkillInstallORM.status == SkillInstallStatus.INSTALLED.value,
            )
            .order_by(SkillInstallORM.installed_at.desc())
            .limit(1)
        )
        rows = (await self._s.execute(q)).scalars().all()
        for o in rows:
            if o.tenant_id == tenant_id:
                return skill_install_orm_to_domain(o)
        return None


class SqlSkillInvocationRepository(SkillInvocationRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def add(self, invocation: SkillInvocation) -> None:
        self._s.add(skill_invocation_domain_to_orm(invocation))

    async def update(self, invocation: SkillInvocation) -> SkillInvocation:
        o = await self._s.get(SkillInvocationORM, invocation.id)
        if o is None or _cross_tenant(o):
            return invocation
        o.status = invocation.status.value
        o.started_at = invocation.started_at
        o.finished_at = invocation.finished_at
        o.latency_ms = invocation.latency_ms
        o.result = dict(invocation.result) if invocation.result is not None else None
        o.error_code = invocation.error_code
        o.error_message = invocation.error_message
        o.stdout_tail = invocation.stdout_tail
        o.stderr_tail = invocation.stderr_tail
        o.artifact_uri = invocation.artifact_uri
        o.sandbox_run_id = invocation.sandbox_run_id
        return invocation

    async def get(
        self, *, tenant_id: TenantId, invocation_id: SkillInvocationId
    ) -> SkillInvocation | None:
        o = await self._s.get(SkillInvocationORM, invocation_id)
        if o is None or _cross_tenant(o):
            return None
        if o.tenant_id != tenant_id:
            return None
        return skill_invocation_orm_to_domain(o)

    async def get_by_id(
        self, *, invocation_id: SkillInvocationId
    ) -> SkillInvocation | None:
        o = await self._s.get(SkillInvocationORM, invocation_id)
        if o is None or _cross_tenant(o):
            return None
        return skill_invocation_orm_to_domain(o)

    async def list(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        skill_id: SkillId | None = None,
        status: SkillInvocationStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[SkillInvocation]:
        q = (
            select(SkillInvocationORM)
            .where(SkillInvocationORM.workspace_id == workspace_id)
            .order_by(SkillInvocationORM.started_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if skill_id is not None:
            q = q.where(SkillInvocationORM.package_id == skill_id)
        if status is not None:
            q = q.where(SkillInvocationORM.status == status.value)
        rows = (await self._s.execute(q)).scalars().all()
        return [
            skill_invocation_orm_to_domain(o) for o in rows if o.tenant_id == tenant_id
        ]


__all__ = [
    "SqlSkillInstallRepository",
    "SqlSkillInvocationRepository",
    "SqlSkillRepository",
]


# Keep `UUID` references honest for type-checkers.
_ = UUID
