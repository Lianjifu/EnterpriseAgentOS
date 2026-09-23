"""HTTP-layer DTOs for the skill module."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

NetworkPolicyLiteral = Literal["none", "default", "unrestricted"]
InvocationStatusLiteral = Literal[
    "queued",
    "starting",
    "running",
    "succeeded",
    "failed",
    "cancelled",
    "timed_out",
]


class RegisterSkillRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=128)
    version: str = Field(min_length=1, max_length=32)
    description: str = ""
    entrypoint: str = Field(min_length=1, max_length=256)
    image: str = Field(min_length=1, max_length=256)
    parameters_schema: dict[str, Any] = Field(default_factory=dict)
    artifact_uri: str = ""
    network_policy: NetworkPolicyLiteral = "default"
    cpu_quota: float | None = None
    memory_bytes: int | None = None
    timeout_seconds: int = Field(default=30, ge=1, le=30)
    # A2 signing triple — all three must be set together (enforced in
    # ``SkillPackage.create()``).
    signature: str = ""
    signer_key_id: str = ""
    image_digest: str = ""


class UpdateSkillRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_version_lock: int
    description: str | None = None
    entrypoint: str | None = None
    image: str | None = None
    parameters_schema: dict[str, Any] | None = None
    artifact_uri: str | None = None
    network_policy: NetworkPolicyLiteral | None = None
    cpu_quota: float | None = None
    memory_bytes: int | None = None
    timeout_seconds: int | None = Field(default=None, ge=1, le=30)
    enabled: bool | None = None
    signature: str | None = None
    signer_key_id: str | None = None
    image_digest: str | None = None


class SkillResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    tenant_id: str
    workspace_id: str
    name: str
    version: str
    description: str
    entrypoint: str
    image: str
    parameters_schema: dict[str, Any]
    artifact_uri: str
    network_policy: NetworkPolicyLiteral
    cpu_quota: float | None
    memory_bytes: int | None
    timeout_seconds: int
    enabled: bool
    version_lock: int
    signature: str
    signer_key_id: str
    image_digest: str
    created_at: str
    updated_at: str


class SkillListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[SkillResponse]
    total: int


class InstallSkillResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    install_id: str
    skill_id: str
    run_token: str
    expires_at_ms: int
    jti: str
    status: Literal["installed", "pending", "failed"]


class InvokeSkillRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    arguments: dict[str, Any] = Field(default_factory=dict)
    wait: bool = False
    wait_timeout_seconds: int | None = Field(default=None, ge=1, le=60)


class SkillInvocationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    skill_id: str
    install_id: str
    tenant_id: str
    workspace_id: str
    arguments: dict[str, Any]
    status: InvocationStatusLiteral
    started_at: str
    finished_at: str | None = None
    latency_ms: int | None = None
    result: dict[str, Any] | None = None
    error_code: str | None = None
    error_message: str | None = None
    stdout_tail: str = ""
    stderr_tail: str = ""
    artifact_uri: str | None = None


class SkillInvocationListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[SkillInvocationResponse]
    total: int
