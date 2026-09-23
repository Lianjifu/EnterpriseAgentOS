"""In-memory test doubles for skill module unit tests."""

from __future__ import annotations

import asyncio
import hashlib
from collections.abc import Sequence
from pathlib import Path
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

from deos.modules.skill.application.ports import (
    RunTokenIssuer,
    SkillArtifactStore,
    SkillEventPublisher,
    SkillInstallRepository,
    SkillInvocationRepository,
    SkillRepository,
    UnitOfWork,
)
from deos.modules.skill.domain.entities import (
    SkillInstall,
    SkillInvocation,
    SkillInvocationStatus,
    SkillPackage,
)
from deos.modules.skill.domain.events import DomainEvent


class InMemorySkillRepository(SkillRepository):
    def __init__(self) -> None:
        self._rows: dict[SkillId, SkillPackage] = {}

    async def add(self, package: SkillPackage) -> None:
        self._rows[package.id] = package

    async def update(self, package: SkillPackage) -> None:
        self._rows[package.id] = package

    async def get(
        self, *, tenant_id: TenantId, skill_id: SkillId
    ) -> SkillPackage | None:
        row = self._rows.get(skill_id)
        if row is None or row.tenant_id != tenant_id:
            return None
        return row

    async def get_by_name(
        self, *, tenant_id: TenantId, workspace_id: WorkspaceId, name: str
    ) -> SkillPackage | None:
        for row in self._rows.values():
            if (
                row.tenant_id == tenant_id
                and row.workspace_id == workspace_id
                and row.name == name
            ):
                return row
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
        rows = [
            r
            for r in self._rows.values()
            if r.tenant_id == tenant_id
            and r.workspace_id == workspace_id
            and (not enabled_only or r.enabled)
        ]
        return rows[offset : offset + limit]


class InMemoryInstallRepository(SkillInstallRepository):
    def __init__(self) -> None:
        self._rows: dict[SkillInstallId, SkillInstall] = {}

    async def add(self, install: SkillInstall) -> None:
        self._rows[install.id] = install

    async def update(self, install: SkillInstall) -> None:
        self._rows[install.id] = install

    async def get(
        self, *, tenant_id: TenantId, install_id: SkillInstallId
    ) -> SkillInstall | None:
        row = self._rows.get(install_id)
        if row is None or row.tenant_id != tenant_id:
            return None
        return row

    async def get_active(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        skill_id: SkillId,
    ) -> SkillInstall | None:
        candidates = [
            r
            for r in self._rows.values()
            if r.tenant_id == tenant_id
            and r.workspace_id == workspace_id
            and r.package_id == skill_id
            and r.status.value == "installed"
        ]
        if not candidates:
            return None
        return max(candidates, key=lambda r: r.installed_at)


class InMemoryInvocationRepository(SkillInvocationRepository):
    def __init__(self) -> None:
        self._rows: dict[SkillInvocationId, SkillInvocation] = {}
        self._lock = asyncio.Lock()

    async def add(self, invocation: SkillInvocation) -> None:
        self._rows[invocation.id] = invocation

    async def update(self, invocation: SkillInvocation) -> SkillInvocation:
        self._rows[invocation.id] = invocation
        return invocation

    async def get(
        self, *, tenant_id: TenantId, invocation_id: SkillInvocationId
    ) -> SkillInvocation | None:
        row = self._rows.get(invocation_id)
        if row is None or row.tenant_id != tenant_id:
            return None
        return row

    async def get_by_id(
        self, *, invocation_id: SkillInvocationId
    ) -> SkillInvocation | None:
        return self._rows.get(invocation_id)

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
        rows = [
            r
            for r in self._rows.values()
            if r.tenant_id == tenant_id and r.workspace_id == workspace_id
        ]
        if skill_id is not None:
            rows = [r for r in rows if r.package_id == skill_id]
        if status is not None:
            rows = [r for r in rows if r.status == status]
        return rows[offset : offset + limit]


class InMemoryUnitOfWork(UnitOfWork):
    skills: SkillRepository
    installs: SkillInstallRepository
    invocations: SkillInvocationRepository

    def __init__(self) -> None:
        self.skills = InMemorySkillRepository()
        self.installs = InMemoryInstallRepository()
        self.invocations = InMemoryInvocationRepository()
        self.committed = False

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(self, *exc: object) -> None:
        return None

    async def commit(self) -> None:
        self.committed = True

    async def rollback(self) -> None:
        self.committed = False


class RecordingSkillEventPublisher(SkillEventPublisher):
    def __init__(self) -> None:
        self.events: list[DomainEvent] = []

    async def publish(self, event: DomainEvent) -> None:
        self.events.append(event)


class FakeRunTokenIssuer(RunTokenIssuer):
    def __init__(self) -> None:
        self.issued: list[tuple[str, str, int]] = []

    def issue(
        self,
        *,
        skill_id: SkillId,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        ttl_seconds: int = 300,
    ) -> tuple[str, str, int]:
        jti = hashlib.sha256(skill_id.bytes).hexdigest()[:32]
        token = f"tok-{jti}"
        expires = 999_999_999_000
        self.issued.append((token, jti, expires))
        return token, jti, expires

    def verify(self, token: str) -> SkillId | None:
        if not token.startswith("tok-"):
            return None
        return None  # not used in tests


class InMemoryArtifactStore(SkillArtifactStore):
    def __init__(self, root: Path | None = None) -> None:
        self._blobs: dict[str, bytes] = {}

    async def put(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        key: str,
        data: bytes,
        content_type: str = "application/json",
    ) -> str:
        sha = hashlib.sha256(data).hexdigest()
        uri = f"skill-artifact://{tenant_id}/{sha}"
        self._blobs[uri] = data
        return uri

    async def get(self, *, tenant_id: TenantId, uri: str) -> bytes:
        return self._blobs[uri]

    async def exists(self, *, tenant_id: TenantId, uri: str) -> bool:
        return uri in self._blobs

    async def delete(self, *, tenant_id: TenantId, uri: str) -> None:
        self._blobs.pop(uri, None)

    async def local_path(self, *, tenant_id: TenantId, uri: str) -> Path | None:
        return None


__all__ = [
    "UUID",
    "FakeRunTokenIssuer",
    "InMemoryArtifactStore",
    "InMemoryInstallRepository",
    "InMemoryInvocationRepository",
    "InMemorySkillRepository",
    "InMemoryUnitOfWork",
    "RecordingSkillEventPublisher",
    "TenantId",
    "UserId",
    "WorkspaceId",
    "uuid4",
]
