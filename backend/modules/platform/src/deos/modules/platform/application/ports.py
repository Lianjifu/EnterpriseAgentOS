"""Platform application ports (Protocols)."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from eos_schema.ids import (
    PlanId,
    SubscriptionId,
    TenantId,
)

from deos.modules.platform.domain.entities import (
    Plan,
    Subscription,
    TenantSetting,
)


@runtime_checkable
class PlanRepository(Protocol):
    async def get(self, *, plan_id: PlanId) -> Plan | None: ...
    async def get_by_code(self, *, code: str) -> Plan | None: ...
    async def list(
        self, *, status: str | None = None, limit: int = 100, offset: int = 0
    ) -> list[Plan]: ...
    async def add(self, plan: Plan) -> Plan: ...
    async def update(self, plan: Plan) -> Plan: ...


@runtime_checkable
class SubscriptionRepository(Protocol):
    async def get(
        self, *, tenant_id: TenantId, subscription_id: SubscriptionId
    ) -> Subscription | None: ...
    async def get_for_tenant(
        self, *, tenant_id: TenantId
    ) -> Subscription | None: ...
    async def add(self, subscription: Subscription) -> Subscription: ...
    async def update(self, subscription: Subscription) -> Subscription: ...


@runtime_checkable
class TenantSettingRepository(Protocol):
    async def get(
        self, *, tenant_id: TenantId, key: str
    ) -> TenantSetting | None: ...
    async def list_for_tenant(
        self, *, tenant_id: TenantId
    ) -> list[TenantSetting]: ...
    async def upsert(self, setting: TenantSetting) -> TenantSetting: ...


@runtime_checkable
class PlatformEventPublisher(Protocol):
    async def publish(self, event: object) -> None: ...


__all__ = [
    "PlanRepository",
    "PlatformEventPublisher",
    "SubscriptionRepository",
    "TenantSettingRepository",
]