"""Skill domain events.

Past-tense `DomainEvent` dataclasses. Each carries the full set of
context the downstream subscriber needs to act without re-reading the
aggregate (no shared object identity across the event boundary).

`EventEnvelope.wrap(event, trace_id=current_trace_id())` is applied at
publish time in `adapter/events/__init__.py`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import UUID, uuid4

from eos_kernel.events import DomainEvent
from eos_schema.ids import (
    SkillId,
    SkillInstallId,
    SkillInvocationId,
    TenantId,
    UserId,
    WorkspaceId,
)

from deos.modules.skill.domain.entities import (
    NetworkPolicy,
    SkillInstallStatus,
    SkillInvocationStatus,
)


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _skill_id() -> SkillId:
    return SkillId(uuid4())


def _install_id() -> SkillInstallId:
    return SkillInstallId(uuid4())


def _invocation_id() -> SkillInvocationId:
    return SkillInvocationId(uuid4())


def _tenant_id() -> TenantId:
    return TenantId(uuid4())


def _workspace_id() -> WorkspaceId:
    return WorkspaceId(uuid4())


def _user_id() -> UserId:
    return UserId(uuid4())


@dataclass(slots=True, frozen=True)
class SkillRegistered(DomainEvent):
    skill_id: SkillId = field(default_factory=_skill_id)
    tenant_id: TenantId = field(default_factory=_tenant_id)
    workspace_id: WorkspaceId = field(default_factory=_workspace_id)
    name: str = ""
    version: str = ""
    registered_by: UserId = field(default_factory=_user_id)
    image: str = ""
    entrypoint: str = ""
    network_policy: NetworkPolicy = NetworkPolicy.DEFAULT
    timeout_seconds: int = 30


@dataclass(slots=True, frozen=True)
class SkillUpdated(DomainEvent):
    skill_id: SkillId = field(default_factory=_skill_id)
    tenant_id: TenantId = field(default_factory=_tenant_id)
    workspace_id: WorkspaceId = field(default_factory=_workspace_id)
    new_version_lock: int = 0
    updated_by: UserId = field(default_factory=_user_id)


@dataclass(slots=True, frozen=True)
class SkillDisabled(DomainEvent):
    skill_id: SkillId = field(default_factory=_skill_id)
    tenant_id: TenantId = field(default_factory=_tenant_id)
    workspace_id: WorkspaceId = field(default_factory=_workspace_id)
    disabled_by: UserId = field(default_factory=_user_id)


@dataclass(slots=True, frozen=True)
class SkillInstalled(DomainEvent):
    skill_id: SkillId = field(default_factory=_skill_id)
    install_id: SkillInstallId = field(default_factory=_install_id)
    tenant_id: TenantId = field(default_factory=_tenant_id)
    workspace_id: WorkspaceId = field(default_factory=_workspace_id)
    package_version_lock: int = 0
    installed_by: UserId = field(default_factory=_user_id)
    run_token_jti: str = ""
    status: SkillInstallStatus = SkillInstallStatus.INSTALLED


@dataclass(slots=True, frozen=True)
class SkillInstallFailed(DomainEvent):
    skill_id: SkillId = field(default_factory=_skill_id)
    install_id: SkillInstallId = field(default_factory=_install_id)
    tenant_id: TenantId = field(default_factory=_tenant_id)
    workspace_id: WorkspaceId = field(default_factory=_workspace_id)
    installed_by: UserId = field(default_factory=_user_id)
    reason: str = ""


@dataclass(slots=True, frozen=True)
class SkillInvocationQueued(DomainEvent):
    skill_id: SkillId = field(default_factory=_skill_id)
    install_id: SkillInstallId = field(default_factory=_install_id)
    invocation_id: SkillInvocationId = field(default_factory=_invocation_id)
    tenant_id: TenantId = field(default_factory=_tenant_id)
    workspace_id: WorkspaceId = field(default_factory=_workspace_id)
    invoked_by: UserId = field(default_factory=_user_id)
    arguments: dict = field(default_factory=dict)


@dataclass(slots=True, frozen=True)
class SkillInvocationStarted(DomainEvent):
    skill_id: SkillId = field(default_factory=_skill_id)
    install_id: SkillInstallId = field(default_factory=_install_id)
    invocation_id: SkillInvocationId = field(default_factory=_invocation_id)
    tenant_id: TenantId = field(default_factory=_tenant_id)
    workspace_id: WorkspaceId = field(default_factory=_workspace_id)
    sandbox_run_id: UUID = field(default_factory=uuid4)


@dataclass(slots=True, frozen=True)
class SkillInvocationCompleted(DomainEvent):
    skill_id: SkillId = field(default_factory=_skill_id)
    invocation_id: SkillInvocationId = field(default_factory=_invocation_id)
    tenant_id: TenantId = field(default_factory=_tenant_id)
    workspace_id: WorkspaceId = field(default_factory=_workspace_id)
    status: SkillInvocationStatus = SkillInvocationStatus.SUCCEEDED
    latency_ms: int = 0
    artifact_uri: str | None = None
    error_code: str | None = None


__all__ = [
    "DomainEvent",
    "SkillDisabled",
    "SkillInstallFailed",
    "SkillInstalled",
    "SkillInvocationCompleted",
    "SkillInvocationQueued",
    "SkillInvocationStarted",
    "SkillRegistered",
    "SkillUpdated",
]
