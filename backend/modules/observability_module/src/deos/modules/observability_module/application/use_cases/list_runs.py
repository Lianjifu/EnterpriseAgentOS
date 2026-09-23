"""list_runs — paginated retrieval of :class:`RunRecord`s.

Tenant isolation: ``workspace_id`` may be ``None`` to list all
workspaces for the tenant (admin only).  When provided, the query is
narrowed to that workspace.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from eos_schema.ids import TenantId, WorkspaceId

from deos.modules.observability_module.domain.entities import RunRecord
from deos.modules.observability_module.domain.value_objects import RunType

if TYPE_CHECKING:
    from deos.modules.observability_module.application.services import (
        ObservabilityService,
    )


def build(service: ObservabilityService) -> Any:
    async def execute(
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId | None,
        run_type: RunType | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[RunRecord]:
        return await service.run_repo.list(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            run_type=run_type,
            limit=limit,
            offset=offset,
        )

    return execute


__all__ = ["build"]
