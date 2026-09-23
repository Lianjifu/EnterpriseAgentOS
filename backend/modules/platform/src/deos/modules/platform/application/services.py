"""Platform use case implementations."""

from __future__ import annotations

from dataclasses import dataclass

from deos.modules.platform.application.ports import (
    PlanRepository,
    PlatformEventPublisher,
    SubscriptionRepository,
    TenantSettingRepository,
)


@dataclass(slots=True)
class PlatformService:
    plan_repo: PlanRepository
    subscription_repo: SubscriptionRepository
    setting_repo: TenantSettingRepository
    publisher: PlatformEventPublisher | None = None

    @classmethod
    def from_parts(
        cls,
        *,
        plan_repo: PlanRepository,
        subscription_repo: SubscriptionRepository,
        setting_repo: TenantSettingRepository,
        publisher: PlatformEventPublisher | None = None,
    ) -> PlatformService:
        return cls(
            plan_repo=plan_repo,
            subscription_repo=subscription_repo,
            setting_repo=setting_repo,
            publisher=publisher,
        )


__all__ = ["PlatformService"]