"""Domain → DTO mappers for orchestration HTTP."""

from __future__ import annotations

from deos.modules.orchestration.adapter.http.dto import (
    PlanResponse,
    RunPlanResponse,
    StepRunResponse,
    WorkflowRunResponse,
)
from deos.modules.orchestration.domain.entities import (
    Plan,
    StepRun,
    WorkflowRun,
)


def _iso(dt) -> str | None:  # type: ignore[no-untyped-def]
    return dt.isoformat() if dt is not None else None


def plan_to_dto(plan: Plan) -> PlanResponse:
    return PlanResponse(
        id=str(plan.id),
        tenant_id=str(plan.tenant_id),
        workspace_id=str(plan.workspace_id),
        name=plan.name,
        description=plan.description,
        entry_dsl=dict(plan.entry_dsl),
        max_total_steps=plan.max_total_steps,
        metadata=dict(plan.metadata),
        created_by=str(plan.created_by) if plan.created_by else None,
        signature=plan.signature,
        signer_key_id=plan.signer_key_id,
        image_digest=plan.image_digest,
        created_at=_iso(plan.created_at),
        updated_at=_iso(plan.updated_at),
    )


def step_run_to_dto(step: StepRun) -> StepRunResponse:
    return StepRunResponse(
        id=str(step.id),
        run_id=str(step.run_id),
        step_id=step.step_id,
        kind=step.kind.value,
        status=step.status.value,  # type: ignore[arg-type]
        input_rendered=dict(step.input_rendered),
        output=dict(step.output) if step.output is not None else None,
        error_code=step.error_code,
        latency_ms=step.latency_ms,
        started_at=_iso(step.started_at),
        finished_at=_iso(step.finished_at),
        depth=step.depth,
    )


def workflow_run_to_dto(run: WorkflowRun) -> WorkflowRunResponse:
    return WorkflowRunResponse(
        id=str(run.id),
        tenant_id=str(run.tenant_id),
        workspace_id=str(run.workspace_id),
        plan_id=str(run.plan_id),
        status=run.status.value,  # type: ignore[arg-type]
        variables=dict(run.variables),
        input=dict(run.input),
        final_output=dict(run.final_output) if run.final_output is not None else None,
        error_code=run.error_code,
        idempotency_key=run.idempotency_key,
        trace_id=str(run.trace_id) if run.trace_id else None,
        started_at=_iso(run.started_at),
        finished_at=_iso(run.finished_at),
        created_at=_iso(run.created_at),
        updated_at=_iso(run.updated_at),
    )


def workflow_run_to_run_response(run: WorkflowRun, plan_id: str) -> RunPlanResponse:
    return RunPlanResponse(
        run_id=str(run.id),
        plan_id=plan_id,
        tenant_id=str(run.tenant_id),
        workspace_id=str(run.workspace_id),
        status=run.status.value,  # type: ignore[arg-type]
        final_output=dict(run.final_output) if run.final_output else {},
        error_code=run.error_code,
        started_at=_iso(run.started_at),
        finished_at=_iso(run.finished_at),
    )


__all__ = [
    "plan_to_dto",
    "step_run_to_dto",
    "workflow_run_to_dto",
    "workflow_run_to_run_response",
]
