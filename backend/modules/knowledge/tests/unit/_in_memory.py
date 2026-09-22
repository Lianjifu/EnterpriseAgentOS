"""In-memory test doubles for the knowledge module.

Mirrors ``modules/memory/tests/unit/_memory_in_memory.py``:

- :class:`DeterministicEmbedding` — hash-based 1536-dim vectors for
  deterministic ordering.
- :class:`InMemoryKnowledgeRepository` — dict-backed repo implementing
  every method on :class:`KnowledgeRepository`.
- :class:`InMemoryVectorSearch` — brute-force cosine over chunks.
- :class:`InMemoryStorage` — dict-backed byte store.
- :class:`RecordingPublisher` — appends published events for assertion.
"""

from __future__ import annotations

import asyncio
import hashlib
import math
import re
from collections.abc import Iterable
from dataclasses import dataclass, field
from typing import Any
from uuid import UUID, uuid4

from eos_schema.ids import (
    KnowledgeAssetId,
    KnowledgeChunkId,
    KnowledgePackageId,
    TenantId,
    WorkspaceId,
)

from deos.modules.knowledge.application.ports import (
    ChunkerPort,
    EmbeddingPort,
    KnowledgeEventPublisher,
    KnowledgeRepository,
    StoragePort,
    VectorSearchHit,
    VectorSearchPort,
)
from deos.modules.knowledge.domain.entities import (
    EMBEDDING_DIM,
    KnowledgeAsset,
    KnowledgeChunk,
    KnowledgePackage,
)
from deos.modules.knowledge.domain.value_objects import KnowledgeAssetKind

# ── Embedding ────────────────────────────────────────────────────────────


def _text_to_vector(text: str, dim: int = EMBEDDING_DIM) -> list[float]:
    """Hash each whitespace-token to a deterministic float in [-1, 1]."""
    vec = [0.0] * dim
    if not text:
        return vec
    for token in re.findall(r"\w+", text.lower()):
        h = hashlib.sha256(token.encode("utf-8")).digest()
        idx = int.from_bytes(h[:4], "big") % dim
        sign = -1.0 if (h[4] & 1) else 1.0
        mag = (h[5] / 255.0) + 0.25  # 0.25..1.25
        vec[idx] += sign * mag
    # L2-normalize so cosine similarity ∈ [-1, 1].
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


class DeterministicEmbedding(EmbeddingPort):
    def __init__(self, dim: int = EMBEDDING_DIM) -> None:
        self._dim = dim
        self.calls = 0
        self.last_batch: list[str] = []

    async def embed(self, texts: list[str]) -> list[list[float]]:
        self.calls += 1
        self.last_batch = list(texts)
        return [_text_to_vector(t, self._dim) for t in texts]


class FixedChunker(ChunkerPort):
    """Round-robin splitter for tests — alternates window boundaries."""

    def split(
        self, text: str, *, chunk_size: int, chunk_overlap: int
    ) -> list[tuple[str, int, int]]:
        if chunk_size <= 0:
            raise ValueError("chunk_size must be > 0")
        if chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be < chunk_size")
        if not text:
            return []
        n = len(text)
        stride = chunk_size - chunk_overlap
        out: list[tuple[str, int, int]] = []
        start = 0
        while start < n:
            end = min(start + chunk_size, n)
            piece = text[start:end]
            if piece.strip():
                out.append((piece, start, end))
            if end == n:
                break
            start += stride
        return out


# ── Storage ──────────────────────────────────────────────────────────────


class InMemoryStorage(StoragePort):
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._by_uri: dict[str, bytes] = {}

    async def put(self, *, tenant_id: TenantId, key: str, data: bytes) -> str:
        sha = hashlib.sha256(data).hexdigest()
        uri = f"knowledge-asset://{tenant_id}/{sha}"
        async with self._lock:
            self._by_uri[uri] = data
        return uri

    async def get(self, *, tenant_id: TenantId, uri: str) -> bytes:
        data = self._by_uri.get(uri)
        if data is None:
            raise FileNotFoundError(uri)
        return data

    async def delete(self, *, tenant_id: TenantId, uri: str) -> None:
        self._by_uri.pop(uri, None)

    async def exists(self, *, tenant_id: TenantId, uri: str) -> bool:
        return uri in self._by_uri


# ── Vector ───────────────────────────────────────────────────────────────


def _cosine(a: tuple[float, ...], b: tuple[float, ...]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (na * nb)


@dataclass(slots=True)
class _VecRow:
    chunk_id: KnowledgeChunkId
    tenant_id: UUID
    workspace_id: UUID
    embedding: tuple[float, ...]
    payload: dict[str, Any] = field(default_factory=dict)


class InMemoryVectorSearch(VectorSearchPort):
    def __init__(self) -> None:
        self._rows: dict[KnowledgeChunkId, _VecRow] = {}

    async def upsert(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        chunk_id: KnowledgeChunkId,
        embedding: tuple[float, ...],
        payload: dict[str, Any] | None = None,
    ) -> None:
        self._rows[chunk_id] = _VecRow(
            chunk_id=chunk_id,
            tenant_id=UUID(str(tenant_id)),
            workspace_id=UUID(str(workspace_id)),
            embedding=tuple(float(x) for x in embedding),
            payload=dict(payload or {}),
        )

    async def delete(self, *, tenant_id: TenantId, chunk_id: KnowledgeChunkId) -> None:
        self._rows.pop(chunk_id, None)

    async def delete_for_asset(
        self, *, tenant_id: TenantId, asset_id: KnowledgeAssetId
    ) -> int:
        target = str(asset_id)
        remove = [
            cid for cid, row in self._rows.items() if row.payload.get("asset_id") == target
        ]
        for cid in remove:
            self._rows.pop(cid, None)
        return len(remove)

    async def delete_for_package(
        self, *, tenant_id: TenantId, package_id: KnowledgePackageId
    ) -> int:
        target = str(package_id)
        remove = [
            cid
            for cid, row in self._rows.items()
            if row.payload.get("package_id") == target
        ]
        for cid in remove:
            self._rows.pop(cid, None)
        return len(remove)

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
    ) -> list[VectorSearchHit]:
        t = UUID(str(tenant_id))
        w = UUID(str(workspace_id))
        scored: list[tuple[float, KnowledgeChunkId]] = []
        for row in self._rows.values():
            if row.tenant_id != t:
                continue
            if workspace_filter_required and row.workspace_id != w:
                continue
            if package_ids and row.payload.get("package_id") not in package_ids:
                continue
            if asset_kind_filter is not None and row.payload.get("asset_kind") != asset_kind_filter.value:
                continue
            score = _cosine(query_embedding, row.embedding)
            scored.append((score, row.chunk_id))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [
            VectorSearchHit(chunk_id=cid, score=score)
            for score, cid in scored[:top_k]
        ]


# ── Repository ───────────────────────────────────────────────────────────


class InMemoryKnowledgeRepository(KnowledgeRepository):
    def __init__(self) -> None:
        self._pkgs: dict[tuple[UUID, KnowledgePackageId], KnowledgePackage] = {}
        self._assets: dict[tuple[UUID, KnowledgeAssetId], KnowledgeAsset] = {}
        self._chunks: dict[tuple[UUID, KnowledgeChunkId], KnowledgeChunk] = {}

    # ---- packages ----
    async def add_package(self, package: KnowledgePackage) -> KnowledgePackage:
        key = (UUID(str(package.tenant_id)), package.id)
        self._pkgs[key] = package
        return package

    async def get_package(
        self, *, tenant_id: TenantId, package_id: KnowledgePackageId
    ) -> KnowledgePackage | None:
        return self._pkgs.get((UUID(str(tenant_id)), package_id))

    async def list_packages(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        limit: int = 50,
    ) -> list[KnowledgePackage]:
        out: list[KnowledgePackage] = []
        ws = UUID(str(workspace_id))
        for (_t, _), pkg in self._pkgs.items():
            if pkg.workspace_id != ws:
                continue
            out.append(pkg)
        out.sort(key=lambda p: p.created_at, reverse=True)
        return out[:limit]

    async def update_package(self, package: KnowledgePackage) -> KnowledgePackage:
        self._pkgs[(UUID(str(package.tenant_id)), package.id)] = package
        return package

    # ---- assets ----
    async def add_asset(self, asset: KnowledgeAsset) -> KnowledgeAsset:
        self._assets[(UUID(str(asset.tenant_id)), asset.id)] = asset
        return asset

    async def get_asset(
        self, *, tenant_id: TenantId, asset_id: KnowledgeAssetId
    ) -> KnowledgeAsset | None:
        return self._assets.get((UUID(str(tenant_id)), asset_id))

    async def list_assets_for_package(
        self,
        *,
        tenant_id: TenantId,
        package_id: KnowledgePackageId,
    ) -> list[KnowledgeAsset]:
        return [
            a
            for (_t, _), a in self._assets.items()
            if a.package_id == package_id
        ]

    async def update_asset(self, asset: KnowledgeAsset) -> KnowledgeAsset:
        self._assets[(UUID(str(asset.tenant_id)), asset.id)] = asset
        return asset

    # ---- chunks ----
    async def add_chunks(self, *, chunks: list[KnowledgeChunk]) -> list[KnowledgeChunk]:
        for chunk in chunks:
            self._chunks[(UUID(str(chunk.tenant_id)), chunk.id)] = chunk
        return chunks

    async def list_chunks_for_asset(
        self,
        *,
        tenant_id: TenantId,
        asset_id: KnowledgeAssetId,
    ) -> list[KnowledgeChunk]:
        return [
            c
            for (_t, _), c in self._chunks.items()
            if c.asset_id == asset_id
        ]

    async def delete_chunks_for_asset(
        self, *, tenant_id: TenantId, asset_id: KnowledgeAssetId
    ) -> int:
        remove = [
            k for k, c in self._chunks.items() if c.asset_id == asset_id
        ]
        for k in remove:
            self._chunks.pop(k, None)
        return len(remove)

    async def delete_chunks_for_package(
        self, *, tenant_id: TenantId, package_id: KnowledgePackageId
    ) -> int:
        remove = [
            k for k, c in self._chunks.items() if c.package_id == package_id
        ]
        for k in remove:
            self._chunks.pop(k, None)
        return len(remove)

    async def find_chunk(
        self, *, tenant_id: TenantId, chunk_id: KnowledgeChunkId
    ) -> KnowledgeChunk | None:
        return self._chunks.get((UUID(str(tenant_id)), chunk_id))


# ── Publisher ────────────────────────────────────────────────────────────


@dataclass
class RecordingPublisher(KnowledgeEventPublisher):
    events: list[object] = field(default_factory=list)

    async def publish(self, event: object) -> None:
        self.events.append(event)


# ── Convenience builder ──────────────────────────────────────────────────


def new_uuid() -> UUID:
    return uuid4()


_ = Iterable  # type-only re-export to silence lints
