"""aggregate_costs — placeholder kept for parity with observability HTTP.

platform v1 has no cost source.  Returns an empty list; reserved so
that platform can be extended in P10+ to mirror per-plan usage rollup.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from deos.modules.platform.application.services import PlatformService


def build(service: PlatformService) -> Any:
    async def aggregate(
        *,
        tenant_id: object,
        group_by: str = "cost_type",
        since: object | None = None,
        until: object | None = None,
    ) -> list[dict[str, object]]:
        _ = (service, tenant_id, group_by, since, until)
        return []

    return aggregate


__all__ = ["build"]