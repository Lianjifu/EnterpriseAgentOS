"""Knowledge domain value objects + retrieval query."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

DEFAULT_CHUNK_SIZE = 800
DEFAULT_CHUNK_OVERLAP = 80
MIN_TOP_K = 1
MAX_TOP_K = 50
MAX_ASSET_BYTES = 20 * 1024 * 1024  # 20 MiB


class KnowledgeAssetKind(StrEnum):
    """Origin type of a knowledge asset."""

    TEXT = "text"
    DOCUMENT = "document"
    WEBPAGE = "webpage"


class KnowledgeAssetStatus(StrEnum):
    """Lifecycle of a single uploaded asset."""

    PENDING = "pending"          # row created; bytes not yet committed
    PROCESSING = "processing"    # chunk + embed in flight
    READY = "ready"              # indexed; searchable
    FAILED = "failed"            # ingest errored; surface error_message
    REVOKED = "revoked"          # soft-deleted; out of vector index


class KnowledgePackageStatus(StrEnum):
    """Lifecycle of a knowledge package."""

    ACTIVE = "active"
    ARCHIVED = "archived"
    REVOKED = "revoked"


@dataclass(slots=True, frozen=True)
class RetrievalQuery:
    """Inputs for a knowledge search operation.

    ``top_k`` is clamped to ``[1, 50]`` (``MIN_TOP_K``/``MAX_TOP_K``).
    Empty query / package_ids of an asset kind that does not match any
    ready asset returns an empty list — the caller does not need to
    handle ``NotFound``.
    """

    query: str
    top_k: int = 10
    package_ids: tuple[str, ...] = ()  # str to keep value object free of eos_schema at boundary
    asset_kind_filter: KnowledgeAssetKind | None = None

    def __post_init__(self) -> None:
        if not self.query or not self.query.strip():
            raise ValueError("RetrievalQuery.query must be non-empty")
        if not MIN_TOP_K <= self.top_k <= MAX_TOP_K:
            raise ValueError(
                f"RetrievalQuery.top_k must be in [{MIN_TOP_K}, {MAX_TOP_K}], "
                f"got {self.top_k}"
            )


__all__ = [
    "DEFAULT_CHUNK_OVERLAP",
    "DEFAULT_CHUNK_SIZE",
    "KnowledgeAssetKind",
    "KnowledgeAssetStatus",
    "KnowledgePackageStatus",
    "MAX_ASSET_BYTES",
    "MAX_TOP_K",
    "MIN_TOP_K",
    "RetrievalQuery",
]
