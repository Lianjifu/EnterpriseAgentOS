"""FastAPI app factory for the embedding runtime sidecar.

Composition root pattern: ``create_app()`` builds an app with the
selected provider wired into ``app.state.embedding_adapter``.
"""

from __future__ import annotations

import os

from fastapi import FastAPI

from deos.runtimes.embedding_runtime.adapters import EmbeddingAdapter
from deos.runtimes.embedding_runtime.adapters.noop_adapter import NoOpAdapter
from deos.runtimes.embedding_runtime.adapters.openai_adapter import OpenAIAdapter
from deos.runtimes.embedding_runtime.routes import build_router


def _build_adapter(provider: str, *, openai_api_key: str = "") -> EmbeddingAdapter:
    p = provider.lower()
    if p == "noop":
        return NoOpAdapter()
    if p == "openai":
        if not openai_api_key:
            raise RuntimeError("OPENAI_API_KEY required when EMBEDDING_PROVIDER=openai")
        return OpenAIAdapter(api_key=openai_api_key)
    if p == "sbert":
        from deos.runtimes.embedding_runtime.adapters.sbert_adapter import (
            SBERTAdapter,
        )

        return SBERTAdapter()
    raise RuntimeError(f"unknown EMBEDDING_PROVIDER: {provider!r}")


def create_app(
    *,
    provider: str | None = None,
    openai_api_key: str | None = None,
    adapter: EmbeddingAdapter | None = None,
) -> FastAPI:
    """Build the embedding runtime FastAPI app.

    Tests pass ``adapter=`` directly; production passes ``provider=`` and
    ``openai_api_key=`` resolved from the secrets resolver.
    """
    app = FastAPI(title="eos-embedding-runtime", version="0.1.0")
    if adapter is None:
        resolved_provider = provider or os.environ.get("EMBEDDING_PROVIDER", "noop")
        resolved_key = openai_api_key or os.environ.get("OPENAI_API_KEY", "")
        adapter = _build_adapter(resolved_provider, openai_api_key=resolved_key)
    app.state.embedding_adapter = adapter
    app.include_router(build_router())
    return app


__all__ = ["create_app"]
