"""Knowledge module public surface."""

from deos.modules.knowledge.application import KnowledgeService
from deos.modules.knowledge.domain.entities import (
    KnowledgeAsset,
    KnowledgeChunk,
    KnowledgePackage,
)
from deos.modules.knowledge.domain.errors import (
    KnowledgeAssetNotFound,
    KnowledgeError,
    KnowledgePackageNotFound,
    KnowledgeValidationError,
)
from deos.modules.knowledge.domain.value_objects import (
    KnowledgeAssetKind,
    KnowledgeAssetStatus,
    KnowledgePackageStatus,
    RetrievalQuery,
)

__all__ = [
    "KnowledgeAsset",
    "KnowledgeAssetKind",
    "KnowledgeAssetNotFound",
    "KnowledgeAssetStatus",
    "KnowledgeChunk",
    "KnowledgeError",
    "KnowledgePackage",
    "KnowledgePackageNotFound",
    "KnowledgePackageStatus",
    "KnowledgeService",
    "KnowledgeValidationError",
    "RetrievalQuery",
]
