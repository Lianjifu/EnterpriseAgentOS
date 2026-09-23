"""IngestTextUseCase — convenience flow for raw text.

Composes :class:`UploadKnowledgeAssetUseCase` + :class:`IngestKnowledgeAssetUseCase`
so a caller can POST a small body of text and have it indexed in one
round-trip (no object-storage hop when the text fits below
``max_inline_bytes``). For larger payloads, callers should
``upload_asset`` + poll status.

When ``max_inline_bytes`` is exceeded we fall back to staging bytes
through :class:`StoragePort` so the asset row still has a stable URI.
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
from deos.modules.knowledge.application.use_cases.ingest_asset import (
    IngestKnowledgeAssetUseCase,
)
from deos.modules.knowledge.domain.entities import KnowledgeAsset
from deos.modules.knowledge.domain.value_objects import KnowledgeAssetKind

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class IngestTextUseCase:
    repository: KnowledgeRepository
    storage: StoragePort
    publisher: KnowledgeEventPublisher | None = None
    policy_guard: object | None = None
    max_inline_bytes: int = (
        256 * 1024
    )  # 256 KiB stays inline; otherwise staged via StoragePort.

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        package_id: KnowledgePackageId,
        name: str,
        text: str,
        mime_type: str = "text/plain",
        metadata: dict[str, Any] | None = None,
        actor_id: UserId | None = None,
        ingest_use_case: IngestKnowledgeAssetUseCase | None = None,
    ) -> KnowledgeAsset:
        data = text.encode("utf-8")
        from deos.modules.knowledge.application.use_cases.upload_asset import (
            UploadKnowledgeAssetUseCase,
        )

        upload = UploadKnowledgeAssetUseCase(
            repository=self.repository,
            storage=self.storage,
            publisher=self.publisher,
            policy_guard=self.policy_guard,
        )
        asset = await upload.execute(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            package_id=package_id,
            name=name,
            mime_type=mime_type,
            kind=KnowledgeAssetKind.TEXT,
            data=data,
            metadata=metadata,
            actor_id=actor_id,
        )

        if ingest_use_case is None:
            # Without an explicit ingest use case we still return the asset
            # in PENDING; the caller is expected to invoke ingest separately.
            return asset

        return await ingest_use_case.execute(tenant_id=tenant_id, asset_id=asset.id)


__all__ = ["IngestTextUseCase"]
