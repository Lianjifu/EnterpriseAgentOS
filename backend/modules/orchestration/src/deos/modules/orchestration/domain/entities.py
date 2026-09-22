"""Orchestration domain entities.

Two aggregate roots:

- :class:`Plan` — a persisted, named, version-pinned Plan DSL.  Owns
  its ``entry_dsl`` (serialized JSON) plus the parameters needed to
  re-execute it (max_total_steps).
- :class:`WorkflowRun` — one execution of a plan (or a saved snapshot
  of one).  Stores ``plan_dsl_snapshot`` so historical runs survive a
  later edit to the plan; ``variables`` / ``input`` are the immutable
  parameters supplied at run start; ``final_output`` / ``error_code``
  are populated on terminal status.
- :class:`StepRun` — one row per executed step within a run.  The
  executor emits one before dispatch and updates it on completion.

All entities are frozen dataclasses with ``slots=True``; mutation goes
through :py:meth:`with_status` (etc.) which returns a new instance.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from eos_schema.ids import (
    PlanId,
    StepRunId,
    TenantId,
    UserId,
    WorkflowRunId,
    WorkspaceId,
)

from deos.modules.orchestration.domain.value_objects import (
    StepKind,
    StepLimits,
    StepRunStatus,
    WorkflowRunStatus,
)

DEFAULT_MAX_TOTAL_STEPS = 64


def _utcnow() -> datetime:
    return datetime.now(UTC)


# ── Plan ──────────────────────────────────────────────────────────────────


@dataclass(slots=True, frozen=True)
class Plan:
    """A persisted Plan DSL.

    ``entry_dsl`` is the serialized :class:`PlanDSL` payload exactly as
    accepted at create time (round-trips through pydantic JSON).  The
    executor parses it on every run, so editing the DSL after creation
    does NOT mutate historical runs (which carry their own snapshot).
    """

    id: PlanId
    tenant_id: TenantId
    workspace_id: WorkspaceId
    name: str
    description: str
    entry_dsl: dict[str, Any]
    max_total_steps: int
    metadata: dict[str, Any]
    created_by: UserId
    created_at: datetime
    updated_at: datetime

    @classmethod
    def create(
        cls,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        name: str,
        description: str,
        entry_dsl: dict[str, Any],
        max_total_steps: int,
        metadata: dict[str, Any] | None = None,
        created_by: UserId,
        plan_id: PlanId | None = None,
        now: datetime | None = None,
    ) -> Plan:
        if not name or not name.strip():
            raise ValueError("Plan.name must be non-empty")
        if len(name) > 256:
            raise ValueError("Plan.name must be <= 256 chars")
        if not isinstance(entry_dsl, dict) or not entry_dsl:
            raise ValueError("Plan.entry_dsl must be a non-empty dict")
        if not 1 <= max_total_steps <= 256:
            raise ValueError(
                f"Plan.max_total_steps must be in [1, 256], got {max_total_steps}"
            )
        ts = now or _utcnow()
        return cls(
            id=plan_id or PlanId(uuid4()),
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            name=name,
            description=description,
            entry_dsl=entry_dsl,
            max_total_steps=max_total_steps,
            metadata=dict(metadata or {}),
            created_by=created_by,
            created_at=ts,
            updated_at=ts,
        )

    def step_limits(self) -> StepLimits:
        return StepLimits(max_total_steps=self.max_total_steps)


# ── WorkflowRun ──────────────────────────────────────────────────────────


@dataclass(slots=True, frozen=True)
class WorkflowRun:
    """One execution of a Plan.

    ``idempotency_key`` is optional — duplicate ``(tenant, key)`` pairs
    short-circuit to the original run (handled in the repository, not
    here, because the constraint is partial-unique and SQL-side).
    """

    id: WorkflowRunId
    tenant_id: TenantId
    workspace_id: WorkspaceId
    plan_id: PlanId
    plan_dsl_snapshot: dict[str, Any]
    status: WorkflowRunStatus
    variables: dict[str, Any]
    input: dict[str, Any]
    final_output: dict[str, Any] | None
    error_code: str | None
    trace_id: UUID | None
    idempotency_key: str | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def create(
        cls,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        plan_id: PlanId,
        plan_dsl_snapshot: dict[str, Any],
        variables: dict[str, Any] | None = None,
        input: dict[str, Any] | None = None,
        idempotency_key: str | None = None,
        trace_id: UUID | None = None,
        run_id: WorkflowRunId | None = None,
        now: datetime | None = None,
    ) -> WorkflowRun:
        if idempotency_key is not None and len(idempotency_key) > 128:
            raise ValueError("WorkflowRun.idempotency_key must be <= 128 chars")
        ts = now or _utcnow()
        return cls(
            id=run_id or WorkflowRunId(uuid4()),
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            plan_id=plan_id,
            plan_dsl_snapshot=dict(plan_dsl_snapshot),
            status=WorkflowRunStatus.PENDING,
            variables=dict(variables or {}),
            input=dict(input or {}),
            final_output=None,
            error_code=None,
            trace_id=trace_id,
            idempotency_key=idempotency_key,
            started_at=None,
            finished_at=None,
            created_at=ts,
            updated_at=ts,
        )

    def with_status(
        self,
        status: WorkflowRunStatus,
        *,
        final_output: dict[str, Any] | None = None,
        error_code: str | None = None,
        started_at: datetime | None = None,
        finished_at: datetime | None = None,
        now: datetime | None = None,
    ) -> WorkflowRun:
        ts = now or _utcnow()
        return self.__class__(
            id=self.id,
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            plan_id=self.plan_id,
            plan_dsl_snapshot=self.plan_dsl_snapshot,
            status=status,
            variables=self.variables,
            input=self.input,
            final_output=final_output if final_output is not None else self.final_output,
            error_code=error_code if error_code is not None else self.error_code,
            trace_id=self.trace_id,
            idempotency_key=self.idempotency_key,
            started_at=started_at if started_at is not None else self.started_at,
            finished_at=finished_at if finished_at is not None else self.finished_at,
            created_at=self.created_at,
            updated_at=ts,
        )

    def is_terminal(self) -> bool:
        return self.status in {
            WorkflowRunStatus.SUCCEEDED,
            WorkflowRunStatus.FAILED,
            WorkflowRunStatus.CANCELED,
            WorkflowRunStatus.TIMED_OUT,
        }


# ── StepRun ───────────────────────────────────────────────────────────────


@dataclass(slots=True, frozen=True)
class StepRun:
    """One executed step within a :class:`WorkflowRun`."""

    id: StepRunId
    tenant_id: TenantId
    run_id: WorkflowRunId
    step_id: str
    kind: StepKind
    status: StepRunStatus
    input_rendered: dict[str, Any]
    output: dict[str, Any] | None
    error_code: str | None
    latency_ms: int | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime
    updated_at: datetime
    parent_step_run_id: StepRunId | None = None
    depth: int = 0

    @classmethod
    def start(
        cls,
        *,
        tenant_id: TenantId,
        run_id: WorkflowRunId,
        step_id: str,
        kind: StepKind,
        input_rendered: dict[str, Any] | None = None,
        parent_step_run_id: StepRunId | None = None,
        depth: int = 0,
        now: datetime | None = None,
        step_run_id: StepRunId | None = None,
    ) -> StepRun:
        if not step_id or not step_id.strip():
            raise ValueError("StepRun.step_id must be non-empty")
        if depth < 0:
            raise ValueError("StepRun.depth must be >= 0")
        ts = now or _utcnow()
        return cls(
            id=step_run_id or StepRunId(uuid4()),
            tenant_id=tenant_id,
            run_id=run_id,
            step_id=step_id,
            kind=kind,
            status=StepRunStatus.RUNNING,
            input_rendered=dict(input_rendered or {}),
            output=None,
            error_code=None,
            latency_ms=None,
            started_at=ts,
            finished_at=None,
            created_at=ts,
            updated_at=ts,
            parent_step_run_id=parent_step_run_id,
            depth=depth,
        )

    def with_status(
        self,
        status: StepRunStatus,
        *,
        output: dict[str, Any] | None = None,
        error_code: str | None = None,
        latency_ms: int | None = None,
        finished_at: datetime | None = None,
        now: datetime | None = None,
    ) -> StepRun:
        ts = now or _utcnow()
        return self.__class__(
            id=self.id,
            tenant_id=self.tenant_id,
            run_id=self.run_id,
            step_id=self.step_id,
            kind=self.kind,
            status=status,
            input_rendered=self.input_rendered,
            output=output if output is not None else self.output,
            error_code=error_code if error_code is not None else self.error_code,
            latency_ms=latency_ms if latency_ms is not None else self.latency_ms,
            started_at=self.started_at,
            finished_at=finished_at if finished_at is not None else self.finished_at,
            created_at=self.created_at,
            updated_at=ts,
            parent_step_run_id=self.parent_step_run_id,
            depth=self.depth,
        )


__all__ = [
    "DEFAULT_MAX_TOTAL_STEPS",
    "Plan",
    "StepRun",
    "WorkflowRun",
]