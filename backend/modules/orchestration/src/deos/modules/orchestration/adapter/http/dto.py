"""HTTP DTOs for the orchestration module's REST surface."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

PlanStatusLiteral = Literal["active", "archived", "revoked"]
WorkflowRunStatusLiteral = Literal[
    "pending", "running", "succeeded", "failed", "timed_out", "canceled"
]
StepRunStatusLiteral = Literal[
    "pending", "running", "succeeded", "failed", "timed_out", "skipped"
]


class CreatePlanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=256)
    description: str = Field(default="", max_length=4096)
    entry_dsl: dict[str, Any]
    max_total_steps: int = Field(default=64, ge=1, le=256)
    metadata: dict[str, Any] = Field(default_factory=dict)


class PlanResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    tenant_id: str
    workspace_id: str
    name: str
    description: str
    entry_dsl: dict[str, Any]
    max_total_steps: int
    metadata: dict[str, Any]
    created_by: str | None
    created_at: str
    updated_at: str


class PlanListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[PlanResponse]
    total: int


class RunPlanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    variables: dict[str, Any] = Field(default_factory=dict)
    input: dict[str, Any] = Field(default_factory=dict)
    idempotency_key: str | None = Field(default=None, max_length=128)


class RunPlanResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    run_id: str
    plan_id: str
    tenant_id: str
    workspace_id: str
    status: WorkflowRunStatusLiteral
    final_output: dict[str, Any]
    error_code: str | None
    started_at: str | None
    finished_at: str | None


class StepRunResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    run_id: str
    step_id: str
    kind: str
    status: StepRunStatusLiteral
    input_rendered: dict[str, Any]
    output: dict[str, Any] | None
    error_code: str | None
    latency_ms: int | None
    started_at: str | None
    finished_at: str | None
    depth: int


class WorkflowRunResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    tenant_id: str
    workspace_id: str
    plan_id: str
    status: WorkflowRunStatusLiteral
    variables: dict[str, Any]
    input: dict[str, Any]
    final_output: dict[str, Any] | None
    error_code: str | None
    idempotency_key: str | None
    trace_id: str | None
    started_at: str | None
    finished_at: str | None
    created_at: str
    updated_at: str


class WorkflowRunWithStepsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    run: WorkflowRunResponse
    step_runs: list[StepRunResponse]


class WorkflowRunListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[WorkflowRunResponse]
    total: int


__all__ = [
    "CreatePlanRequest",
    "PlanListResponse",
    "PlanResponse",
    "PlanStatusLiteral",
    "RunPlanRequest",
    "RunPlanResponse",
    "StepRunResponse",
    "StepRunStatusLiteral",
    "WorkflowRunListResponse",
    "WorkflowRunResponse",
    "WorkflowRunStatusLiteral",
    "WorkflowRunWithStepsResponse",
]