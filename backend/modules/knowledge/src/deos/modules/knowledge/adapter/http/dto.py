"""HTTP DTOs for the knowledge module's REST surface."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

AssetKindLiteral = Literal["text", "document", "webpage"]
AssetStatusLiteral = Literal[
    "pending", "processing", "ready", "failed", "revoked"
]
PackageStatusLiteral = Literal["active", "archived", "revoked"]


class CreateKnowledgePackageRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=128)
    description: str = Field(default="", max_length=4096)
    metadata: dict[str, str] = Field(default_factory=dict)


class KnowledgePackageResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    tenant_id: str
    workspace_id: str
    name: str
    description: str
    status: PackageStatusLiteral
    asset_count: int
    metadata: dict[str, str]
    created_by: str | None
    created_at: str
    updated_at: str


class KnowledgePackageListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[KnowledgePackageResponse]
    total: int


class UploadAssetRequest(BaseModel):
    """Multipart-form / JSON hybrid; bytes flow through ``data_b64`` for
    JSON callers.  Multipart callers use ``UploadAssetForm`` instead."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=256)
    kind: AssetKindLiteral
    mime_type: str = Field(default="application/octet-stream", max_length=128)
    metadata: dict[str, str] = Field(default_factory=dict)


class AssetTextRequest(BaseModel):
    """Inline-text ingest — no object-storage hop when text fits below
    ``max_inline_bytes``."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=256)
    text: str = Field(min_length=1, max_length=512 * 1024)
    mime_type: str = Field(default="text/plain", max_length=128)
    metadata: dict[str, str] = Field(default_factory=dict)


class KnowledgeAssetResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    tenant_id: str
    workspace_id: str
    package_id: str
    kind: AssetKindLiteral
    name: str
    mime_type: str
    byte_size: int
    storage_uri: str
    status: AssetStatusLiteral
    chunk_count: int
    error_message: str | None
    metadata: dict[str, str]
    created_at: str
    updated_at: str


class KnowledgeAssetListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[KnowledgeAssetResponse]
    total: int


class SearchKnowledgeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=1, max_length=2048)
    top_k: int = Field(default=10, ge=1, le=50)
    package_ids: list[str] = Field(default_factory=list)
    asset_kind: AssetKindLiteral | None = None


class SearchKnowledgeHit(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    asset_id: str
    package_id: str
    package_name: str
    asset_name: str
    content: str
    score: float
    ordinal: int


class SearchKnowledgeResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str
    top_k: int
    results: list[SearchKnowledgeHit]


__all__ = [
    "AssetKindLiteral",
    "AssetStatusLiteral",
    "AssetTextRequest",
    "CreateKnowledgePackageRequest",
    "KnowledgeAssetListResponse",
    "KnowledgeAssetResponse",
    "KnowledgePackageListResponse",
    "KnowledgePackageResponse",
    "PackageStatusLiteral",
    "SearchKnowledgeHit",
    "SearchKnowledgeRequest",
    "SearchKnowledgeResponse",
    "UploadAssetRequest",
]
