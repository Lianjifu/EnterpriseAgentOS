"""Adapter wiring the memory module's ``MemoryService`` into agent_runtime's
``MemoryPort`` Protocol.

The agent_runtime declares a forward-compat ``MemoryPort`` Protocol so the
use-case layer can be wired against an interface; this adapter is the
concrete bridge between the two modules.
"""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from deos.modules.memory.application.memory_service_port import MemoryServicePort


class MemoryServiceAdapter:
    """Adapts ``MemoryService`` → ``MemoryPort``.

    Returns a list of dicts (matching the agent_runtime ``MemoryPort``
    shape) with ``id``, ``content`` and ``score`` keys so the LLM prompt
    builder can render them as bullet points.
    """

    def __init__(self, memory_service: MemoryServicePort) -> None:
        self._service = memory_service

    async def recall(
        self, *, tenant_id: UUID, workspace_id: UUID, query: str, top_k: int
    ) -> list[dict]:
        hits = await self._service.recall(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            query=query,
            top_k=top_k,
        )
        return [
            {
                "id": str(h.entry.id),
                "content": h.entry.content,
                "score": float(h.score),
                "scope": str(h.entry.scope),
            }
            for h in hits
        ]


# Expose as Protocol for type-checking composition.
class MemoryPort(Protocol):
    async def recall(
        self, *, tenant_id: UUID, workspace_id: UUID, query: str, top_k: int
    ) -> list[dict]: ...


__all__ = ["MemoryServiceAdapter"]
