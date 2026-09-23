"""Milvus adapter (Week 10 placeholder).

The interface is fully defined; full implementation arrives with the
production knowledge module. For now, every call raises NotImplementedError.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from eos_vector.store import SearchResult, VectorItem, VectorStore


class MilvusStore(VectorStore):
    def __init__(
        self, *, host: str, port: int = 19530, collection: str = "memory"
    ) -> None:
        self._host = host
        self._port = port
        self._collection = collection

    async def upsert(self, items: list[VectorItem]) -> None:
        raise NotImplementedError(
            "MilvusStore arrives in Week 10 (production cutover)."
        )

    async def search(
        self,
        query: VectorItem,
        *,
        top_k: int = 10,
        filter: dict[str, Any] | None = None,
    ) -> list[SearchResult]:
        raise NotImplementedError(
            "MilvusStore arrives in Week 10 (production cutover)."
        )

    async def delete(self, ids: list[UUID]) -> None:
        raise NotImplementedError(
            "MilvusStore arrives in Week 10 (production cutover)."
        )
