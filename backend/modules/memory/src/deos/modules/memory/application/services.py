"""MemoryService — composition root for memory use cases.

Mirrors the SkillService pattern from P3: a dataclass holds the ports
and lazily wires the use cases. ``from_parts`` is the factory used by
the composition root in the FastAPI app.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from eos_schema.ids import MemoryEntryId, TenantId, UserId, WorkspaceId

from deos.modules.memory.application.memory_service_port import (
    MemoryHit,
    MemoryServicePort,
)
from deos.modules.memory.application.ports import (
    EmbeddingPort,
    MemoryEventPublisher,
    MemoryRepository,
    VectorSearchPort,
)
from deos.modules.memory.application.use_cases import (
    GetMemoryUseCase,
    ListMemoriesUseCase,
    PurgeExpiredMemoriesUseCase,
    RecallMemoryUseCase,
    RevokeMemoryUseCase,
    WriteMemoryUseCase,
)
from deos.modules.memory.domain.entities import MemoryEntry
from deos.modules.memory.domain.value_objects import MemoryScope


@dataclass(slots=True)
class MemoryService(MemoryServicePort):
    repository: MemoryRepository
    vector_search: VectorSearchPort
    embedding: EmbeddingPort
    publisher: MemoryEventPublisher | None = None
    policy_guard: object | None = None

    write_memory: WriteMemoryUseCase | None = None
    recall_memory: RecallMemoryUseCase | None = None
    get_memory: GetMemoryUseCase | None = None
    list_memories: ListMemoriesUseCase | None = None
    revoke_memory: RevokeMemoryUseCase | None = None
    purge_expired: PurgeExpiredMemoriesUseCase | None = None

    def __post_init__(self) -> None:
        self.write_memory = WriteMemoryUseCase(
            repository=self.repository,
            vector_search=self.vector_search,
            embedding=self.embedding,
            publisher=self.publisher,
            policy_guard=self.policy_guard,
        )
        self.recall_memory = RecallMemoryUseCase(
            repository=self.repository,
            vector_search=self.vector_search,
            embedding=self.embedding,
            policy_guard=self.policy_guard,
        )
        self.get_memory = GetMemoryUseCase(repository=self.repository)
        self.list_memories = ListMemoriesUseCase(repository=self.repository)
        self.revoke_memory = RevokeMemoryUseCase(
            repository=self.repository,
            vector_search=self.vector_search,
            publisher=self.publisher,
            policy_guard=self.policy_guard,
        )
        self.purge_expired = PurgeExpiredMemoriesUseCase(
            repository=self.repository,
            vector_search=self.vector_search,
            publisher=self.publisher,
        )

    # ---- MemoryServicePort surface ---------------------------------------

    async def recall(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        query: str,
        top_k: int = 10,
        scope_filter: MemoryScope | None = None,
    ) -> list[MemoryHit]:
        assert self.recall_memory is not None  # post_init
        return await self.recall_memory.execute(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            query_text=query,
            top_k=top_k,
            scope_filter=scope_filter,
        )

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
    ) -> MemoryEntry:
        assert self.write_memory is not None
        return await self.write_memory.execute(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            owner_id=owner_id,
            scope=scope,
            content=content,
            metadata=metadata,
            expires_at=expires_at,
        )

    async def revoke(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        memory_id: MemoryEntryId,
        actor_id: UserId,
    ) -> MemoryEntry:
        assert self.revoke_memory is not None
        return await self.revoke_memory.execute(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            memory_id=memory_id,
            actor_id=actor_id,
        )

    # ---- factory --------------------------------------------------------

    @classmethod
    def from_parts(
        cls,
        *,
        repository: MemoryRepository,
        vector_search: VectorSearchPort,
        embedding: EmbeddingPort,
        publisher: MemoryEventPublisher | None = None,
        policy_guard: object | None = None,
    ) -> MemoryService:
        return cls(
            repository=repository,
            vector_search=vector_search,
            embedding=embedding,
            publisher=publisher,
            policy_guard=policy_guard,
        )


__all__ = ["MemoryService"]
