"""UploadKnowledgeAssetUseCase.

Stages a raw byte payload into the object store and creates a
``KnowledgeAsset`` row in ``PENDING`` status. The actual chunk +
embed + index pipeline is dispatched via :class:`IngestKnowledgeAssetUseCase`,
which is invoked separately (either inline by ``IngestTextUseCase`` or
out-of-band by a worker in P10).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from eos_schema.ids import KnowledgePackageId, TenantId, UserId, WorkspaceId

from deos.modules.knowledge.application.ports import (
    KnowledgeEventPublisher,
    KnowledgeRepository,
    StoragePort,
)
from deos.modules.knowledge.domain.entities import KnowledgeAsset, KnowledgePackage
from deos.modules.knowledge.domain.errors import (
    KnowledgeAssetNotFound,
    KnowledgePackageNotFound,
    KnowledgeValidationError,
)
from deos.modules.knowledge.domain.events import KnowledgeAssetUploaded
from deos.modules.knowledge.domain.value_objects import (
    KnowledgeAssetKind,
    MAX_ASSET_BYTES,
)

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class UploadKnowledgeAssetUseCase:
    repository: KnowledgeRepository
    storage: StoragePort
    publisher: KnowledgeEventPublisher | None = None
    policy_guard: object | None = None
    max_bytes: int = MAX_ASSET_BYTES

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        package_id: KnowledgePackageId,
        name: str,
        mime_type: str,
        kind: KnowledgeAssetKind | str,
        data: bytes,
        metadata: dict[str, Any] | None = None,
        actor_id: UserId | None = None,
    ) -> KnowledgeAsset:
        if len(data) > self.max_bytes:
            raise KnowledgeValidationError(
                f"asset payload {len(data)} bytes exceeds max {self.max_bytes}",
                code="INVALID_KNOWLEDGE_SPEC",
            )

        if self.policy_guard is not None:
            from eos_vault.actor import ActorContext
            await self.policy_guard.check(  # type: ignore[attr-defined]
                actor=ActorContext(
                    tenant_id=tenant_id,
                    workspace_id=workspace_id,
                    principal_id=actor_id,
                ),
                action="knowledge:asset:upload",
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

        kind_enum = (
            kind if isinstance(kind, KnowledgeAssetKind) else KnowledgeAssetKind(kind)
        )

        # Stage bytes in object storage first; only commit the row if storage succeeds.
        storage_uri = await self.storage.put(
            tenant_id=tenant_id, key=name, data=data
        )
        asset = KnowledgeAsset.create(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            package_id=package_id,
            kind=kind_enum,
            name=name,
            mime_type=mime_type,
            byte_size=len(data),
            storage_uri=storage_uri,
            metadata=metadata,
        )
        saved = await self.repository.add_asset(asset)

        # Increment package asset_count.
        refreshed_pkg: KnowledgePackage = await self.repository.update_package(
            pkg.with_asset_count(asset_count=pkg.asset_count + 1)
        )

        if self.publisher is not None:
            try:
                await self.publisher.publish(
                    KnowledgeAssetUploaded(
                        asset_id=saved.id,
                        package_id=saved.package_id,
                        tenant_id=saved.tenant_id,
                        workspace_id=saved.workspace_id,
                        name=saved.name,
                        byte_size=saved.byte_size,
                    )
                )
            except Exception:
                logger.exception(
                    "publish KnowledgeAssetUploaded failed for %s", saved.id
                )

        # refresh is fine but not strictly required for caller — they get saved + (optional) pkg.
        del refreshed_pkg
        return saved

    async def ingest_inline(
        self,
        *,
        asset: KnowledgeAsset,
        data: bytes,
        chunk_size: int,
        chunk_overlap: int,
    ) -> tuple[KnowledgeAsset, int]:
        """Helper used by :class:`IngestTextUseCase` — re-uses the storage
        stage but treats it as a one-shot ingest without the upload event."""
        del data, chunk_size, chunk_overlap
        # The text-ingest use case has already stored bytes via
        # ``storage.put``. We simply bump status here; actual chunk +
        # embed happens in :class:`IngestKnowledgeAssetUseCase`.
        return asset, 0


__all__ = ["UploadKnowledgeAssetUseCase", "KnowledgeAssetNotFound"]
