"""KnowledgeServiceFactory Protocol + DI helpers.

Mirrors ``MemoryServiceFactory`` (P4): the HTTP layer resolves a
per-request :class:`KnowledgeService` via
``app.state.knowledge_service_factory`` so tests can swap in an
in-memory service and production wires SQL + vector + embedding +
object-storage adapters.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from deos.modules.knowledge.application.services import KnowledgeService


@runtime_checkable
class KnowledgeServiceFactory(Protocol):
    """Returns a fresh :class:`KnowledgeService` per request."""

    def for_session(self) -> KnowledgeService: ...


__all__ = ["KnowledgeServiceFactory"]
