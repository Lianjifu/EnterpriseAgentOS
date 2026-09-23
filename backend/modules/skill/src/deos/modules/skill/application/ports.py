"""Domain port definitions for the skill module.

Inbound (use_case calls): three repository Protocols for the aggregates.

Outbound (skill → adapter): `SkillArtifactStore`, `SandboxRunner`,
`RunTokenIssuer`, `SkillEventPublisher`, plus the `UnitOfWork` seam.

Concrete adapters are wired in `composition/`: persistence goes through
the SQL repositories, artifacts through `LocalDiskSkillArtifactStore`,
the sandbox through `eos_sandbox.LocalSandbox` (dev) or
`eos_sandbox.DockerSandbox` (prod), and RunToken issuance through the
in-tree `eos_sandbox.run_token` HMAC helper.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Sequence
from pathlib import Path
from typing import Protocol, runtime_checkable
from uuid import UUID

from eos_sandbox.sandbox import Sandbox, SandboxEvent, SandboxRunSpec
from eos_schema.ids import (
    SkillId,
    SkillInstallId,
    SkillInvocationId,
    TenantId,
    WorkspaceId,
)

from deos.modules.skill.domain.entities import (
    NetworkPolicy,
    SkillInstall,
    SkillInvocation,
    SkillInvocationStatus,
    SkillPackage,
)
from deos.modules.skill.domain.events import DomainEvent

# ─────────────────────────────────────────────────────────────────────────────
# Inbound: repositories
# ─────────────────────────────────────────────────────────────────────────────


@runtime_checkable
class SkillRepository(Protocol):
    """Aggregate root for skill package definitions."""

    async def add(self, package: SkillPackage) -> None: ...
    async def get(self, *, tenant_id: TenantId, skill_id: SkillId) -> SkillPackage: ...
    async def get_by_name(
        self, *, tenant_id: TenantId, workspace_id: WorkspaceId, name: str
    ) -> SkillPackage: ...
    async def list(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        limit: int = 50,
        offset: int = 0,
        enabled_only: bool = False,
    ) -> Sequence[SkillPackage]: ...
    async def update(self, package: SkillPackage) -> None: ...


@runtime_checkable
class SkillInstallRepository(Protocol):
    async def add(self, install: SkillInstall) -> None: ...
    async def get(
        self, *, tenant_id: TenantId, install_id: SkillInstallId
    ) -> SkillInstall: ...
    async def get_active(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        skill_id: SkillId,
    ) -> SkillInstall | None:
        """Latest INSTALLED row for the (workspace, skill)."""
        ...

    async def update(self, install: SkillInstall) -> None: ...


@runtime_checkable
class SkillInvocationRepository(Protocol):
    async def add(self, invocation: SkillInvocation) -> None: ...
    async def get(
        self, *, tenant_id: TenantId, invocation_id: SkillInvocationId
    ) -> SkillInvocation: ...
    async def get_by_id(
        self, *, invocation_id: SkillInvocationId
    ) -> SkillInvocation: ...
    async def update(self, invocation: SkillInvocation) -> None: ...
    async def list(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        skill_id: SkillId | None = None,
        status: SkillInvocationStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[SkillInvocation]: ...


# ─────────────────────────────────────────────────────────────────────────────
# Outbound: artifact store, sandbox, RunToken issuer, events, UoW
# ─────────────────────────────────────────────────────────────────────────────


@runtime_checkable
class SkillArtifactStore(Protocol):
    """Content-addressed blob store. URI shape:

    `skill-artifact://{tenant_id}/{sha256_hex}`
    """

    async def put(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        key: str,
        data: bytes,
        content_type: str = "application/json",
    ) -> str: ...

    async def get(self, *, tenant_id: TenantId, uri: str) -> bytes: ...

    async def exists(self, *, tenant_id: TenantId, uri: str) -> bool: ...

    async def delete(self, *, tenant_id: TenantId, uri: str) -> None: ...

    async def local_path(self, *, tenant_id: TenantId, uri: str) -> Path | None: ...


class SkillSandboxRunner(Sandbox, ABC):
    """Concrete Sandbox that satisfies the Sandbox Protocol AND carries the
    sandbox-aware Skill defaults (image defaults, env templating, etc.).
    """

    @abstractmethod
    def spec_for(
        self,
        *,
        run_id: UUID,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        skill_id: SkillId,
        image: str,
        command: tuple[str, ...],
        env: dict | None,
        working_dir: str | None,
        timeout_seconds: int,
        network_policy: NetworkPolicy,
        cpu_quota: float | None,
        memory_bytes: int | None,
    ) -> SandboxRunSpec: ...


class RunTokenIssuer(ABC):
    @abstractmethod
    def issue(
        self,
        *,
        skill_id: SkillId,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        ttl_seconds: int = 300,
    ) -> tuple[str, str, int]:
        """Returns (raw_token, jti, expires_at_ms_epoch)."""

    @abstractmethod
    def verify(self, token: str) -> SkillInvocationId | None:
        """Returns the skill_id if valid; raises `AuthenticationError` (401)
        on bad sig / expired / malformed."""


class SkillEventPublisher(ABC):
    @abstractmethod
    async def publish(self, event: DomainEvent) -> None: ...


class UnitOfWork(ABC):
    """One transaction wraps one use case so persistence + event publish
    land together. Repositories are bound to the same session."""

    skills: SkillRepository
    installs: SkillInstallRepository
    invocations: SkillInvocationRepository

    @abstractmethod
    async def __aenter__(self) -> UnitOfWork: ...

    @abstractmethod
    async def __aexit__(self, exc_type, exc, tb) -> None: ...

    @abstractmethod
    async def commit(self) -> None: ...

    @abstractmethod
    async def rollback(self) -> None: ...


__all__ = [
    "UUID",
    "RunTokenIssuer",
    "SandboxEvent",
    "SandboxRunSpec",
    "SkillArtifactStore",
    "SkillEventPublisher",
    "SkillInstallRepository",
    "SkillInvocationRepository",
    "SkillRepository",
    "SkillSandboxRunner",
    "UnitOfWork",
]
