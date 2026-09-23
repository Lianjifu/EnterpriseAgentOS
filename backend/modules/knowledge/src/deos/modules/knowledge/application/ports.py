"""Ports — protocols the knowledge application layer depends on.

Adapters (SQL / LocalDiskStorage / PgVector / messaging) implement
these. In-memory fakes live in ``tests/unit/``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol, runtime_checkable
from uuid import UUID

from eos_schema.ids import (
    KnowledgeAssetId,
    KnowledgeChunkId,
    KnowledgePackageId,
    TenantId,
    WorkspaceId,
)

from deos.modules.knowledge.domain.entities import (
    KnowledgeAsset,
    KnowledgeChunk,
    KnowledgePackage,
)
from deos.modules.knowledge.domain.value_objects import KnowledgeAssetKind

__all__ = [
    "ChunkerPort",
    "EmbeddingPort",
    "KnowledgeEventPublisher",
    "KnowledgeRepository",
    "StoragePort",
    "VectorSearchHit",
    "VectorSearchPort",
]


@runtime_checkable
class EmbeddingPort(Protocol):
    """Converts text → embedding vector.

    Mirrors the memory module's :class:`EmbeddingPort`. Knowledge
    intentionally re-declares the protocol so module boundaries stay
    clean; the production container wires the same instance into both.
    """

    async def embed(self, texts: list[str]) -> list[list[float]]: ...


@runtime_checkable
class ChunkerPort(Protocol):
    """Splits raw text into (text, char_start, char_end) tuples."""

    def split(
        self, text: str, *, chunk_size: int, chunk_overlap: int
    ) -> list[tuple[str, int, int]]: ...


@runtime_checkable
class StoragePort(Protocol):
    """Object-storage abstraction for raw knowledge bytes.

    URI shape is the adapter's choice; ``LocalDiskKnowledgeStorage``
    uses ``knowledge-asset://{tenant_id}/{sha256_hex}`` for symmetry
    with the skill module's ``skill-artifact://`` scheme.
    """

    async def put(self, *, tenant_id: TenantId, key: str, data: bytes) -> str: ...

    async def get(self, *, tenant_id: TenantId, uri: str) -> bytes: ...

    async def delete(self, *, tenant_id: TenantId, uri: str) -> None: ...

    async def exists(self, *, tenant_id: TenantId, uri: str) -> bool: ...


@dataclass(slots=True, frozen=True)
class VectorSearchHit:
    """One row returned by :class:`VectorSearchPort.search`."""

    chunk_id: KnowledgeChunkId
    score: float  # higher = closer (1 - cosine distance)


@runtime_checkable
class VectorSearchPort(Protocol):
    """Narrow facade over ``eos_vector.VectorStore`` for knowledge chunks."""

    async def upsert(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        chunk_id: KnowledgeChunkId,
        embedding: tuple[float, ...],
        payload: dict[str, Any] | None = None,
    ) -> None: ...

    async def delete(
        self, *, tenant_id: TenantId, chunk_id: KnowledgeChunkId
    ) -> None: ...

    async def delete_for_asset(
        self, *, tenant_id: TenantId, asset_id: KnowledgeAssetId
    ) -> int: ...

    async def delete_for_package(
        self, *, tenant_id: TenantId, package_id: KnowledgePackageId
    ) -> int: ...

    async def search(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        query_embedding: tuple[float, ...],
        top_k: int,
        workspace_filter_required: bool = True,
        package_ids: tuple[str, ...] = (),
        asset_kind_filter: KnowledgeAssetKind | None = None,
    ) -> list[VectorSearchHit]: ...


@runtime_checkable
class KnowledgeRepository(Protocol):
    """Persistence port for ``KnowledgePackage`` / ``KnowledgeAsset`` / ``KnowledgeChunk``.

    All methods are tenant-scoped; cross-tenant reads MUST be impossible
    from this port alone.
    """

    async def add_package(self, package: KnowledgePackage) -> KnowledgePackage: ...

    async def get_package(
        self, *, tenant_id: TenantId, package_id: KnowledgePackageId
    ) -> KnowledgePackage | None: ...

    async def list_packages(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        limit: int = 50,
    ) -> list[KnowledgePackage]: ...

    async def update_package(self, package: KnowledgePackage) -> KnowledgePackage: ...

    async def add_asset(self, asset: KnowledgeAsset) -> KnowledgeAsset: ...

    async def get_asset(
        self, *, tenant_id: TenantId, asset_id: KnowledgeAssetId
    ) -> KnowledgeAsset | None: ...

    async def list_assets_for_package(
        self,
        *,
        tenant_id: TenantId,
        package_id: KnowledgePackageId,
    ) -> list[KnowledgeAsset]: ...

    async def update_asset(self, asset: KnowledgeAsset) -> KnowledgeAsset: ...

    async def add_chunks(
        self,
        *,
        chunks: list[KnowledgeChunk],
        embeddings: list[list[float]] | None = None,
    ) -> list[KnowledgeChunk]: ...

    async def list_chunks_for_asset(
        self,
        *,
        tenant_id: TenantId,
        asset_id: KnowledgeAssetId,
    ) -> list[KnowledgeChunk]: ...

    async def delete_chunks_for_asset(
        self, *, tenant_id: TenantId, asset_id: KnowledgeAssetId
    ) -> int: ...

    async def delete_chunks_for_package(
        self, *, tenant_id: TenantId, package_id: KnowledgePackageId
    ) -> int: ...

    async def find_chunk(
        self, *, tenant_id: TenantId, chunk_id: KnowledgeChunkId
    ) -> KnowledgeChunk | None: ...


@runtime_checkable
class KnowledgeEventPublisher(Protocol):
    """Publishes knowledge domain events onto the in-process bus."""

    async def publish(self, event: object) -> None: ...


def _coerce_uuid(value: UUID | str) -> UUID:
    """Helper for adapters that need to bridge str-typed IDs and UUID."""
    return value if isinstance(value, UUID) else UUID(str(value))
