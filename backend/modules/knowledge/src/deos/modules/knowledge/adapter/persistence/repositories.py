"""Async-SQLAlchemy implementation of :class:`KnowledgeRepository`.

The repository writes via ``AsyncSession``; the ``KnowledgeEventPublisher``
is NOT touched here — use cases emit events.
"""

from __future__ import annotations

from eos_schema.ids import (
    KnowledgeAssetId,
    KnowledgeChunkId,
    KnowledgePackageId,
    TenantId,
    WorkspaceId,
)
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from deos.modules.knowledge.adapter.persistence.mappers import (
    asset_to_domain,
    asset_to_orm,
    chunk_to_domain,
    chunk_to_orm,
    package_to_domain,
    package_to_orm,
)
from deos.modules.knowledge.adapter.persistence.models import (
    KnowledgeAssetORM,
    KnowledgeChunkORM,
    KnowledgePackageORM,
)
from deos.modules.knowledge.application.ports import KnowledgeRepository
from deos.modules.knowledge.domain.entities import (
    KnowledgeAsset,
    KnowledgeChunk,
    KnowledgePackage,
)
from deos.modules.knowledge.domain.value_objects import KnowledgePackageStatus


class SqlKnowledgeRepository(KnowledgeRepository):
    """ORM-backed repository — single AsyncSession injected at construction."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # ── packages ──────────────────────────────────────────────────────────

    async def add_package(self, package: KnowledgePackage) -> KnowledgePackage:
        row = package_to_orm(package)
        self._session.add(row)
        await self._session.flush()
        return package_to_domain(row)

    async def get_package(
        self, *, tenant_id: TenantId, package_id: KnowledgePackageId
    ) -> KnowledgePackage | None:
        result = await self._session.execute(
            select(KnowledgePackageORM).where(
                KnowledgePackageORM.tenant_id == tenant_id,
                KnowledgePackageORM.id == package_id,
            )
        )
        row = result.scalar_one_or_none()
        return package_to_domain(row) if row is not None else None

    async def list_packages(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        limit: int = 50,
    ) -> list[KnowledgePackage]:
        if limit <= 0:
            raise ValueError("limit must be > 0")
        result = await self._session.execute(
            select(KnowledgePackageORM)
            .where(
                KnowledgePackageORM.tenant_id == tenant_id,
                KnowledgePackageORM.workspace_id == workspace_id,
            )
            .order_by(KnowledgePackageORM.created_at.desc())
            .limit(limit)
        )
        return [package_to_domain(r) for r in result.scalars().all()]

    async def update_package(self, package: KnowledgePackage) -> KnowledgePackage:
        existing = await self._session.get(KnowledgePackageORM, package.id)
        if existing is None:
            raise LookupError(f"package {package.id} not found")
        # status / asset_count / description / metadata may have changed
        existing.status = package.status.value
        existing.asset_count = package.asset_count
        existing.description = package.description
        existing.metadata_ = dict(package.metadata)
        existing.updated_at = package.updated_at
        await self._session.flush()
        return package_to_domain(existing)

    # ── assets ────────────────────────────────────────────────────────────

    async def add_asset(self, asset: KnowledgeAsset) -> KnowledgeAsset:
        row = asset_to_orm(asset)
        self._session.add(row)
        await self._session.flush()
        return asset_to_domain(row)

    async def get_asset(
        self, *, tenant_id: TenantId, asset_id: KnowledgeAssetId
    ) -> KnowledgeAsset | None:
        result = await self._session.execute(
            select(KnowledgeAssetORM).where(
                KnowledgeAssetORM.tenant_id == tenant_id,
                KnowledgeAssetORM.id == asset_id,
            )
        )
        row = result.scalar_one_or_none()
        return asset_to_domain(row) if row is not None else None

    async def list_assets_for_package(
        self,
        *,
        tenant_id: TenantId,
        package_id: KnowledgePackageId,
    ) -> list[KnowledgeAsset]:
        result = await self._session.execute(
            select(KnowledgeAssetORM)
            .where(
                KnowledgeAssetORM.tenant_id == tenant_id,
                KnowledgeAssetORM.package_id == package_id,
            )
            .order_by(KnowledgeAssetORM.created_at.asc())
        )
        return [asset_to_domain(r) for r in result.scalars().all()]

    async def update_asset(self, asset: KnowledgeAsset) -> KnowledgeAsset:
        existing = await self._session.get(KnowledgeAssetORM, asset.id)
        if existing is None:
            raise LookupError(f"asset {asset.id} not found")
        existing.status = asset.status.value
        existing.chunk_count = asset.chunk_count
        existing.error_message = asset.error_message
        existing.metadata_ = dict(asset.metadata)
        existing.updated_at = asset.updated_at
        await self._session.flush()
        return asset_to_domain(existing)

    # ── chunks ────────────────────────────────────────────────────────────

    async def add_chunks(
        self,
        *,
        chunks: list[KnowledgeChunk],
        embeddings: list[list[float]] | None = None,
    ) -> list[KnowledgeChunk]:
        if embeddings is not None and len(embeddings) != len(chunks):
            raise ValueError(
                f"embeddings count ({len(embeddings)}) must match chunks count ({len(chunks)})"
            )
        rows = [
            chunk_to_orm(c, embedding=e)
            for c, e in zip(
                chunks,
                embeddings if embeddings is not None else [None] * len(chunks),
                strict=False,
            )
        ]
        self._session.add_all(rows)
        await self._session.flush()
        return [chunk_to_domain(r) for r in rows]

    async def list_chunks_for_asset(
        self,
        *,
        tenant_id: TenantId,
        asset_id: KnowledgeAssetId,
    ) -> list[KnowledgeChunk]:
        result = await self._session.execute(
            select(KnowledgeChunkORM)
            .where(
                KnowledgeChunkORM.tenant_id == tenant_id,
                KnowledgeChunkORM.asset_id == asset_id,
            )
            .order_by(KnowledgeChunkORM.ordinal.asc())
        )
        return [chunk_to_domain(r) for r in result.scalars().all()]

    async def delete_chunks_for_asset(
        self, *, tenant_id: TenantId, asset_id: KnowledgeAssetId
    ) -> int:
        result = await self._session.execute(
            delete(KnowledgeChunkORM)
            .where(
                KnowledgeChunkORM.tenant_id == tenant_id,
                KnowledgeChunkORM.asset_id == asset_id,
            )
            .execution_options(synchronize_session=False)
        )
        return int(result.rowcount or 0)  # type: ignore[attr-defined]

    async def delete_chunks_for_package(
        self, *, tenant_id: TenantId, package_id: KnowledgePackageId
    ) -> int:
        result = await self._session.execute(
            delete(KnowledgeChunkORM)
            .where(
                KnowledgeChunkORM.tenant_id == tenant_id,
                KnowledgeChunkORM.package_id == package_id,
            )
            .execution_options(synchronize_session=False)
        )
        return int(result.rowcount or 0)  # type: ignore[attr-defined]

    async def find_chunk(
        self, *, tenant_id: TenantId, chunk_id: KnowledgeChunkId
    ) -> KnowledgeChunk | None:
        result = await self._session.execute(
            select(KnowledgeChunkORM).where(
                KnowledgeChunkORM.tenant_id == tenant_id,
                KnowledgeChunkORM.id == chunk_id,
            )
        )
        row = result.scalar_one_or_none()
        return chunk_to_domain(row) if row is not None else None


__all__ = ["SqlKnowledgeRepository"]


# Type-only re-export to keep the `KnowledgePackageStatus` import alive
# for tests that introspect this module's namespace.
_ = KnowledgePackageStatus
