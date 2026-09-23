"""HTTP DTOs for the memory module's REST surface."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ScopeLiteral = Literal["user", "agent", "workspace"]


class WriteMemoryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scope: ScopeLiteral
    content: str = Field(min_length=1, max_length=8192)
    metadata: dict[str, str] = Field(default_factory=dict)
    expires_at: datetime | None = None


class RecallRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=1, max_length=2048)
    top_k: int = Field(default=10, ge=1, le=50)
    scope_filter: ScopeLiteral | None = None


class MemoryHitResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    content: str
    scope: ScopeLiteral
    score: float
    created_at: str
    expires_at: str | None = None


class RecallResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    results: list[MemoryHitResponse]
    query: str
    top_k: int


class MemoryEntryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    tenant_id: str
    workspace_id: str
    owner_id: str
    scope: ScopeLiteral
    content: str
    metadata: dict[str, str]
    revoked: bool
    version_lock: int
    embedding_dim: int
    created_at: str
    updated_at: str
    expires_at: str | None = None


class MemoryListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[MemoryEntryResponse]
    total: int


__all__ = [
    "MemoryEntryResponse",
    "MemoryHitResponse",
    "MemoryListResponse",
    "RecallRequest",
    "RecallResponse",
    "ScopeLiteral",
    "WriteMemoryRequest",
]