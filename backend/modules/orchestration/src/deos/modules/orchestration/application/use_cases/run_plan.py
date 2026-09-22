"""RunPlanUseCase — persists the WorkflowRun row, invokes the executor.

Responsibilities:

- Look up the Plan; 404 if missing in this tenant.
- Honor :class:`IdempotencyKey` (look up existing run by tenant + key).
- Persist a new :class:`WorkflowRun` snapshotting the plan DSL.
- Publish :class:`WorkflowRunStarted` BEFORE invoking the executor
  (the executor itself does NOT publish — keeps its dependency graph
  minimal).
- Invoke :class:`WorkflowExecutor.execute`; persist the resulting
  WorkflowRun via the repository.
- For each :class:`StepRun` produced, publish
  :class:`WorkflowStepCompleted`.
- Publish :class:`WorkflowRunCompleted` at the end.

Run is executed synchronously (blocks until the workflow finishes).  v1
deliberately does not support pause / resume — see plan §"不在范围内".
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any
from uuid import UUID, uuid4

from eos_schema.ids import (
    PlanId,
    TenantId,
    UserId,
    WorkflowRunId,
    WorkspaceId,
)

from deos.modules.orchestration.application.executor import (
    WorkflowExecutionResult,
    WorkflowExecutor,
)
from deos.modules.orchestration.application.ports import (
    OrchestrationEventPublisher,
    PlanRepository,
    WorkflowRunRepository,
)
from deos.modules.orchestration.domain.entities import WorkflowRun
from deos.modules.orchestration.domain.errors import (
    IdempotencyKeyConflict,
    PlanNotFound,
)
from deos.modules.orchestration.domain.events import (
    WorkflowRunCompleted,
    WorkflowRunStarted,
    WorkflowStepCompleted,
)

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class RunPlanUseCase:
    plan_repository: PlanRepository
    run_repository: WorkflowRunRepository
    executor: WorkflowExecutor
    publisher: OrchestrationEventPublisher | None = None
    policy_guard: object | None = None

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        plan_id: PlanId,
        variables: dict[str, Any] | None = None,
        input: dict[str, Any] | None = None,
        idempotency_key: str | None = None,
        owner_id: UserId | None = None,
        trace_id: UUID | None = None,
    ) -> WorkflowExecutionResult:
        # ── 1. resolve plan ──────────────────────────────────────────────
        plan = await self.plan_repository.get(
            tenant_id=tenant_id, plan_id=plan_id
        )
        if plan is None:
            raise PlanNotFound(f"plan {plan_id} not found in tenant {tenant_id}")

        # ── 2. policy gate ───────────────────────────────────────────────
        if self.policy_guard is not None:
            from eos_vault.actor import ActorContext

            await self.policy_guard.check(  # type: ignore[attr-defined]
                actor=ActorContext(
                    tenant_id=tenant_id,
                    workspace_id=workspace_id,
                    principal_id=owner_id,
                ),
                action="orchestration:run:create",
                resource={
                    "plan_id": str(plan_id),
                    "workspace_id": str(workspace_id),
                },
            )

        # ── 3. idempotency check ─────────────────────────────────────────
        if idempotency_key is not None:
            existing = await self.run_repository.get_by_idempotency_key(
                tenant_id=tenant_id, idempotency_key=idempotency_key
            )
            if existing is not None:
                # Honor the partial UQ: reuse the existing run.
                # (IdempotencyKeyConflict is raised by the repo only if
                # the second add collides — i.e. racing inserts.)
                from deos.modules.orchestration.domain.value_objects import (
                    WorkflowRunStatus,
                )

                if existing.status == WorkflowRunStatus.RUNNING:
                    raise IdempotencyKeyConflict(
                        f"idempotency_key {idempotency_key!r} "
                        "is already in flight"
                    )
                return WorkflowExecutionResult(
                    final_output=existing.final_output or {},
                    step_runs=(),
                    run=existing,
                )

        # ── 4. create the WorkflowRun row ─────────────────────────────────
        run = WorkflowRun.create(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            plan_id=plan_id,
            plan_dsl_snapshot=dict(plan.entry_dsl),
            variables=variables,
            input=input,
            idempotency_key=idempotency_key,
            trace_id=trace_id,
        )
        run = await self.run_repository.add(run)

        # ── 5. publish RUN.started ────────────────────────────────────────
        if self.publisher is not None:
            try:
                await self.publisher.publish(
                    WorkflowRunStarted(
                        run_id=run.id,
                        plan_id=run.plan_id,
                        tenant_id=run.tenant_id,
                        workspace_id=run.workspace_id,
                        trace_id=run.trace_id,
                    )
                )
            except Exception:  # pragma: no cover - defensive
                logger.exception(
                    "publish WorkflowRunStarted failed for %s", run.id
                )

        # ── 6. execute ────────────────────────────────────────────────────
        if owner_id is None:
            owner_id = UserId(uuid4())
        result = await self.executor.execute(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            owner_id=owner_id,
            run=run,
            plan=plan,
            policy_guard=self.policy_guard,
        )

        # ── 7. persist terminal WorkflowRun + StepRuns ───────────────────
        saved = await self.run_repository.update(result.run)
        # StepRun updates already happened inside the executor.

        # ── 8. publish per-step + final events ───────────────────────────
        if self.publisher is not None:
            for sr in result.step_runs:
                try:
                    await self.publisher.publish(
                        WorkflowStepCompleted(
                            run_id=sr.run_id,
                            step_run_id=sr.id,
                            step_id=sr.step_id,
                            kind=sr.kind.value,
                            status=sr.status.value,
                            tenant_id=sr.tenant_id,
                            workspace_id=run.workspace_id,
                            error_code=sr.error_code,
                        )
                    )
                except Exception:  # pragma: no cover - defensive
                    logger.exception(
                        "publish WorkflowStepCompleted failed for %s", sr.id
                    )
            try:
                await self.publisher.publish(
                    WorkflowRunCompleted(
                        run_id=saved.id,
                        tenant_id=saved.tenant_id,
                        workspace_id=saved.workspace_id,
                        status=saved.status.value,
                        error_code=saved.error_code,
                        final_output=saved.final_output or {},
                    )
                )
            except Exception:  # pragma: no cover - defensive
                logger.exception(
                    "publish WorkflowRunCompleted failed for %s", saved.id
                )

        # Replace the run on the result with the persisted one.
        return WorkflowExecutionResult(
            final_output=saved.final_output or {},
            step_runs=result.step_runs,
            run=saved,
        )


__all__ = ["RunPlanUseCase"]

# Silence unused-import lint for ids only used in signatures.
_ = (WorkflowRunId,)