"""Skill domain entities.

Three frozen dataclasses:

- `SkillPackage` — registered tool/spec; `version_lock` is the optimistic
  lock for PATCH; `create()` validates ranges, `update()` returns a new
  instance with the lock bumped and `updated_at` advanced, `disable()`
  is `update(enabled=False)`.
- `SkillInstall` — one install row per (tenant, workspace, package, lock);
  `succeed(jti=...)` / `fail(reason=...)` transition the status and
  stamp `run_token_jti` so token revocation can pin the install.
- `SkillInvocation` — the lifecycle state machine:
  `queued → starting → running → {succeeded | failed | cancelled | timed_out}`.
  Each transition method calls `_assert_can(target)` which raises
  `SkillInvocationAlreadyTerminal` (409) when the source state is already
  terminal. The in-memory runner (`InvocationRunner`) is the only
  legitimate caller; HTTP layer only invokes `create()`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Self
from uuid import UUID, uuid4

from eos_schema.ids import (
    SkillId,
    SkillInstallId,
    SkillInvocationId,
    TenantId,
    UserId,
    WorkspaceId,
)

from deos.modules.skill.domain.errors import (
    InvalidSkillSpec,
    SkillInvocationAlreadyTerminal,
    SkillVersionMismatch,
)


def _utcnow() -> datetime:
    return datetime.now(UTC)


class NetworkPolicy(StrEnum):
    NONE = "none"
    DEFAULT = "default"
    UNRESTRICTED = "unrestricted"


class SkillInstallStatus(StrEnum):
    PENDING = "pending"
    INSTALLED = "installed"
    FAILED = "failed"


class SkillInvocationStatus(StrEnum):
    QUEUED = "queued"
    STARTING = "starting"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMED_OUT = "timed_out"


_TERMINAL_STATUSES = frozenset(
    {
        SkillInvocationStatus.SUCCEEDED,
        SkillInvocationStatus.FAILED,
        SkillInvocationStatus.CANCELLED,
        SkillInvocationStatus.TIMED_OUT,
    }
)


@dataclass(slots=True, frozen=True)
class SkillPackage:
    id: SkillId
    tenant_id: TenantId
    workspace_id: WorkspaceId
    name: str
    version: str
    description: str
    entrypoint: str
    image: str
    parameters_schema: dict = field(default_factory=dict)
    artifact_uri: str = ""
    network_policy: NetworkPolicy = NetworkPolicy.DEFAULT
    cpu_quota: float | None = None
    memory_bytes: int | None = None
    timeout_seconds: int = 30
    enabled: bool = True
    version_lock: int = 1
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)

    @classmethod
    def create(
        cls,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        name: str,
        version: str,
        description: str = "",
        entrypoint: str,
        image: str,
        parameters_schema: dict | None = None,
        artifact_uri: str = "",
        network_policy: NetworkPolicy = NetworkPolicy.DEFAULT,
        cpu_quota: float | None = None,
        memory_bytes: int | None = None,
        timeout_seconds: int = 30,
    ) -> Self:
        if not 1 <= len(name) <= 128:
            raise InvalidSkillSpec(
                f"name length {len(name)} not in [1,128]", code="INVALID_SKILL_SPEC"
            )
        if not 1 <= len(version) <= 32:
            raise InvalidSkillSpec(
                f"version length {len(version)} not in [1,32]",
                code="INVALID_SKILL_SPEC",
            )
        if not 1 <= len(entrypoint) <= 256:
            raise InvalidSkillSpec(
                f"entrypoint length {len(entrypoint)} not in [1,256]",
                code="INVALID_SKILL_SPEC",
            )
        if not 1 <= len(image) <= 256:
            raise InvalidSkillSpec(
                f"image length {len(image)} not in [1,256]",
                code="INVALID_SKILL_SPEC",
            )
        if not 1 <= timeout_seconds <= 30:
            raise InvalidSkillSpec(
                f"timeout_seconds {timeout_seconds} not in [1,30]",
                code="INVALID_SKILL_SPEC",
            )
        if cpu_quota is not None and cpu_quota <= 0:
            raise InvalidSkillSpec(
                f"cpu_quota {cpu_quota} must be > 0", code="INVALID_SKILL_SPEC"
            )
        if memory_bytes is not None and memory_bytes < 1024 * 1024:
            raise InvalidSkillSpec(
                f"memory_bytes {memory_bytes} must be >= 1MiB",
                code="INVALID_SKILL_SPEC",
            )
        now = _utcnow()
        return cls(
            id=SkillId(uuid4()),
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            name=name,
            version=version,
            description=description,
            entrypoint=entrypoint,
            image=image,
            parameters_schema=dict(parameters_schema or {}),
            artifact_uri=artifact_uri,
            network_policy=network_policy,
            cpu_quota=cpu_quota,
            memory_bytes=memory_bytes,
            timeout_seconds=timeout_seconds,
            enabled=True,
            version_lock=1,
            created_at=now,
            updated_at=now,
        )

    def update(
        self,
        *,
        expected_version_lock: int | None = None,
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
    ) -> Self:
        if (
            expected_version_lock is not None
            and expected_version_lock != self.version_lock
        ):
            raise SkillVersionMismatch(
                expected=expected_version_lock, actual=self.version_lock
            )
        new_timeout = (
            self.timeout_seconds if timeout_seconds is None else timeout_seconds
        )
        if not 1 <= new_timeout <= 30:
            raise InvalidSkillSpec(
                f"timeout_seconds {new_timeout} not in [1,30]",
                code="INVALID_SKILL_SPEC",
            )
        return type(self)(
            id=self.id,
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            name=self.name,
            version=self.version,
            description=self.description if description is None else description,
            entrypoint=self.entrypoint if entrypoint is None else entrypoint,
            image=self.image if image is None else image,
            parameters_schema=(
                dict(self.parameters_schema)
                if parameters_schema is None
                else dict(parameters_schema)
            ),
            artifact_uri=self.artifact_uri if artifact_uri is None else artifact_uri,
            network_policy=self.network_policy
            if network_policy is None
            else network_policy,
            cpu_quota=self.cpu_quota if cpu_quota is None else cpu_quota,
            memory_bytes=self.memory_bytes if memory_bytes is None else memory_bytes,
            timeout_seconds=new_timeout,
            enabled=self.enabled if enabled is None else enabled,
            version_lock=self.version_lock + 1,
            created_at=self.created_at,
            updated_at=_utcnow(),
        )

    def disable(self) -> Self:
        return self.update(enabled=False)


@dataclass(slots=True, frozen=True)
class SkillInstall:
    id: SkillInstallId
    tenant_id: TenantId
    workspace_id: WorkspaceId
    package_id: SkillId
    package_version_lock: int
    installed_by: UserId
    status: SkillInstallStatus
    installed_at: datetime
    last_used_at: datetime | None = None
    run_token_jti: str | None = None

    @classmethod
    def create(
        cls,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        package_id: SkillId,
        package_version_lock: int,
        installed_by: UserId,
    ) -> Self:
        return cls(
            id=SkillInstallId(uuid4()),
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            package_id=package_id,
            package_version_lock=package_version_lock,
            installed_by=installed_by,
            status=SkillInstallStatus.PENDING,
            installed_at=_utcnow(),
            last_used_at=None,
            run_token_jti=None,
        )

    def succeed(self, *, jti: str) -> Self:
        return type(self)(
            id=self.id,
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            package_id=self.package_id,
            package_version_lock=self.package_version_lock,
            installed_by=self.installed_by,
            status=SkillInstallStatus.INSTALLED,
            installed_at=self.installed_at,
            last_used_at=self.last_used_at,
            run_token_jti=jti,
        )

    def fail(self, *, reason: str) -> Self:
        return type(self)(
            id=self.id,
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            package_id=self.package_id,
            package_version_lock=self.package_version_lock,
            installed_by=self.installed_by,
            status=SkillInstallStatus.FAILED,
            installed_at=self.installed_at,
            last_used_at=self.last_used_at,
            run_token_jti=f"failed:{reason[:32]}",
        )

    def touch_used(self) -> Self:
        return type(self)(
            id=self.id,
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            package_id=self.package_id,
            package_version_lock=self.package_version_lock,
            installed_by=self.installed_by,
            status=self.status,
            installed_at=self.installed_at,
            last_used_at=_utcnow(),
            run_token_jti=self.run_token_jti,
        )


@dataclass(slots=True, frozen=True)
class SkillInvocation:
    id: SkillInvocationId
    tenant_id: TenantId
    workspace_id: WorkspaceId
    install_id: SkillInstallId
    package_id: SkillId
    arguments: dict = field(default_factory=dict)
    status: SkillInvocationStatus = SkillInvocationStatus.QUEUED
    started_at: datetime = field(default_factory=_utcnow)
    finished_at: datetime | None = None
    latency_ms: int | None = None
    result: dict | None = None
    error_code: str | None = None
    error_message: str | None = None
    stdout_tail: str = ""
    stderr_tail: str = ""
    artifact_uri: str | None = None
    sandbox_run_id: UUID | None = None

    @classmethod
    def create(
        cls,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        install_id: SkillInstallId,
        package_id: SkillId,
        arguments: dict | None = None,
    ) -> Self:
        return cls(
            id=SkillInvocationId(uuid4()),
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            install_id=install_id,
            package_id=package_id,
            arguments=dict(arguments or {}),
        )

    def _assert_can(self, target: SkillInvocationStatus) -> None:
        if self.status in _TERMINAL_STATUSES:
            raise SkillInvocationAlreadyTerminal(
                f"invocation {self.id} is terminal ({self.status}); "
                f"cannot transition to {target}",
                code="SKILL_INVOCATION_ALREADY_TERMINAL",
            )

    def with_tails(self, *, stdout_tail: str, stderr_tail: str) -> Self:
        return type(self)(
            id=self.id,
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            install_id=self.install_id,
            package_id=self.package_id,
            arguments=self.arguments,
            status=self.status,
            started_at=self.started_at,
            finished_at=self.finished_at,
            latency_ms=self.latency_ms,
            result=self.result,
            error_code=self.error_code,
            error_message=self.error_message,
            stdout_tail=stdout_tail,
            stderr_tail=stderr_tail,
            artifact_uri=self.artifact_uri,
            sandbox_run_id=self.sandbox_run_id,
        )

    def start(self, sandbox_run_id: UUID) -> Self:
        self._assert_can(SkillInvocationStatus.STARTING)
        if self.status != SkillInvocationStatus.QUEUED:
            raise SkillInvocationAlreadyTerminal(
                f"start requires QUEUED, got {self.status}",
                code="SKILL_INVOCATION_ALREADY_TERMINAL",
            )
        return type(self)(
            id=self.id,
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            install_id=self.install_id,
            package_id=self.package_id,
            arguments=self.arguments,
            status=SkillInvocationStatus.STARTING,
            started_at=self.started_at,
            finished_at=None,
            latency_ms=None,
            result=None,
            error_code=None,
            error_message=None,
            stdout_tail=self.stdout_tail,
            stderr_tail=self.stderr_tail,
            artifact_uri=None,
            sandbox_run_id=sandbox_run_id,
        )

    def mark_running(self) -> Self:
        self._assert_can(SkillInvocationStatus.RUNNING)
        if self.status not in (
            SkillInvocationStatus.QUEUED,
            SkillInvocationStatus.STARTING,
        ):
            raise SkillInvocationAlreadyTerminal(
                f"mark_running requires QUEUED|STARTING, got {self.status}",
                code="SKILL_INVOCATION_ALREADY_TERMINAL",
            )
        return type(self)(
            id=self.id,
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            install_id=self.install_id,
            package_id=self.package_id,
            arguments=self.arguments,
            status=SkillInvocationStatus.RUNNING,
            started_at=self.started_at,
            finished_at=None,
            latency_ms=None,
            result=None,
            error_code=None,
            error_message=None,
            stdout_tail=self.stdout_tail,
            stderr_tail=self.stderr_tail,
            artifact_uri=None,
            sandbox_run_id=self.sandbox_run_id,
        )

    def complete(
        self,
        *,
        result: dict,
        latency_ms: int,
        stdout_tail: str,
        stderr_tail: str,
        artifact_uri: str | None = None,
    ) -> Self:
        self._assert_can(SkillInvocationStatus.SUCCEEDED)
        return type(self)(
            id=self.id,
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            install_id=self.install_id,
            package_id=self.package_id,
            arguments=self.arguments,
            status=SkillInvocationStatus.SUCCEEDED,
            started_at=self.started_at,
            finished_at=_utcnow(),
            latency_ms=latency_ms,
            result=dict(result),
            error_code=None,
            error_message=None,
            stdout_tail=stdout_tail,
            stderr_tail=stderr_tail,
            artifact_uri=artifact_uri,
            sandbox_run_id=self.sandbox_run_id,
        )

    def fail(
        self,
        *,
        error_code: str,
        error_message: str,
        latency_ms: int | None = None,
        stdout_tail: str = "",
        stderr_tail: str = "",
    ) -> Self:
        self._assert_can(SkillInvocationStatus.FAILED)
        return type(self)(
            id=self.id,
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            install_id=self.install_id,
            package_id=self.package_id,
            arguments=self.arguments,
            status=SkillInvocationStatus.FAILED,
            started_at=self.started_at,
            finished_at=_utcnow(),
            latency_ms=latency_ms,
            result=None,
            error_code=error_code,
            error_message=error_message,
            stdout_tail=stdout_tail,
            stderr_tail=stderr_tail,
            artifact_uri=None,
            sandbox_run_id=self.sandbox_run_id,
        )

    def cancel(
        self,
        *,
        latency_ms: int | None = None,
        stdout_tail: str = "",
        stderr_tail: str = "",
    ) -> Self:
        self._assert_can(SkillInvocationStatus.CANCELLED)
        return type(self)(
            id=self.id,
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            install_id=self.install_id,
            package_id=self.package_id,
            arguments=self.arguments,
            status=SkillInvocationStatus.CANCELLED,
            started_at=self.started_at,
            finished_at=_utcnow(),
            latency_ms=latency_ms,
            result=None,
            error_code="SKILL_CANCELLED",
            error_message="invocation cancelled by user",
            stdout_tail=stdout_tail,
            stderr_tail=stderr_tail,
            artifact_uri=None,
            sandbox_run_id=self.sandbox_run_id,
        )

    def timeout(
        self,
        *,
        latency_ms: int | None = None,
        stdout_tail: str = "",
        stderr_tail: str = "",
    ) -> Self:
        if self.status not in (
            SkillInvocationStatus.QUEUED,
            SkillInvocationStatus.STARTING,
            SkillInvocationStatus.RUNNING,
        ):
            raise SkillInvocationAlreadyTerminal(
                f"timeout requires non-terminal, got {self.status}",
                code="SKILL_INVOCATION_ALREADY_TERMINAL",
            )
        return type(self)(
            id=self.id,
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            install_id=self.install_id,
            package_id=self.package_id,
            arguments=self.arguments,
            status=SkillInvocationStatus.TIMED_OUT,
            started_at=self.started_at,
            finished_at=_utcnow(),
            latency_ms=latency_ms,
            result=None,
            error_code="SANDBOX_TIMEOUT",
            error_message="sandbox exceeded timeout_seconds",
            stdout_tail=stdout_tail,
            stderr_tail=stderr_tail,
            artifact_uri=None,
            sandbox_run_id=self.sandbox_run_id,
        )


__all__ = [
    "NetworkPolicy",
    "SkillInstall",
    "SkillInstallStatus",
    "SkillInvocation",
    "SkillInvocationStatus",
    "SkillPackage",
    "timedelta",  # re-exported for callers that import from entities
]
