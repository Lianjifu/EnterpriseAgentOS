"""ORM ↔ domain mappers for the skill module.

Domain uses `NetworkPolicy` StrEnum + frozen dataclasses; ORM uses raw
strings. Mappers own the conversion.
"""

from __future__ import annotations

from eos_schema.ids import (
    SkillId,
    SkillInstallId,
    SkillInvocationId,
    UserId,
)

from deos.modules.skill.adapter.persistence.models import (
    SkillInstallORM,
    SkillInvocationORM,
    SkillPackageORM,
)
from deos.modules.skill.domain.entities import (
    NetworkPolicy,
    SkillInstall,
    SkillInstallStatus,
    SkillInvocation,
    SkillInvocationStatus,
    SkillPackage,
)


def skill_package_orm_to_domain(o: SkillPackageORM) -> SkillPackage:
    return SkillPackage(
        id=SkillId(o.id),
        tenant_id=o.tenant_id,
        workspace_id=o.workspace_id,
        name=o.name,
        version=o.version,
        description=o.description,
        entrypoint=o.entrypoint,
        image=o.image,
        parameters_schema=dict(o.parameters_schema or {}),
        artifact_uri=o.artifact_uri,
        network_policy=NetworkPolicy(o.network_policy),
        cpu_quota=o.cpu_quota,
        memory_bytes=o.memory_bytes,
        timeout_seconds=o.timeout_seconds,
        enabled=o.enabled,
        version_lock=o.version_lock,
        signature=o.signature,
        signer_key_id=o.signer_key_id,
        image_digest=o.image_digest,
        created_at=o.created_at,
        updated_at=o.updated_at,
    )


def skill_package_domain_to_orm(p: SkillPackage) -> SkillPackageORM:
    return SkillPackageORM(
        id=p.id,
        tenant_id=p.tenant_id,
        workspace_id=p.workspace_id,
        name=p.name,
        version=p.version,
        description=p.description,
        entrypoint=p.entrypoint,
        image=p.image,
        parameters_schema=dict(p.parameters_schema),
        artifact_uri=p.artifact_uri,
        network_policy=p.network_policy.value,
        cpu_quota=p.cpu_quota,
        memory_bytes=p.memory_bytes,
        timeout_seconds=p.timeout_seconds,
        enabled=p.enabled,
        version_lock=p.version_lock,
        signature=p.signature,
        signer_key_id=p.signer_key_id,
        image_digest=p.image_digest,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


def skill_install_orm_to_domain(o: SkillInstallORM) -> SkillInstall:
    return SkillInstall(
        id=SkillInstallId(o.id),
        tenant_id=o.tenant_id,
        workspace_id=o.workspace_id,
        package_id=SkillId(o.package_id),
        package_version_lock=o.package_version_lock,
        installed_by=UserId(o.installed_by),
        status=SkillInstallStatus(o.status),
        installed_at=o.installed_at,
        last_used_at=o.last_used_at,
        run_token_jti=o.run_token_jti,
    )


def skill_install_domain_to_orm(i: SkillInstall) -> SkillInstallORM:
    return SkillInstallORM(
        id=i.id,
        tenant_id=i.tenant_id,
        workspace_id=i.workspace_id,
        package_id=i.package_id,
        package_version_lock=i.package_version_lock,
        installed_by=i.installed_by,
        status=i.status.value,
        installed_at=i.installed_at,
        last_used_at=i.last_used_at,
        run_token_jti=i.run_token_jti,
    )


def skill_invocation_orm_to_domain(o: SkillInvocationORM) -> SkillInvocation:
    return SkillInvocation(
        id=SkillInvocationId(o.id),
        tenant_id=o.tenant_id,
        workspace_id=o.workspace_id,
        install_id=SkillInstallId(o.install_id),
        package_id=SkillId(o.package_id),
        arguments=dict(o.arguments or {}),
        status=SkillInvocationStatus(o.status),
        started_at=o.started_at,
        finished_at=o.finished_at,
        latency_ms=o.latency_ms,
        result=dict(o.result) if o.result is not None else None,
        error_code=o.error_code,
        error_message=o.error_message,
        stdout_tail=o.stdout_tail or "",
        stderr_tail=o.stderr_tail or "",
        artifact_uri=o.artifact_uri,
        sandbox_run_id=o.sandbox_run_id,
    )


def skill_invocation_domain_to_orm(i: SkillInvocation) -> SkillInvocationORM:
    return SkillInvocationORM(
        id=i.id,
        tenant_id=i.tenant_id,
        workspace_id=i.workspace_id,
        install_id=i.install_id,
        package_id=i.package_id,
        arguments=dict(i.arguments),
        status=i.status.value,
        started_at=i.started_at,
        finished_at=i.finished_at,
        latency_ms=i.latency_ms,
        result=dict(i.result) if i.result is not None else None,
        error_code=i.error_code,
        error_message=i.error_message,
        stdout_tail=i.stdout_tail,
        stderr_tail=i.stderr_tail,
        artifact_uri=i.artifact_uri,
        sandbox_run_id=i.sandbox_run_id,
    )


__all__ = [
    "skill_install_domain_to_orm",
    "skill_install_orm_to_domain",
    "skill_invocation_domain_to_orm",
    "skill_invocation_orm_to_domain",
    "skill_package_domain_to_orm",
    "skill_package_orm_to_domain",
]
