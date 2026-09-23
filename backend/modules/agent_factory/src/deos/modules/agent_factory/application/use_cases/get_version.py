"""GetAgentVersionUseCase — fetches a single AgentVersion by id."""

from __future__ import annotations

from dataclasses import dataclass

from eos_schema.ids import AgentVersionId, TenantId

from deos.modules.agent_factory.application.ports import AgentVersionRepository
from deos.modules.agent_factory.domain.entities import AgentVersion


@dataclass(slots=True)
class GetAgentVersionUseCase:
    repository: AgentVersionRepository

    async def execute(
        self, *, tenant_id: TenantId, version_id: AgentVersionId
    ) -> AgentVersion:
        ver = await self.repository.get(tenant_id=tenant_id, version_id=version_id)
        if ver is None:
            from deos.modules.agent_factory.domain.errors import (
                AgentVersionNotFound,
            )

            raise AgentVersionNotFound(
                f"agent version {version_id} not found in tenant"
            )
        return ver


__all__ = ["GetAgentVersionUseCase"]
