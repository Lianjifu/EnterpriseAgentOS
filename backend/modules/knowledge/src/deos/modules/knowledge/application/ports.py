from abc import ABC, abstractmethod
from uuid import UUID

from deos.modules.knowledge.domain.entities import (
    KnowledgeBase,
    KnowledgeDoc,
    KnowledgeEvalCase,
    KnowledgeSource,
    KnowledgeTask,
)


class KnowledgeCatalogRepository(ABC):
    @abstractmethod
    async def add_kb(self, kb: KnowledgeBase) -> None: ...

    @abstractmethod
    async def get_kb(self, kb_id: UUID) -> KnowledgeBase | None: ...

    @abstractmethod
    async def list_kbs(self, workspace_id: UUID) -> list[KnowledgeBase]: ...

    @abstractmethod
    async def update_kb(self, kb: KnowledgeBase) -> None: ...

    @abstractmethod
    async def add_doc(self, doc: KnowledgeDoc) -> None: ...

    @abstractmethod
    async def get_doc(self, doc_id: UUID) -> KnowledgeDoc | None: ...

    @abstractmethod
    async def list_docs(self, workspace_id: UUID) -> list[KnowledgeDoc]: ...

    @abstractmethod
    async def add_source(self, source: KnowledgeSource) -> None: ...

    @abstractmethod
    async def list_sources(self, workspace_id: UUID) -> list[KnowledgeSource]: ...

    @abstractmethod
    async def list_tasks(self, workspace_id: UUID) -> list[KnowledgeTask]: ...

    @abstractmethod
    async def list_eval_cases(self, workspace_id: UUID) -> list[KnowledgeEvalCase]: ...


__all__ = ["KnowledgeCatalogRepository"]
