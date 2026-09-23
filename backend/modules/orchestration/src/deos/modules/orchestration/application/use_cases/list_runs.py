"""Get run / list runs use cases."""

from __future__ import annotations

from dataclasses import dataclass

from eos_schema.ids import (
    PlanId,
    TenantId,
    WorkflowRunId,
    WorkspaceId,
)

from deos.modules.orchestration.application.ports import WorkflowRunRepository
from deos.modules.orchestration.domain.entities import WorkflowRun


@dataclass(slots=True)
class GetRunUseCase:
    repository: WorkflowRunRepository

    async def execute(
        self, *, tenant_id: TenantId, run_id: WorkflowRunId
    ) -> WorkflowRun | None:
        return await self.repository.get(tenant_id=tenant_id, run_id=run_id)


@dataclass(slots=True)
class ListRunsUseCase:
    repository: WorkflowRunRepository

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        plan_id: PlanId | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[WorkflowRun]:
        return await self.repository.list(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            plan_id=plan_id,
            limit=limit,
            offset=offset,
        )


__all__ = ["GetRunUseCase", "ListRunsUseCase"]
