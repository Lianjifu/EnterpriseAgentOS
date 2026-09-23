"""ListKnowledgeAssetsUseCase + DetachKnowledgeAssetUseCase."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from eos_schema.ids import (
    KnowledgeAssetId,
    KnowledgePackageId,
    TenantId,
    UserId,
    WorkspaceId,
)

from deos.modules.knowledge.application.ports import (
    KnowledgeEventPublisher,
    KnowledgeRepository,
    VectorSearchPort,
)
from deos.modules.knowledge.domain.entities import KnowledgeAsset
from deos.modules.knowledge.domain.errors import (
    KnowledgeAlreadyRevoked,
    KnowledgeAssetNotFound,
    KnowledgePackageNotFound,
)
from deos.modules.knowledge.domain.events import KnowledgeAssetRevoked
from deos.modules.knowledge.domain.value_objects import (
    KnowledgeAssetStatus,
)

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class ListKnowledgeAssetsUseCase:
    repository: KnowledgeRepository

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        package_id: KnowledgePackageId,
    ) -> list[KnowledgeAsset]:
        # validate package exists (and tenant)
        pkg = await self.repository.get_package(
            tenant_id=tenant_id, package_id=package_id
        )
        if pkg is None or pkg.workspace_id != workspace_id:
            raise KnowledgePackageNotFound(
                f"knowledge package {package_id} not found",
                code="KNOWLEDGE_PACKAGE_NOT_FOUND",
            )
        return await self.repository.list_assets_for_package(
            tenant_id=tenant_id, package_id=package_id
        )


@dataclass(slots=True)
class DetachKnowledgeAssetUseCase:
    """Soft-deletes one asset (revoke + remove from vector index)."""

    repository: KnowledgeRepository
    vector_search: VectorSearchPort | None = None
    publisher: KnowledgeEventPublisher | None = None
    policy_guard: object | None = None

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        asset_id: KnowledgeAssetId,
        actor_id: UserId,
    ) -> KnowledgeAsset:
        if self.policy_guard is not None:
            from eos_vault.actor import ActorContext

            await self.policy_guard.check(  # type: ignore[attr-defined]
                actor=ActorContext(
                    tenant_id=tenant_id,
                    workspace_id=workspace_id,
                    principal_id=actor_id,
                ),
                action="knowledge:asset:revoke",
                resource={"asset_id": str(asset_id)},
            )

        asset = await self.repository.get_asset(tenant_id=tenant_id, asset_id=asset_id)
        if asset is None or asset.workspace_id != workspace_id:
            raise KnowledgeAssetNotFound(
                f"asset {asset_id} not found", code="KNOWLEDGE_ASSET_NOT_FOUND"
            )
        if asset.status == KnowledgeAssetStatus.REVOKED:
            raise KnowledgeAlreadyRevoked(
                f"asset {asset_id} already revoked",
            )

        # Remove from vector index (best-effort)
        if self.vector_search is not None:
            try:
                await self.vector_search.delete_for_asset(
                    tenant_id=tenant_id, asset_id=asset_id
                )
            except Exception:
                logger.exception("vector delete_for_asset failed for %s", asset_id)

        try:
            await self.repository.delete_chunks_for_asset(
                tenant_id=tenant_id, asset_id=asset_id
            )
        except Exception:
            logger.exception("delete_chunks_for_asset failed for %s", asset_id)

        revoked = asset.with_status(status=KnowledgeAssetStatus.REVOKED)
        saved = await self.repository.update_asset(revoked)

        if self.publisher is not None:
            try:
                await self.publisher.publish(
                    KnowledgeAssetRevoked(
                        asset_id=saved.id,
                        package_id=saved.package_id,
                        tenant_id=saved.tenant_id,
                        workspace_id=saved.workspace_id,
                        revoked_by=actor_id,
                    )
                )
            except Exception:
                logger.exception(
                    "publish KnowledgeAssetRevoked failed for %s", saved.id
                )

        return saved


__all__ = ["DetachKnowledgeAssetUseCase", "ListKnowledgeAssetsUseCase"]
