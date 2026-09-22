"""Adapter wiring the knowledge module's ``KnowledgeService`` into
agent_runtime's ``KnowledgePort`` Protocol.

Mirrors ``MemoryServiceAdapter`` (P4). The agent_runtime declares a
forward-compat ``KnowledgePort`` Protocol so the use-case layer can be
wired against an interface; this adapter is the concrete bridge.
"""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from deos.modules.knowledge.application.services import KnowledgeService


class KnowledgeServiceAdapter:
    """Adapts ``KnowledgeService`` → ``KnowledgePort``.

    ``KnowledgeService.search_query`` already returns a list of plain
    dicts with ``id`` / ``asset_id`` / ``package_id`` / ``package_name``
    / ``asset_name`` / ``content`` / ``score`` / ``ordinal`` keys, so
    the adapter is a thin pass-through. Empty results mean "no recall
    context available" — never an error.
    """

    def __init__(self, knowledge_service: KnowledgeService) -> None:
        self._service = knowledge_service

    async def search(
        self,
        *,
        tenant_id: UUID,
        workspace_id: UUID,
        query: str,
        top_k: int,
        package_ids: tuple[UUID, ...] = (),
    ) -> list[dict]:
        rows = await self._service.search_query(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            query=query,
            top_k=top_k,
            package_ids=tuple(str(p) for p in package_ids),
        )
        return rows


class KnowledgePort(Protocol):
    async def search(
        self,
        *,
        tenant_id: UUID,
        workspace_id: UUID,
        query: str,
        top_k: int,
        package_ids: tuple[UUID, ...] = (),
    ) -> list[dict]: ...


__all__ = ["KnowledgeServiceAdapter"]
