"""In-memory test doubles for the memory application ports.

These fakes implement the Protocols from
``deos.modules.memory.application.ports`` so the use cases can be
unit-tested without SQLAlchemy / pgvector / httpx.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4

from eos_schema.ids import MemoryEntryId, TenantId, WorkspaceId

from deos.modules.memory.application.ports import (
    EmbeddingPort,
    MemoryEventPublisher,
    MemoryRepository,
    VectorSearchHit,
    VectorSearchPort,
)
from deos.modules.memory.domain.entities import EMBEDDING_DIM, MemoryEntry
from deos.modules.memory.domain.value_objects import MemoryScope

# ----- EmbeddingPort --------------------------------------------------------


class DeterministicEmbedding(EmbeddingPort):
    """Maps each input string to a deterministic 1536-dim unit vector.

    Two texts that share a hash bucket get similar vectors; unrelated
    texts get vectors with cosine distance ~1.  Good enough to make
    recall sort hit lists correctly under unit tests.
    """

    def __init__(self, dim: int = EMBEDDING_DIM) -> None:
        self._dim = dim

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return [_text_to_vector(t, self._dim) for t in texts]


def _text_to_vector(text: str, dim: int) -> list[float]:
    """Hash → bucket → small dense vector.  Pure function; no RNG."""
    vec = [0.0] * dim
    for token in text.split():
        h = abs(hash(token)) % dim
        vec[h] += 1.0
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


# ----- MemoryRepository -----------------------------------------------------


class InMemoryMemoryRepository(MemoryRepository):
    def __init__(self) -> None:
        self._rows: dict[MemoryEntryId, MemoryEntry] = {}

    async def add(self, entry: MemoryEntry) -> MemoryEntry:
        self._rows[entry.id] = entry
        return entry

    async def get(
        self, *, tenant_id: TenantId, memory_id: MemoryEntryId
    ) -> MemoryEntry | None:
        row = self._rows.get(memory_id)
        if row is None or row.tenant_id != tenant_id:
            return None
        return row

    async def list(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        scope: MemoryScope | None = None,
        limit: int = 50,
    ) -> list[MemoryEntry]:
        rows: list[MemoryEntry] = []
        for row in self._rows.values():
            if row.tenant_id != tenant_id or row.workspace_id != workspace_id:
                continue
            if scope is not None and row.scope != scope:
                continue
            rows.append(row)
        rows.sort(key=lambda r: r.created_at)
        return rows[:limit]

    async def update(self, entry: MemoryEntry) -> MemoryEntry:
        self._rows[entry.id] = entry
        return entry

    async def revoke(
        self, *, tenant_id: TenantId, memory_id: MemoryEntryId
    ) -> MemoryEntry:
        row = self._rows.get(memory_id)
        assert row is not None and row.tenant_id == tenant_id
        revoked = row.revoke()
        self._rows[memory_id] = revoked
        return revoked

    async def purge_expired(self, *, tenant_id: TenantId, now: datetime) -> int:
        to_drop = [
            mid
            for mid, row in self._rows.items()
            if row.tenant_id == tenant_id
            and row.expires_at is not None
            and row.expires_at <= now
        ]
        for mid in to_drop:
            del self._rows[mid]
        return len(to_drop)


# ----- VectorSearchPort -----------------------------------------------------


class InMemoryVectorSearch(VectorSearchPort):
    """Brute-force cosine similarity over the in-memory embeddings."""

    def __init__(self) -> None:
        self._index: dict[
            MemoryEntryId, tuple[TenantId, WorkspaceId, tuple[float, ...]]
        ] = {}

    async def upsert(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        memory_id: MemoryEntryId,
        embedding: tuple[float, ...],
        scope: MemoryScope | None = None,
    ) -> None:
        _ = scope
        self._index[memory_id] = (tenant_id, workspace_id, embedding)

    async def delete(self, *, tenant_id: TenantId, memory_id: MemoryEntryId) -> None:
        row = self._index.get(memory_id)
        if row is not None and row[0] == tenant_id:
            del self._index[memory_id]

    async def search(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        query_embedding: tuple[float, ...],
        top_k: int,
        scope_filter: MemoryScope | None = None,
    ) -> list[VectorSearchHit]:
        scored: list[tuple[float, MemoryEntryId]] = []
        for mid, (tid, wid, vec) in self._index.items():
            if tid != tenant_id or wid != workspace_id:
                continue
            # scope_filter ignored here — in-memory test only has embeddings,
            # not scope metadata. Use the SQL adapter for real filtering.
            _ = scope_filter
            sim = _cosine(query_embedding, vec)
            scored.append((sim, mid))
        scored.sort(key=lambda t: t[0], reverse=True)
        return [
            VectorSearchHit(memory_id=mid, score=sim) for sim, mid in scored[:top_k]
        ]


def _cosine(a: tuple[float, ...], b: tuple[float, ...]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(x * x for x in b)) or 1.0
    return dot / (na * nb)


# ----- MemoryEventPublisher -------------------------------------------------


@dataclass
class RecordingPublisher(MemoryEventPublisher):
    """Captures every event passed to ``publish`` for assertions."""

    events: list[object] = field(default_factory=list)

    async def publish(self, event: object) -> None:
        self.events.append(event)


# helper for tests ---------------------------------------------------------


def new_uuid() -> UUID:
    return uuid4()
