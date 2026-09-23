"""HTTP embedding adapter.

Calls the ``embedding_runtime`` FastAPI service at ``POST /embed``.
Production deployments use this; the openai adapter is for the
embedding_runtime process itself when it talks to OpenAI directly.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

import httpx

from deos.modules.memory.application.ports import EmbeddingPort
from deos.modules.memory.domain.entities import EMBEDDING_DIM


@dataclass(slots=True)
class HttpEmbeddingAdapter(EmbeddingPort):
    base_url: str
    model: str = "text-embedding-3-small"
    dim: int = EMBEDDING_DIM
    timeout_seconds: float = 10.0
    max_batch: int = 64
    api_key: str | None = None
    _client: httpx.AsyncClient | None = field(default=None, init=False, repr=False)

    def _ensure_client(self) -> httpx.AsyncClient:
        if self._client is None:
            headers: dict[str, str] = {}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout_seconds,
                headers=headers,
            )
        return self._client

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        if len(texts) > self.max_batch:
            raise ValueError(
                f"batch too large: {len(texts)} > max_batch={self.max_batch}"
            )

        client = self._ensure_client()
        resp = await client.post(
            "/embed",
            json={"input": texts, "model": self.model, "dim": self.dim},
        )
        resp.raise_for_status()
        body = resp.json()
        embeddings: list[list[float]] = body["embeddings"]
        if len(embeddings) != len(texts):
            raise RuntimeError(
                f"embedding_runtime returned {len(embeddings)} vectors for "
                f"{len(texts)} inputs"
            )
        return embeddings

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None


def default_base_url() -> str:
    return os.environ.get("EMBEDDING_RUNTIME_URL", "http://127.0.0.1:8102")


__all__ = ["HttpEmbeddingAdapter", "default_base_url"]
