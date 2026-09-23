"""DTO ↔ domain mappers for the knowledge HTTP layer."""

from __future__ import annotations

from typing import Any

from deos.modules.knowledge.adapter.http.dto import (
    KnowledgeAssetResponse,
    KnowledgePackageResponse,
    SearchKnowledgeHit,
)
from deos.modules.knowledge.domain.entities import KnowledgeAsset, KnowledgePackage


def _stringify_metadata(meta: dict[str, Any]) -> dict[str, str]:
    return {k: str(v) for k, v in (meta or {}).items()}


def package_to_dto(pkg: KnowledgePackage) -> KnowledgePackageResponse:
    return KnowledgePackageResponse(
        id=str(pkg.id),
        tenant_id=str(pkg.tenant_id),
        workspace_id=str(pkg.workspace_id),
        name=pkg.name,
        description=pkg.description,
        status=pkg.status.value,  # type: ignore[arg-type]
        asset_count=pkg.asset_count,
        metadata=_stringify_metadata(pkg.metadata),
        created_by=str(pkg.created_by) if pkg.created_by else None,
        signature=pkg.signature,
        signer_key_id=pkg.signer_key_id,
        image_digest=pkg.image_digest,
        created_at=pkg.created_at.isoformat(),
        updated_at=pkg.updated_at.isoformat(),
    )


def asset_to_dto(asset: KnowledgeAsset) -> KnowledgeAssetResponse:
    return KnowledgeAssetResponse(
        id=str(asset.id),
        tenant_id=str(asset.tenant_id),
        workspace_id=str(asset.workspace_id),
        package_id=str(asset.package_id),
        kind=asset.kind.value,  # type: ignore[arg-type]
        name=asset.name,
        mime_type=asset.mime_type,
        byte_size=asset.byte_size,
        storage_uri=asset.storage_uri,
        status=asset.status.value,  # type: ignore[arg-type]
        chunk_count=asset.chunk_count,
        error_message=asset.error_message,
        metadata=_stringify_metadata(asset.metadata),
        created_at=asset.created_at.isoformat(),
        updated_at=asset.updated_at.isoformat(),
    )


def search_hit_to_dto(hit: dict[str, Any]) -> SearchKnowledgeHit:
    return SearchKnowledgeHit(
        id=str(hit["id"]),
        asset_id=str(hit["asset_id"]),
        package_id=str(hit["package_id"]),
        package_name=str(hit["package_name"]),
        asset_name=str(hit["asset_name"]),
        content=str(hit["content"]),
        score=float(hit["score"]),
        ordinal=int(hit["ordinal"]),
    )


__all__ = ["asset_to_dto", "package_to_dto", "search_hit_to_dto"]
