"""Read-only knowledge package use cases.

Three independent use cases wired into :class:`KnowledgeService`:

- :class:`GetKnowledgePackageUseCase` — fetch one by id (404 if missing).
- :class:`ListKnowledgePackagesUseCase` — list by workspace.
"""

from __future__ import annotations

from dataclasses import dataclass

from eos_schema.ids import KnowledgePackageId, TenantId, WorkspaceId

from deos.modules.knowledge.application.ports import KnowledgeRepository
from deos.modules.knowledge.domain.entities import KnowledgePackage
from deos.modules.knowledge.domain.errors import KnowledgePackageNotFound


@dataclass(slots=True)
class GetKnowledgePackageUseCase:
    repository: KnowledgeRepository

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        package_id: KnowledgePackageId,
    ) -> KnowledgePackage:
        pkg = await self.repository.get_package(
            tenant_id=tenant_id, package_id=package_id
        )
        if pkg is None or pkg.workspace_id != workspace_id:
            raise KnowledgePackageNotFound(
                f"knowledge package {package_id} not found",
                code="KNOWLEDGE_PACKAGE_NOT_FOUND",
            )
        return pkg


@dataclass(slots=True)
class ListKnowledgePackagesUseCase:
    repository: KnowledgeRepository

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        limit: int = 50,
    ) -> list[KnowledgePackage]:
        if limit < 1 or limit > 200:
            raise ValueError(f"limit must be in [1, 200], got {limit}")
        return await self.repository.list_packages(
            tenant_id=tenant_id, workspace_id=workspace_id, limit=limit
        )


__all__ = ["GetKnowledgePackageUseCase", "ListKnowledgePackagesUseCase"]
