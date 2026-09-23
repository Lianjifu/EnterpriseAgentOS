"""HTTP DTOs for the model module.

Plain Pydantic v2 models — no business logic. Validation runs at the
edge; the service layer trusts the validated input.
"""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ── Credential ─────────────────────────────────────────────────────────────


class RegisterCredentialRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider: Literal["openai", "anthropic", "deepseek", "custom", "mock"]
    label: str = Field(min_length=1, max_length=256)
    api_key: str = Field(min_length=1)
    base_url: str | None = None


class CredentialResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    provider: str
    label: str
    key_version: int
    created_at: str
    rotated_at: str | None


# ── Model ─────────────────────────────────────────────────────────────────


class RegisterModelRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=256)
    provider: Literal["openai", "anthropic", "deepseek", "custom", "mock"]
    upstream_model: str = Field(min_length=1, max_length=256)
    workspace_id: UUID | None = None
    credential_id: UUID | None = None
    routing_policy_id: UUID | None = None


class UpdateModelRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool | None = None
    credential_id: UUID | None = None
    routing_policy_id: UUID | None = None


class ModelResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    workspace_id: UUID | None
    name: str
    provider: str
    upstream_model: str
    enabled: bool
    credential_id: UUID | None
    routing_policy_id: UUID | None
    created_at: str
    updated_at: str


class ModelListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[ModelResponse]


# ── Routing policy ────────────────────────────────────────────────────────


class RegisterRoutingPolicyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    strategy: Literal[
        "priority", "round_robin", "cost_optim", "latency_optim", "tenant_default"
    ]
    primary_model_id: UUID | None = None
    failover_model_ids: list[UUID] = Field(default_factory=list)
    selection_rules: dict[str, Any] = Field(default_factory=dict)


class RoutingPolicyResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    strategy: str
    primary_model_id: UUID | None
    failover_model_ids: list[UUID]
    selection_rules: dict[str, Any]
    version_lock: int


# ── Invoke ────────────────────────────────────────────────────────────────


class InvokeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    messages: list[dict[str, Any]]
    temperature: float = 1.0
    max_tokens: int | None = None


class InvokeResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    model: str
    message: dict[str, Any]
    finish_reason: str
    usage: dict[str, int]


__all__ = [
    "CredentialResponse",
    "InvokeRequest",
    "InvokeResponse",
    "ModelListResponse",
    "ModelResponse",
    "RegisterCredentialRequest",
    "RegisterModelRequest",
    "RegisterRoutingPolicyRequest",
    "RoutingPolicyResponse",
    "UpdateModelRequest",
]