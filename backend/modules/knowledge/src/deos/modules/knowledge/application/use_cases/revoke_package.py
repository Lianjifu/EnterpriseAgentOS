"""RevokeKnowledgePackageUseCase.

Soft-deletes a package and all its assets + chunks. Steps:
  1. Fetch the package; ensure it exists in the current workspace.
  2. Soft-revoke the package row.
  3. Soft-revoke every asset row under the package.
  4. Hard-delete every chunk from the vector index (best-effort).
  5. Hard-delete chunks from the SQL table.
  6. Publish ``KnowledgePackageRevoked`` (best-effort).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from eos_schema.ids import KnowledgePackageId, TenantId, UserId, WorkspaceId

from deos.modules.knowledge.application.ports import (
    KnowledgeEventPublisher,
    KnowledgeRepository,
    VectorSearchPort,
)
from deos.modules.knowledge.domain.entities import KnowledgePackage
from deos.modules.knowledge.domain.errors import (
    KnowledgeAlreadyRevoked,
    KnowledgePackageNotFound,
)
from deos.modules.knowledge.domain.events import KnowledgePackageRevoked
from deos.modules.knowledge.domain.value_objects import (
    KnowledgeAssetStatus,
    KnowledgePackageStatus,
)

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class RevokeKnowledgePackageUseCase:
    repository: KnowledgeRepository
    vector_search: VectorSearchPort | None = None
    publisher: KnowledgeEventPublisher | None = None
    policy_guard: object | None = None

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        package_id: KnowledgePackageId,
        actor_id: UserId,
    ) -> KnowledgePackage:
        if self.policy_guard is not None:
            from eos_vault.actor import ActorContext
            await self.policy_guard.check(  # type: ignore[attr-defined]
                actor=ActorContext(
                    tenant_id=tenant_id,
                    workspace_id=workspace_id,
                    principal_id=actor_id,
                ),
                action="knowledge:package:revoke",
                resource={"package_id": str(package_id)},
            )

        pkg = await self.repository.get_package(
            tenant_id=tenant_id, package_id=package_id
        )
        if pkg is None or pkg.workspace_id != workspace_id:
            raise KnowledgePackageNotFound(
                f"knowledge package {package_id} not found",
                code="KNOWLEDGE_PACKAGE_NOT_FOUND",
            )
        if pkg.status == KnowledgePackageStatus.REVOKED:
            raise KnowledgeAlreadyRevoked(
                f"knowledge package {package_id} already revoked",
            )

        # 1. revoke assets first
        assets = await self.repository.list_assets_for_package(
            tenant_id=tenant_id, package_id=package_id
        )
        for asset in assets:
            if asset.status == KnowledgeAssetStatus.REVOKED:
                continue
            revoked_asset = asset.with_status(status=KnowledgeAssetStatus.REVOKED)
            await self.repository.update_asset(revoked_asset)

        # 2. delete vector rows for this package (best-effort)
        if self.vector_search is not None:
            try:
                await self.vector_search.delete_for_package(
                    tenant_id=tenant_id, package_id=package_id
                )
            except Exception:
                logger.exception(
                    "vector delete_for_package failed for %s", package_id
                )

        # 3. delete SQL chunk rows
        try:
            await self.repository.delete_chunks_for_package(
                tenant_id=tenant_id, package_id=package_id
            )
        except Exception:
            logger.exception(
                "delete_chunks_for_package failed for %s", package_id
            )

        # 4. revoke package row
        revoked = pkg.with_status(status=KnowledgePackageStatus.REVOKED)
        saved = await self.repository.update_package(revoked)

        if self.publisher is not None:
            try:
                await self.publisher.publish(
                    KnowledgePackageRevoked(
                        package_id=saved.id,
                        tenant_id=saved.tenant_id,
                        workspace_id=saved.workspace_id,
                        revoked_by=actor_id,
                    )
                )
            except Exception:
                logger.exception(
                    "publish KnowledgePackageRevoked failed for %s", saved.id
                )

        return saved


__all__ = ["RevokeKnowledgePackageUseCase"]
