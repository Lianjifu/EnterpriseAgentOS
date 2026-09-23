"""HTTP router for the orchestration module: plans + runs.

Mounts under ``/v1/orchestration`` (FastAPI prefix).  Per-request
service is resolved via :func:`orchestration_service_dependency`.

v1 simplification: ``POST /plans/{id}/runs`` is synchronous — the
WorkflowExecutor blocks until the run reaches a terminal status, and
the response carries the final state plus all step_runs.  Background
execution / SSE streaming land in P10 (see doc 12 §"不在范围内").
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request

from deos.modules.orchestration.adapter.http.dto import (
    CreatePlanRequest,
    PlanListResponse,
    PlanResponse,
    RunPlanRequest,
    RunPlanResponse,
    StepRunResponse,
    WorkflowRunListResponse,
    WorkflowRunResponse,
    WorkflowRunWithStepsResponse,
)
from deos.modules.orchestration.adapter.http.factory import (
    OrchestrationServiceFactory,
)
from deos.modules.orchestration.adapter.http.mappers import (
    plan_to_dto,
    step_run_to_dto,
    workflow_run_to_dto,
)
from deos.modules.orchestration.application.services import OrchestrationService
from deos.modules.orchestration.domain.errors import (
    IdempotencyKeyConflict,
    PlanNameConflict,
    PlanNotFound,
    PlanValidationError,
    WorkflowRunNotFound,
    WorkflowStepTimeout,
    WorkflowTooLarge,
)
from deos.modules.orchestration.domain.value_objects import WorkflowRunStatus


async def orchestration_service_dependency(
    request: Request,
) -> OrchestrationService:
    """Yield a per-request ``OrchestrationService``.

    Production wires ``OrchestrationServiceFactory`` via ``app.state``;
    when the factory is missing we surface 503.
    """
    factory: OrchestrationServiceFactory | None = getattr(
        request.app.state, "orchestration_service_factory", None
    )
    if factory is None:
        raise HTTPException(
            status_code=503,
            detail="orchestration service factory not wired",
        )
    return factory.for_session()


def build_router() -> APIRouter:
    router = APIRouter(prefix="/v1/orchestration", tags=["orchestration"])

    # ── plans ───────────────────────────────────────────────────────────

    @router.post(
        "/plans",
        status_code=201,
        response_model=PlanResponse,
    )
    async def create_plan(
        body: CreatePlanRequest,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        x_user_id: UUID = Header(..., alias="X-User-Id"),  # noqa: B008
        svc: OrchestrationService = Depends(orchestration_service_dependency),  # noqa: B008
    ) -> PlanResponse:
        from eos_schema.ids import UserId

        try:
            plan = await svc.create_plan.execute(  # type: ignore[union-attr]
                tenant_id=x_tenant_id,
                workspace_id=x_workspace_id,
                name=body.name,
                description=body.description,
                entry_dsl=body.entry_dsl,
                max_total_steps=body.max_total_steps,
                metadata=body.metadata,
                created_by=UserId(x_user_id),
                signature=body.signature,
                signer_key_id=body.signer_key_id,
                image_digest=body.image_digest,
            )
        except (PlanValidationError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc))
        except PlanNameConflict as exc:
            raise HTTPException(status_code=409, detail=str(exc))
        return plan_to_dto(plan)

    @router.get(
        "/plans",
        response_model=PlanListResponse,
    )
    async def list_plans(
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        limit: int = Query(50, ge=1, le=200),
        offset: int = Query(0, ge=0),
        svc: OrchestrationService = Depends(orchestration_service_dependency),  # noqa: B008
    ) -> PlanListResponse:
        rows = await svc.list_plans.execute(  # type: ignore[union-attr]
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            limit=limit,
            offset=offset,
        )
        items = [plan_to_dto(r) for r in rows]
        return PlanListResponse(items=items, total=len(items))

    @router.get(
        "/plans/{plan_id}",
        response_model=PlanResponse,
    )
    async def get_plan(
        plan_id: UUID,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        svc: OrchestrationService = Depends(orchestration_service_dependency),  # noqa: B008
    ) -> PlanResponse:
        from eos_schema.ids import PlanId

        plan = await svc.get_plan.execute(  # type: ignore[union-attr]
            tenant_id=x_tenant_id,
            plan_id=PlanId(plan_id),
        )
        if plan is None:
            raise HTTPException(status_code=404, detail="plan not found")
        return plan_to_dto(plan)

    # ── runs ────────────────────────────────────────────────────────────

    @router.post(
        "/plans/{plan_id}/runs",
        response_model=WorkflowRunWithStepsResponse,
    )
    async def run_plan(
        plan_id: UUID,
        body: RunPlanRequest,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        x_user_id: UUID = Header(..., alias="X-User-Id"),  # noqa: B008
        svc: OrchestrationService = Depends(orchestration_service_dependency),  # noqa: B008
    ) -> WorkflowRunWithStepsResponse:
        from eos_schema.ids import PlanId, UserId

        try:
            result = await svc.run_plan.execute(  # type: ignore[union-attr]
                tenant_id=x_tenant_id,
                workspace_id=x_workspace_id,
                plan_id=PlanId(plan_id),
                variables=body.variables,
                input=body.input,
                idempotency_key=body.idempotency_key,
                owner_id=UserId(x_user_id),
            )
        except PlanNotFound as exc:
            raise HTTPException(status_code=404, detail=str(exc))
        except IdempotencyKeyConflict as exc:
            raise HTTPException(status_code=409, detail=str(exc))
        except (PlanValidationError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc))
        except (WorkflowTooLarge, WorkflowStepTimeout) as exc:
            raise HTTPException(status_code=422, detail=str(exc))

        run_dto = workflow_run_to_dto(result.run)
        step_dtos = [step_run_to_dto(s) for s in result.step_runs]
        return WorkflowRunWithStepsResponse(run=run_dto, step_runs=step_dtos)

    @router.get(
        "/runs/{run_id}",
        response_model=WorkflowRunResponse,
    )
    async def get_run(
        run_id: UUID,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        svc: OrchestrationService = Depends(orchestration_service_dependency),  # noqa: B008
    ) -> WorkflowRunResponse:
        from eos_schema.ids import WorkflowRunId

        run = await svc.get_run.execute(  # type: ignore[union-attr]
            tenant_id=x_tenant_id,
            run_id=WorkflowRunId(run_id),
        )
        if run is None:
            raise HTTPException(status_code=404, detail="run not found")
        return workflow_run_to_dto(run)

    @router.get(
        "/runs",
        response_model=WorkflowRunListResponse,
    )
    async def list_runs(
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        plan_id: UUID | None = Query(default=None),  # noqa: B008
        limit: int = Query(50, ge=1, le=200),
        offset: int = Query(0, ge=0),
        svc: OrchestrationService = Depends(orchestration_service_dependency),  # noqa: B008
    ) -> WorkflowRunListResponse:
        from eos_schema.ids import PlanId

        rows = await svc.list_runs.execute(  # type: ignore[union-attr]
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            plan_id=PlanId(plan_id) if plan_id else None,
            limit=limit,
            offset=offset,
        )
        items = [workflow_run_to_dto(r) for r in rows]
        return WorkflowRunListResponse(items=items, total=len(items))

    @router.post(
        "/runs/{run_id}/cancel",
        response_model=WorkflowRunResponse,
    )
    async def cancel_run(
        run_id: UUID,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        svc: OrchestrationService = Depends(orchestration_service_dependency),  # noqa: B008
    ) -> WorkflowRunResponse:
        from eos_schema.ids import WorkflowRunId

        try:
            run = await svc.cancel_run.execute(  # type: ignore[union-attr]
                tenant_id=x_tenant_id,
                run_id=WorkflowRunId(run_id),
            )
        except WorkflowRunNotFound as exc:
            raise HTTPException(status_code=404, detail=str(exc))
        return workflow_run_to_dto(run)

    return router


__all__ = ["build_router", "orchestration_service_dependency"]
_ = (RunPlanResponse, StepRunResponse, WorkflowRunStatus)