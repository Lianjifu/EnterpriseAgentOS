"""InstallSkillUseCase — issue RunToken + persist SkillInstall row.

Re-verifies the package signature + image digest before issuing the
run-token. This catches drift between the registration-time vet and
the live pack (e.g. the trust store rotated a key in between, or the
image was re-pulled from the registry with a different digest).

The install status is INSTALLED on success. Failure paths:
  - SkillDisabled → 409
  - SkillNotFound → 404
  - SkillSignatureInvalid / SkillSignerUntrusted → 422
  - SkillImageDigestMismatch → 422
  - SkillInstallFailed → 422 (sandbox could not start / verify)
"""

from __future__ import annotations

from dataclasses import dataclass

from eos_schema.ids import SkillId, TenantId, UserId, WorkspaceId

from deos.modules.skill.application.ports import (
    RunTokenIssuer,
    SkillEventPublisher,
    UnitOfWork,
)
from deos.modules.skill.application.vetter import SkillVetter
from deos.modules.skill.domain.entities import (
    SkillInstall,
    SkillInstallStatus,
)
from deos.modules.skill.domain.errors import (
    SkillDisabled,
    SkillInstallFailed,
    SkillNotFound,
)
from deos.modules.skill.domain.events import (
    SkillInstalled,
)
from deos.modules.skill.domain.events import (
    SkillInstallFailed as SkillInstallFailedEvent,
)


@dataclass(slots=True)
class InstallResult:
    install: SkillInstall
    run_token: str
    expires_at_ms: int
    jti: str


@dataclass(slots=True)
class InstallSkillUseCase:
    uow_factory: type[UnitOfWork]
    publisher: SkillEventPublisher
    run_token_issuer: RunTokenIssuer
    vetter: SkillVetter | None = None
    run_token_ttl_seconds: int = 300

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        skill_id: SkillId,
        installed_by: UserId,
    ) -> InstallResult:
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

            # Install-time re-vet. Registration already vetted the
            # pack, but the trust store may have rotated since then,
            # or the registry may now serve a different image digest
            # than the one the publisher signed. Treat any failure
            # here as a 422 install error — we never issue a run-token
            # to a pack that no longer passes the gate.
            if self.vetter is not None:
                await self.vetter.vet(pkg)

            raw_token, jti, expires_ms = self.run_token_issuer.issue(
                skill_id=pkg.id,
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                ttl_seconds=self.run_token_ttl_seconds,
            )

            install = SkillInstall.create(
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                package_id=pkg.id,
                package_version_lock=pkg.version_lock,
                installed_by=installed_by,
            ).succeed(jti=jti)

            try:
                await uow.installs.add(install)
            except Exception as exc:  # pragma: no cover - DB specific
                await self.publisher.publish(
                    SkillInstallFailedEvent(
                        skill_id=pkg.id,
                        install_id=install.id,
                        tenant_id=tenant_id,
                        workspace_id=workspace_id,
                        installed_by=installed_by,
                        reason=str(exc),
                    )
                )
                raise SkillInstallFailed(
                    f"install row write failed: {exc}",
                    code="SKILL_INSTALL_FAILED",
                ) from exc

            await uow.commit()
            await self.publisher.publish(
                SkillInstalled(
                    skill_id=pkg.id,
                    install_id=install.id,
                    tenant_id=tenant_id,
                    workspace_id=workspace_id,
                    package_version_lock=pkg.version_lock,
                    installed_by=installed_by,
                    run_token_jti=jti,
                    status=SkillInstallStatus.INSTALLED,
                )
            )

        return InstallResult(
            install=install,
            run_token=raw_token,
            expires_at_ms=expires_ms,
            jti=jti,
        )
