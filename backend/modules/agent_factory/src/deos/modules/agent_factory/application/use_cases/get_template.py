"""GetAgentTemplateUseCase — fetches a single AgentTemplate by id."""

from __future__ import annotations

from dataclasses import dataclass

from eos_schema.ids import AgentTemplateId, TenantId

from deos.modules.agent_factory.application.ports import AgentTemplateRepository
from deos.modules.agent_factory.domain.entities import AgentTemplate


@dataclass(slots=True)
class GetAgentTemplateUseCase:
    repository: AgentTemplateRepository

    async def execute(
        self, *, tenant_id: TenantId, template_id: AgentTemplateId
    ) -> AgentTemplate:
        tpl = await self.repository.get(tenant_id=tenant_id, template_id=template_id)
        if tpl is None:
            from deos.modules.agent_factory.domain.errors import (
                AgentTemplateNotFound,
            )

            raise AgentTemplateNotFound(
                f"agent template {template_id} not found in tenant"
            )
        return tpl


__all__ = ["GetAgentTemplateUseCase"]
