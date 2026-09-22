"""KnowledgeService — composition root for knowledge use cases.

Mirrors :class:`MemoryService` from P4: a dataclass holds the ports
and lazily wires the use cases. ``from_parts`` is the factory used by
the composition root in the FastAPI app.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from eos_schema.ids import (
    KnowledgeAssetId,
    KnowledgePackageId,
    TenantId,
    UserId,
    WorkspaceId,
)

from deos.modules.knowledge.application.chunker import ChunkerPort
from deos.modules.knowledge.application.ports import (
    EmbeddingPort,
    KnowledgeEventPublisher,
    KnowledgeRepository,
    StoragePort,
    VectorSearchPort,
)
from deos.modules.knowledge.application.use_cases.create_package import (
    CreateKnowledgePackageUseCase,
)
from deos.modules.knowledge.application.use_cases.get_package import (
    GetKnowledgePackageUseCase,
    ListKnowledgePackagesUseCase,
)
from deos.modules.knowledge.application.use_cases.ingest_asset import (
    IngestKnowledgeAssetUseCase,
)
from deos.modules.knowledge.application.use_cases.ingest_text import IngestTextUseCase
from deos.modules.knowledge.application.use_cases.manage_assets import (
    DetachKnowledgeAssetUseCase,
    ListKnowledgeAssetsUseCase,
)
from deos.modules.knowledge.application.use_cases.revoke_package import (
    RevokeKnowledgePackageUseCase,
)
from deos.modules.knowledge.application.use_cases.search_knowledge import (
    SearchKnowledgeUseCase,
)
from deos.modules.knowledge.application.use_cases.upload_asset import (
    UploadKnowledgeAssetUseCase,
)
from deos.modules.knowledge.domain.entities import KnowledgeAsset, KnowledgePackage
from deos.modules.knowledge.domain.value_objects import (
    DEFAULT_CHUNK_OVERLAP,
    DEFAULT_CHUNK_SIZE,
    KnowledgeAssetKind,
    RetrievalQuery,
)


@dataclass(slots=True)
class KnowledgeService:
    repository: KnowledgeRepository
    storage: StoragePort
    embedding: EmbeddingPort
    vector_search: VectorSearchPort
    publisher: KnowledgeEventPublisher | None = None
    chunker: ChunkerPort | None = None
    policy_guard: object | None = None
    default_chunk_size: int = DEFAULT_CHUNK_SIZE
    default_chunk_overlap: int = DEFAULT_CHUNK_OVERLAP

    create_package: CreateKnowledgePackageUseCase | None = None
    get_package: GetKnowledgePackageUseCase | None = None
    list_packages: ListKnowledgePackagesUseCase | None = None
    revoke_package: RevokeKnowledgePackageUseCase | None = None
    upload_asset: UploadKnowledgeAssetUseCase | None = None
    ingest_asset: IngestKnowledgeAssetUseCase | None = None
    ingest_text: IngestTextUseCase | None = None
    list_assets: ListKnowledgeAssetsUseCase | None = None
    detach_asset: DetachKnowledgeAssetUseCase | None = None
    search: SearchKnowledgeUseCase | None = None

    def __post_init__(self) -> None:
        self.create_package = CreateKnowledgePackageUseCase(
            repository=self.repository,
            publisher=self.publisher,
            policy_guard=self.policy_guard,
        )
        self.get_package = GetKnowledgePackageUseCase(repository=self.repository)
        self.list_packages = ListKnowledgePackagesUseCase(repository=self.repository)
        self.revoke_package = RevokeKnowledgePackageUseCase(
            repository=self.repository,
            vector_search=self.vector_search,
            publisher=self.publisher,
            policy_guard=self.policy_guard,
        )
        self.upload_asset = UploadKnowledgeAssetUseCase(
            repository=self.repository,
            storage=self.storage,
            publisher=self.publisher,
            policy_guard=self.policy_guard,
        )
        self.ingest_asset = IngestKnowledgeAssetUseCase(
            repository=self.repository,
            storage=self.storage,
            embedding=self.embedding,
            chunker=self.chunker,
            vector_search=self.vector_search,
            publisher=self.publisher,
            default_chunk_size=self.default_chunk_size,
            default_chunk_overlap=self.default_chunk_overlap,
        )
        self.ingest_text = IngestTextUseCase(
            repository=self.repository,
            storage=self.storage,
            publisher=self.publisher,
            policy_guard=self.policy_guard,
        )
        self.list_assets = ListKnowledgeAssetsUseCase(repository=self.repository)
        self.detach_asset = DetachKnowledgeAssetUseCase(
            repository=self.repository,
            vector_search=self.vector_search,
            publisher=self.publisher,
            policy_guard=self.policy_guard,
        )
        self.search = SearchKnowledgeUseCase(
            repository=self.repository,
            vector_search=self.vector_search,
            embedding=self.embedding,
            policy_guard=self.policy_guard,
        )

    # ---- façade methods --------------------------------------------------

    async def search_query(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        query: str,
        top_k: int = 10,
        package_ids: tuple[str, ...] = (),
        asset_kind: KnowledgeAssetKind | None = None,
    ) -> list[dict[str, Any]]:
        assert self.search is not None  # post_init
        rq = RetrievalQuery(
            query=query,
            top_k=top_k,
            package_ids=package_ids,
            asset_kind_filter=asset_kind,
        )
        return await self.search.execute(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            query=rq,
        )

    # ---- factory --------------------------------------------------------

    @classmethod
    def from_parts(
        cls,
        *,
        repository: KnowledgeRepository,
        storage: StoragePort,
        embedding: EmbeddingPort,
        vector_search: VectorSearchPort,
        publisher: KnowledgeEventPublisher | None = None,
        chunker: ChunkerPort | None = None,
        policy_guard: object | None = None,
        default_chunk_size: int = DEFAULT_CHUNK_SIZE,
        default_chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
    ) -> KnowledgeService:
        return cls(
            repository=repository,
            storage=storage,
            embedding=embedding,
            vector_search=vector_search,
            publisher=publisher,
            chunker=chunker,
            policy_guard=policy_guard,
            default_chunk_size=default_chunk_size,
            default_chunk_overlap=default_chunk_overlap,
        )


__all__ = ["KnowledgeService"]


# Silence "unused import" lints for names only re-exported via __all__.
_ = (
    KnowledgeAsset,
    KnowledgePackage,
    KnowledgeAssetId,
    KnowledgePackageId,
    UserId,
)
