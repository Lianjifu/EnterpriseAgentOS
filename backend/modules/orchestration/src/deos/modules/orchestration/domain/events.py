"""Orchestration domain events emitted through the messaging bus."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from eos_kernel.events import DomainEvent
from eos_schema.ids import PlanId, StepRunId, TenantId, WorkflowRunId, WorkspaceId


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _event_id() -> UUID:
    return uuid4()


@dataclass(slots=True, frozen=True)
class PlanCreated(DomainEvent):
    TOPIC = "orchestration.plan.created"

    plan_id: PlanId
    tenant_id: TenantId
    workspace_id: WorkspaceId
    name: str
    event_id: UUID = field(default_factory=_event_id)
    occurred_at: datetime = field(default_factory=_utcnow)
    event_name: str = "orchestration.plan.created"

    def to_payload(self) -> dict[str, Any]:
        return {
            "plan_id": str(self.plan_id),
            "tenant_id": str(self.tenant_id),
            "workspace_id": str(self.workspace_id),
            "name": self.name,
        }


@dataclass(slots=True, frozen=True)
class WorkflowRunStarted(DomainEvent):
    TOPIC = "orchestration.run.started"

    run_id: WorkflowRunId
    plan_id: PlanId
    tenant_id: TenantId
    workspace_id: WorkspaceId
    trace_id: UUID | None = None
    event_id: UUID = field(default_factory=_event_id)
    occurred_at: datetime = field(default_factory=_utcnow)
    event_name: str = "orchestration.run.started"

    def to_payload(self) -> dict[str, Any]:
        return {
            "run_id": str(self.run_id),
            "plan_id": str(self.plan_id),
            "tenant_id": str(self.tenant_id),
            "workspace_id": str(self.workspace_id),
            "trace_id": str(self.trace_id) if self.trace_id else None,
        }


@dataclass(slots=True, frozen=True)
class WorkflowRunCompleted(DomainEvent):
    TOPIC = "orchestration.run.completed"

    run_id: WorkflowRunId
    tenant_id: TenantId
    workspace_id: WorkspaceId
    status: str
    error_code: str | None = None
    final_output: dict[str, Any] = field(default_factory=dict)
    event_id: UUID = field(default_factory=_event_id)
    occurred_at: datetime = field(default_factory=_utcnow)
    event_name: str = "orchestration.run.completed"

    def to_payload(self) -> dict[str, Any]:
        return {
            "run_id": str(self.run_id),
            "tenant_id": str(self.tenant_id),
            "workspace_id": str(self.workspace_id),
            "status": self.status,
            "error_code": self.error_code,
            "final_output": dict(self.final_output),
        }


@dataclass(slots=True, frozen=True)
class WorkflowStepCompleted(DomainEvent):
    TOPIC = "orchestration.step.completed"

    run_id: WorkflowRunId
    step_run_id: StepRunId
    step_id: str
    kind: str
    status: str
    tenant_id: TenantId
    workspace_id: WorkspaceId
    error_code: str | None = None
    event_id: UUID = field(default_factory=_event_id)
    occurred_at: datetime = field(default_factory=_utcnow)
    event_name: str = "orchestration.step.completed"

    def to_payload(self) -> dict[str, Any]:
        return {
            "run_id": str(self.run_id),
            "step_run_id": str(self.step_run_id),
            "step_id": self.step_id,
            "kind": self.kind,
            "status": self.status,
            "tenant_id": str(self.tenant_id),
            "workspace_id": str(self.workspace_id),
            "error_code": self.error_code,
        }


__all__ = [
    "PlanCreated",
    "WorkflowRunCompleted",
    "WorkflowRunStarted",
    "WorkflowStepCompleted",
]