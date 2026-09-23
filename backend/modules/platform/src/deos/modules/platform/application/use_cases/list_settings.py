"""list_settings — list all settings for a tenant."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from eos_schema.ids import TenantId

from deos.modules.platform.domain.entities import TenantSetting

if TYPE_CHECKING:
    from deos.modules.platform.application.services import PlatformService


def build(service: PlatformService) -> Any:
    async def execute(*, tenant_id: TenantId) -> list[TenantSetting]:
        return await service.setting_repo.list_for_tenant(tenant_id=tenant_id)

    return execute


__all__ = ["build"]
