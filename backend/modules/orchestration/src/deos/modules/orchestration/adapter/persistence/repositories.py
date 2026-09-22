"""Async-SQLAlchemy implementation of the orchestration ports.

- :class:`SqlPlanRepository`        — plans
- :class:`SqlWorkflowRunRepository` — workflow_runs + partial-UQ idempotency
- :class:`SqlStepRunRepository`     — workflow_step_runs

The repositories write via the injected ``AsyncSession``.  Event emission
goes through ``OrchestrationEventPublisher`` from the application layer
(use cases own event publication).
"""

from __future__ import annotations

from eos_schema.ids import (
    PlanId,
    TenantId,
    WorkflowRunId,
    WorkspaceId,
)
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from deos.modules.orchestration.adapter.persistence.mappers import (
    plan_to_domain,
    plan_to_orm,
    step_run_to_domain,
    step_run_to_orm,
    workflow_run_to_domain,
    workflow_run_to_orm,
)
from deos.modules.orchestration.adapter.persistence.models import (
    PlanORM,
    WorkflowRunORM,
    WorkflowStepRunORM,
)
from deos.modules.orchestration.application.ports import (
    PlanRepository,
    StepRunRepository,
    WorkflowRunRepository,
)
from deos.modules.orchestration.domain.entities import Plan, StepRun, WorkflowRun
from deos.modules.orchestration.domain.errors import (
    IdempotencyKeyConflict,
    PlanNameConflict,
)

# ── PlanRepository ────────────────────────────────────────────────────────


class SqlPlanRepository(PlanRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(
        self, *, tenant_id: TenantId, plan_id: PlanId
    ) -> Plan | None:
        result = await self._session.execute(
            select(PlanORM).where(
                PlanORM.tenant_id == tenant_id,
                PlanORM.id == plan_id,
            )
        )
        row = result.scalar_one_or_none()
        return plan_to_domain(row) if row is not None else None

    async def get_by_name(
        self, *, tenant_id: TenantId, name: str
    ) -> Plan | None:
        result = await self._session.execute(
            select(PlanORM).where(
                PlanORM.tenant_id == tenant_id,
                PlanORM.name == name,
            )
        )
        row = result.scalar_one_or_none()
        return plan_to_domain(row) if row is not None else None

    async def list(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Plan]:
        if limit <= 0:
            raise ValueError("limit must be > 0")
        result = await self._session.execute(
            select(PlanORM)
            .where(
                PlanORM.tenant_id == tenant_id,
                PlanORM.workspace_id == workspace_id,
            )
            .order_by(PlanORM.created_at.desc())
            .limit(limit)
            .offset(max(0, offset))
        )
        return [plan_to_domain(r) for r in result.scalars().all()]

    async def add(self, plan: Plan) -> Plan:
        row = plan_to_orm(plan)
        self._session.add(row)
        try:
            await self._session.flush()
        except IntegrityError as exc:
            await self._session.rollback()
            raise PlanNameConflict(
                f"plan name {plan.name!r} already exists in tenant"
            ) from exc
        return plan_to_domain(row)

    async def delete(self, *, tenant_id: TenantId, plan_id: PlanId) -> bool:
        row = await self._session.get(PlanORM, plan_id)
        if row is None or row.tenant_id != tenant_id:
            return False
        await self._session.delete(row)
        await self._session.flush()
        return True


# ── WorkflowRunRepository ────────────────────────────────────────────────


class SqlWorkflowRunRepository(WorkflowRunRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(
        self, *, tenant_id: TenantId, run_id: WorkflowRunId
    ) -> WorkflowRun | None:
        result = await self._session.execute(
            select(WorkflowRunORM).where(
                WorkflowRunORM.tenant_id == tenant_id,
                WorkflowRunORM.id == run_id,
            )
        )
        row = result.scalar_one_or_none()
        return workflow_run_to_domain(row) if row is not None else None

    async def get_by_idempotency_key(
        self, *, tenant_id: TenantId, idempotency_key: str
    ) -> WorkflowRun | None:
        result = await self._session.execute(
            select(WorkflowRunORM).where(
                WorkflowRunORM.tenant_id == tenant_id,
                WorkflowRunORM.idempotency_key == idempotency_key,
            )
        )
        row = result.scalar_one_or_none()
        return workflow_run_to_domain(row) if row is not None else None

    async def list(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        plan_id: PlanId | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[WorkflowRun]:
        if limit <= 0:
            raise ValueError("limit must be > 0")
        stmt = select(WorkflowRunORM).where(
            WorkflowRunORM.tenant_id == tenant_id,
            WorkflowRunORM.workspace_id == workspace_id,
        )
        if plan_id is not None:
            stmt = stmt.where(WorkflowRunORM.plan_id == plan_id)
        stmt = stmt.order_by(WorkflowRunORM.created_at.desc()).limit(limit).offset(
            max(0, offset)
        )
        result = await self._session.execute(stmt)
        return [workflow_run_to_domain(r) for r in result.scalars().all()]

    async def add(self, run: WorkflowRun) -> WorkflowRun:
        row = workflow_run_to_orm(run)
        self._session.add(row)
        try:
            await self._session.flush()
        except IntegrityError as exc:
            await self._session.rollback()
            if run.idempotency_key is not None:
                raise IdempotencyKeyConflict(
                    f"idempotency_key {run.idempotency_key!r} already in use"
                ) from exc
            raise
        return workflow_run_to_domain(row)

    async def update(self, run: WorkflowRun) -> WorkflowRun:
        existing = await self._session.get(WorkflowRunORM, run.id)
        if existing is None or existing.tenant_id != run.tenant_id:
            raise LookupError(f"workflow_run {run.id} not found")
        existing.status = run.status.value
        existing.variables = dict(run.variables)
        existing.input = dict(run.input)
        existing.final_output = (
            dict(run.final_output) if run.final_output is not None else None
        )
        existing.error_code = run.error_code
        existing.trace_id = run.trace_id
        existing.started_at = run.started_at
        existing.finished_at = run.finished_at
        existing.updated_at = run.updated_at
        await self._session.flush()
        return workflow_run_to_domain(existing)


# ── StepRunRepository ─────────────────────────────────────────────────────


class SqlStepRunRepository(StepRunRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, step: StepRun) -> StepRun:
        row = step_run_to_orm(step)
        self._session.add(row)
        await self._session.flush()
        return step_run_to_domain(row)

    async def update(self, step: StepRun) -> StepRun:
        existing = await self._session.get(WorkflowStepRunORM, step.id)
        if existing is None or existing.tenant_id != step.tenant_id:
            raise LookupError(f"step_run {step.id} not found")
        existing.status = step.status.value
        existing.output = dict(step.output) if step.output is not None else None
        existing.error_code = step.error_code
        existing.latency_ms = step.latency_ms
        existing.finished_at = step.finished_at
        existing.updated_at = step.updated_at
        await self._session.flush()
        return step_run_to_domain(existing)

    async def list_for_run(
        self, *, tenant_id: TenantId, run_id: WorkflowRunId
    ) -> list[StepRun]:
        result = await self._session.execute(
            select(WorkflowStepRunORM)
            .where(
                WorkflowStepRunORM.tenant_id == tenant_id,
                WorkflowStepRunORM.run_id == run_id,
            )
            .order_by(WorkflowStepRunORM.created_at.asc())
        )
        return [step_run_to_domain(r) for r in result.scalars().all()]

    async def delete_for_run(
        self, *, tenant_id: TenantId, run_id: WorkflowRunId
    ) -> int:
        result = await self._session.execute(
            delete(WorkflowStepRunORM)
            .where(
                WorkflowStepRunORM.tenant_id == tenant_id,
                WorkflowStepRunORM.run_id == run_id,
            )
            .execution_options(synchronize_session=False)
        )
        return int(getattr(result, "rowcount", 0) or 0)


__all__ = [
    "SqlPlanRepository",
    "SqlStepRunRepository",
    "SqlWorkflowRunRepository",
]