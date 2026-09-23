"""MemoryServiceFactory Protocol + DI helpers.

Mirrors ``skill_factory`` (P3): the HTTP layer resolves a per-request
``MemoryService`` via ``app.state.memory_service_factory`` so tests can
swap in an in-memory service and production wires SQL + vector + embedding
adapters.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from deos.modules.memory.application.services import MemoryService


@runtime_checkable
class MemoryServiceFactory(Protocol):
    """Returns a fresh ``MemoryService`` per request."""

    def for_session(self) -> MemoryService: ...


__all__ = ["MemoryServiceFactory"]
