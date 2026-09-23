"""Domain ↔ ORM mappers for the orchestration module.

Pure functions; the SQL repositories call these from inside the session.
"""

from __future__ import annotations

from typing import Any

from eos_schema.ids import (
    PlanId,
    StepRunId,
    TenantId,
    UserId,
    WorkflowRunId,
    WorkspaceId,
)

from deos.modules.orchestration.adapter.persistence.models import (
    PlanORM,
    WorkflowRunORM,
    WorkflowStepRunORM,
)
from deos.modules.orchestration.domain.entities import Plan, StepRun, WorkflowRun
from deos.modules.orchestration.domain.value_objects import (
    StepKind,
    StepRunStatus,
    WorkflowRunStatus,
)

# ── Plan ──────────────────────────────────────────────────────────────────


def plan_to_domain(row: PlanORM) -> Plan:
    return Plan(
        id=PlanId(row.id),
        tenant_id=TenantId(row.tenant_id),
        workspace_id=WorkspaceId(row.workspace_id),
        name=row.name,
        description=row.description or "",
        entry_dsl=dict(row.entry_dsl or {}),
        max_total_steps=row.max_total_steps,
        metadata=dict(row.metadata_ or {}),
        created_by=UserId(row.created_by) if row.created_by else None,
        signature=row.signature,
        signer_key_id=row.signer_key_id,
        image_digest=row.image_digest,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def plan_to_orm(entity: Plan) -> PlanORM:
    return PlanORM(
        id=entity.id,
        tenant_id=entity.tenant_id,
        workspace_id=entity.workspace_id,
        name=entity.name,
        description=entity.description,
        entry_dsl=dict(entity.entry_dsl),
        max_total_steps=entity.max_total_steps,
        metadata_=dict(entity.metadata),
        created_by=entity.created_by,
        signature=entity.signature,
        signer_key_id=entity.signer_key_id,
        image_digest=entity.image_digest,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


# ── WorkflowRun ──────────────────────────────────────────────────────────


def workflow_run_to_domain(row: WorkflowRunORM) -> WorkflowRun:
    return WorkflowRun(
        id=WorkflowRunId(row.id),
        tenant_id=TenantId(row.tenant_id),
        workspace_id=WorkspaceId(row.workspace_id),
        plan_id=PlanId(row.plan_id),
        plan_dsl_snapshot=dict(row.plan_dsl_snapshot or {}),
        status=WorkflowRunStatus(row.status),
        variables=dict(row.variables or {}),
        input=dict(row.input or {}),
        final_output=dict(row.final_output) if row.final_output is not None else None,
        error_code=row.error_code,
        trace_id=row.trace_id,
        idempotency_key=row.idempotency_key,
        started_at=row.started_at,
        finished_at=row.finished_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def workflow_run_to_orm(entity: WorkflowRun) -> WorkflowRunORM:
    return WorkflowRunORM(
        id=entity.id,
        tenant_id=entity.tenant_id,
        workspace_id=entity.workspace_id,
        plan_id=entity.plan_id,
        plan_dsl_snapshot=dict(entity.plan_dsl_snapshot),
        status=entity.status.value,
        variables=dict(entity.variables),
        input=dict(entity.input),
        final_output=dict(entity.final_output) if entity.final_output is not None else None,
        error_code=entity.error_code,
        trace_id=entity.trace_id,
        idempotency_key=entity.idempotency_key,
        started_at=entity.started_at,
        finished_at=entity.finished_at,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


# ── StepRun ───────────────────────────────────────────────────────────────


def step_run_to_domain(row: WorkflowStepRunORM) -> StepRun:
    return StepRun(
        id=StepRunId(row.id),
        tenant_id=TenantId(row.tenant_id),
        run_id=WorkflowRunId(row.run_id),
        step_id=row.step_id,
        kind=StepKind(row.kind),
        status=StepRunStatus(row.status),
        input_rendered=dict(row.input_rendered or {}),
        output=dict(row.output) if row.output is not None else None,
        error_code=row.error_code,
        latency_ms=row.latency_ms,
        started_at=row.started_at,
        finished_at=row.finished_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
        parent_step_run_id=(
            StepRunId(row.parent_step_run_id) if row.parent_step_run_id else None
        ),
        depth=row.depth,
    )


def step_run_to_orm(entity: StepRun) -> WorkflowStepRunORM:
    return WorkflowStepRunORM(
        id=entity.id,
        tenant_id=entity.tenant_id,
        run_id=entity.run_id,
        step_id=entity.step_id,
        kind=entity.kind.value,
        status=entity.status.value,
        input_rendered=dict(entity.input_rendered),
        output=dict(entity.output) if entity.output is not None else None,
        error_code=entity.error_code,
        latency_ms=entity.latency_ms,
        started_at=entity.started_at,
        finished_at=entity.finished_at,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
        parent_step_run_id=entity.parent_step_run_id,
        depth=entity.depth,
    )


__all__ = [
    "plan_to_domain",
    "plan_to_orm",
    "step_run_to_domain",
    "step_run_to_orm",
    "workflow_run_to_domain",
    "workflow_run_to_orm",
]

_ = Any  # type-only re-export to keep `Any` import alive