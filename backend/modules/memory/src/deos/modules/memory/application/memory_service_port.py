"""Memory service port — façade the agent_runtime talks to.

The shape mirrors ``agent_runtime.application.ports.MemoryPort`` so a
thin ``MemoryServiceAdapter`` in the agent_runtime module can route
calls straight through.  Keeping the protocol on this side avoids a
hard dependency from agent_runtime onto memory's internals.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Protocol, runtime_checkable

from eos_schema.ids import MemoryEntryId, TenantId, UserId, WorkspaceId

from deos.modules.memory.domain.entities import MemoryEntry
from deos.modules.memory.domain.value_objects import MemoryScope

__all__ = ["MemoryHit", "MemoryServicePort"]


@runtime_checkable
class MemoryServicePort(Protocol):
    """Public façade of the memory module.

    The agent_runtime adapter implements the same surface; the concrete
    implementation is :class:`MemoryService` in ``application.services``.
    """

    async def recall(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        query: str,
        top_k: int = 10,
        scope_filter: MemoryScope | None = None,
    ) -> list[MemoryHit]: ...

    async def write(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        owner_id: UserId,
        scope: MemoryScope,
        content: str,
        metadata: dict[str, Any] | None = None,
        expires_at: datetime | None = None,
    ) -> MemoryEntry: ...

    async def revoke(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        memory_id: MemoryEntryId,
        actor_id: UserId,
    ) -> MemoryEntry: ...


class MemoryHit:
    """Recall result = entry + similarity score."""

    __slots__ = ("entry", "score")

    def __init__(self, entry: MemoryEntry, score: float) -> None:
        self.entry = entry
        self.score = score
