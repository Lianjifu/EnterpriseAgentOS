"""List plans + get plan by id — thin read use cases."""

from __future__ import annotations

from dataclasses import dataclass

from eos_schema.ids import PlanId, TenantId, WorkspaceId

from deos.modules.orchestration.application.ports import PlanRepository
from deos.modules.orchestration.domain.entities import Plan


@dataclass(slots=True)
class GetPlanUseCase:
    repository: PlanRepository

    async def execute(
        self, *, tenant_id: TenantId, plan_id: PlanId
    ) -> Plan | None:
        return await self.repository.get(tenant_id=tenant_id, plan_id=plan_id)


@dataclass(slots=True)
class ListPlansUseCase:
    repository: PlanRepository

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Plan]:
        return await self.repository.list(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            limit=limit,
            offset=offset,
        )


__all__ = ["GetPlanUseCase", "ListPlansUseCase"]