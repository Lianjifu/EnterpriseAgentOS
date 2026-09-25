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


class MemoryPolicyResponse(BaseModel):
    """GET /v1/memories/policy response — mirrors frontend MemoryPolicy.

    All fields optional in PATCH; GET returns the full document.
    """

    model_config = ConfigDict(extra="forbid")

    workspace_id: str
    short_term_ttl_hours: int = 24
    working_memory_ttl_days: int = 7
    daily_refinement_time: str = "02:00"
    short_to_working_enabled: bool = True
    working_to_long_enabled: bool = True
    long_to_knowledge_enabled: bool = True
    minimum_confidence: float = 0.6
    long_term_write_approval: bool = True
    sensitive_data_masking: bool = True
    long_term_capacity: int = 50000
    used_capacity: int = 0


class MemoryPolicyUpdateRequest(BaseModel):
    """PATCH /v1/memories/policy body — partial update; unknown fields rejected."""

    model_config = ConfigDict(extra="forbid")

    short_term_ttl_hours: int | None = None
    working_memory_ttl_days: int | None = None
    daily_refinement_time: str | None = None
    short_to_working_enabled: bool | None = None
    working_to_long_enabled: bool | None = None
    long_to_knowledge_enabled: bool | None = None
    minimum_confidence: float | None = None
    long_term_write_approval: bool | None = None
    sensitive_data_masking: bool | None = None
    long_term_capacity: int | None = None
    used_capacity: int | None = None


__all__ = [
    "MemoryEntryResponse",
    "MemoryHitResponse",
    "MemoryListResponse",
    "MemoryPolicyResponse",
    "MemoryPolicyUpdateRequest",
    "RecallRequest",
    "RecallResponse",
    "ScopeLiteral",
    "WriteMemoryRequest",
]
