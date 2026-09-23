"""CreatePlanUseCase.

Validates the Plan DSL (via :class:`PlanDSL`), enforces name uniqueness
inside the workspace, and persists the new :class:`Plan`.  Raises
:class:`PlanNameConflict` on collision and :class:`PlanValidationError`
on a malformed DSL.

Tier B: funnels every plan creation through a :class:`PlanVetter` so
unsigned / untrusted packs are rejected before they land in the DB.  The
vetter is a port — production wiring decides whether it's a no-op
(``EOS_PLAN_SIGNING_MODE=disabled``), file-backed (``local``), or
in-memory (tests).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from eos_schema.ids import PlanId, TenantId, UserId, WorkspaceId

from deos.modules.orchestration.application.dsl import (
    PlanDSL,
    assert_dsl_size,
    plan_dsl_to_json_size,
)
from deos.modules.orchestration.application.ports import (
    OrchestrationEventPublisher,
    PlanRepository,
)
from deos.modules.orchestration.application.vetter import PlanVetter
from deos.modules.orchestration.domain.entities import Plan
from deos.modules.orchestration.domain.events import PlanCreated

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class CreatePlanUseCase:
    repository: PlanRepository
    publisher: OrchestrationEventPublisher | None = None
    policy_guard: object | None = None
    vetter: PlanVetter | None = None

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        name: str,
        description: str,
        entry_dsl: dict[str, Any],
        max_total_steps: int = 64,
        metadata: dict[str, Any] | None = None,
        created_by: UserId | None = None,
        plan_id: PlanId | None = None,
        signature: str = "",
        signer_key_id: str = "",
        image_digest: str = "",
    ) -> Plan:
        # Policy gate (optional).
        if self.policy_guard is not None:
            from eos_vault.actor import ActorContext

            await self.policy_guard.check(  # type: ignore[attr-defined]
                actor=ActorContext(
                    tenant_id=tenant_id,
                    workspace_id=workspace_id,
                    principal_id=created_by,
                ),
                action="orchestration:plan:create",
                resource={"workspace_id": str(workspace_id)},
            )

        # Validate the DSL boundary.
        PlanDSL.model_validate(entry_dsl)
        assert_dsl_size(entry_dsl)
        # Defensive: also check size via the json helper.
        _ = plan_dsl_to_json_size(entry_dsl)

        # Name uniqueness inside tenant.
        existing = await self.repository.get_by_name(tenant_id=tenant_id, name=name)
        if existing is not None:
            from deos.modules.orchestration.domain.errors import PlanNameConflict

            raise PlanNameConflict(f"plan name {name!r} already exists in tenant")

        plan = Plan.create(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            name=name,
            description=description,
            entry_dsl=entry_dsl,
            max_total_steps=max_total_steps,
            metadata=metadata,
            created_by=created_by or UserId(__import__("uuid").uuid4()),  # type: ignore[arg-type]
            plan_id=plan_id,
            signature=signature,
            signer_key_id=signer_key_id,
            image_digest=image_digest,
        )
        # Vetter runs BEFORE the persistence write so unsigned /
        # untrusted plans never reach the DB.
        if self.vetter is not None:
            await self.vetter.vet(plan)

        saved = await self.repository.add(plan)

        if self.publisher is not None:
            try:
                await self.publisher.publish(
                    PlanCreated(
                        plan_id=saved.id,
                        tenant_id=saved.tenant_id,
                        workspace_id=saved.workspace_id,
                        name=saved.name,
                    )
                )
            except Exception:  # pragma: no cover - defensive
                logger.exception("publish PlanCreated failed for %s", saved.id)

        return saved


__all__ = ["CreatePlanUseCase"]
