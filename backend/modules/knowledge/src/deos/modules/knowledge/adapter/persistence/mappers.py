"""Domain ↔ ORM mappers for the knowledge module.

Pure functions — no I/O.  The SQL repository calls these from inside the
session context.
"""

from __future__ import annotations

from typing import Any

from eos_schema.ids import (
    KnowledgeAssetId,
    KnowledgeChunkId,
    KnowledgePackageId,
    TenantId,
    UserId,
    WorkspaceId,
)

from deos.modules.knowledge.adapter.persistence.models import (
    KnowledgeAssetORM,
    KnowledgeChunkORM,
    KnowledgePackageORM,
)
from deos.modules.knowledge.domain.entities import (
    KnowledgeAsset,
    KnowledgeChunk,
    KnowledgePackage,
)
from deos.modules.knowledge.domain.value_objects import (
    KnowledgeAssetKind,
    KnowledgeAssetStatus,
    KnowledgePackageStatus,
)


# ── KnowledgePackage ─────────────────────────────────────────────────────


def package_to_domain(row: KnowledgePackageORM) -> KnowledgePackage:
    return KnowledgePackage(
        id=KnowledgePackageId(row.id),
        tenant_id=TenantId(row.tenant_id),
        workspace_id=WorkspaceId(row.workspace_id),
        name=row.name,
        description=row.description or "",
        status=KnowledgePackageStatus(row.status),
        asset_count=row.asset_count,
        metadata=dict(row.metadata_ or {}),
        created_by=UserId(row.created_by) if row.created_by else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def package_to_orm(entity: KnowledgePackage) -> KnowledgePackageORM:
    return KnowledgePackageORM(
        id=entity.id,
        tenant_id=entity.tenant_id,
        workspace_id=entity.workspace_id,
        name=entity.name,
        description=entity.description,
        status=entity.status.value,
        asset_count=entity.asset_count,
        metadata_=dict(entity.metadata),
        created_by=entity.created_by,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


# ── KnowledgeAsset ───────────────────────────────────────────────────────


def asset_to_domain(row: KnowledgeAssetORM) -> KnowledgeAsset:
    return KnowledgeAsset(
        id=KnowledgeAssetId(row.id),
        tenant_id=TenantId(row.tenant_id),
        workspace_id=WorkspaceId(row.workspace_id),
        package_id=KnowledgePackageId(row.package_id),
        kind=KnowledgeAssetKind(row.kind),
        name=row.name,
        mime_type=row.mime_type,
        byte_size=row.byte_size,
        storage_uri=row.storage_uri,
        status=KnowledgeAssetStatus(row.status),
        chunk_count=row.chunk_count,
        error_message=row.error_message,
        metadata=dict(row.metadata_ or {}),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def asset_to_orm(entity: KnowledgeAsset) -> KnowledgeAssetORM:
    return KnowledgeAssetORM(
        id=entity.id,
        tenant_id=entity.tenant_id,
        workspace_id=entity.workspace_id,
        package_id=entity.package_id,
        kind=entity.kind.value,
        name=entity.name,
        mime_type=entity.mime_type,
        byte_size=entity.byte_size,
        storage_uri=entity.storage_uri,
        status=entity.status.value,
        chunk_count=entity.chunk_count,
        error_message=entity.error_message,
        metadata_=dict(entity.metadata),
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


# ── KnowledgeChunk ───────────────────────────────────────────────────────


def chunk_to_domain(row: KnowledgeChunkORM) -> KnowledgeChunk:
    return KnowledgeChunk(
        id=KnowledgeChunkId(row.id),
        tenant_id=TenantId(row.tenant_id),
        workspace_id=WorkspaceId(row.workspace_id),
        package_id=KnowledgePackageId(row.package_id),
        asset_id=KnowledgeAssetId(row.asset_id),
        ordinal=row.ordinal,
        content=row.content,
        char_start=row.char_start,
        char_end=row.char_end,
        created_at=row.created_at,
    )


def chunk_to_orm(
    entity: KnowledgeChunk, *, embedding: list[float] | tuple[float, ...] | None = None
) -> KnowledgeChunkORM:
    emb = list(embedding) if embedding is not None else []
    return KnowledgeChunkORM(
        id=entity.id,
        tenant_id=entity.tenant_id,
        workspace_id=entity.workspace_id,
        package_id=entity.package_id,
        asset_id=entity.asset_id,
        ordinal=entity.ordinal,
        content=entity.content,
        char_start=entity.char_start,
        char_end=entity.char_end,
        embedding=emb,
        created_at=entity.created_at,
    )


__all__ = [
    "asset_to_domain",
    "asset_to_orm",
    "chunk_to_domain",
    "chunk_to_orm",
    "package_to_domain",
    "package_to_orm",
]

_ = Any  # type-only re-export to keep `from typing import Any` live