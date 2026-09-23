"""domain ↔ DTO mappers for the skill module HTTP layer."""

from __future__ import annotations

from deos.modules.skill.adapter.http.dto import (
    InstallSkillResponse,
    SkillInvocationResponse,
    SkillResponse,
)
from deos.modules.skill.domain.entities import (
    NetworkPolicy,
    SkillInstall,
    SkillInstallStatus,
    SkillInvocation,
    SkillPackage,
)


def skill_to_dto(p: SkillPackage) -> SkillResponse:
    return SkillResponse(
        id=str(p.id),
        tenant_id=str(p.tenant_id),
        workspace_id=str(p.workspace_id),
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
        created_at=p.created_at.isoformat(),
        updated_at=p.updated_at.isoformat(),
    )


def skill_invocation_to_dto(i: SkillInvocation) -> SkillInvocationResponse:
    return SkillInvocationResponse(
        id=str(i.id),
        skill_id=str(i.package_id),
        install_id=str(i.install_id),
        tenant_id=str(i.tenant_id),
        workspace_id=str(i.workspace_id),
        arguments=dict(i.arguments),
        status=i.status.value,
        started_at=i.started_at.isoformat(),
        finished_at=i.finished_at.isoformat() if i.finished_at else None,
        latency_ms=i.latency_ms,
        result=dict(i.result) if i.result is not None else None,
        error_code=i.error_code,
        error_message=i.error_message,
        stdout_tail=i.stdout_tail,
        stderr_tail=i.stderr_tail,
        artifact_uri=i.artifact_uri,
    )


def install_to_response(
    install: SkillInstall, *, run_token: str, expires_at_ms: int, jti: str
) -> InstallSkillResponse:
    return InstallSkillResponse(
        install_id=str(install.id),
        skill_id=str(install.package_id),
        run_token=run_token,
        expires_at_ms=expires_at_ms,
        jti=jti,
        status=install.status.value
        if install.status in (SkillInstallStatus.INSTALLED, SkillInstallStatus.FAILED)
        else SkillInstallStatus.INSTALLED.value,
    )


__all__ = [
    "NetworkPolicy",
    "install_to_response",
    "skill_invocation_to_dto",
    "skill_to_dto",
]
