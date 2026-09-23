"""ApplyGuard protocol + DirectApplyGuard default implementation.

The :class:`ApplyGuard` is the single chokepoint through which an approved
candidate becomes effective. Production deployments MUST replace
``DirectApplyGuard`` with a guard that targets the specific kind:

- ``MemoryWorkingLayerGuard`` for ``EvolveKind.MEMORY_PROMOTE`` — only
  writes the working layer, never ``core``.
- ``SkillDraftGuard`` for ``EvolveKind.SKILL_PATCH`` — only writes draft
  skill packs, never ``active`` installs.
- ``RoutingDraftGuard`` for ``EvolveKind.ROUTING_HINT`` — only writes
  draft routing policies, never the live routing table.

``DirectApplyGuard`` is a placeholder that records an apply outcome
without doing real work — it is **only** meant for local dev and unit
tests. See ADR-0017 (TODO P10+) for the production swap contract.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable

from eos_schema.ids import TenantId

from deos.modules.self_evolution.domain.entities import EvolveCandidate
from deos.modules.self_evolution.domain.value_objects import EvolveKind


@dataclass(slots=True, frozen=True)
class ApplyOutcome:
    """Structured summary of an apply operation.

    ``summary`` is a free-form dict so each guard can return its own
    domain-specific detail (e.g. memory working-layer row ids, skill
    draft ids, routing policy versions).
    """

    candidate_id: Any  # EvolveCandidateId; Any to keep dataclass slotted
    kind: EvolveKind
    summary: dict[str, Any] = field(default_factory=dict)


@runtime_checkable
class ApplyGuard(Protocol):
    """Single chokepoint for ``EvolutionCandidateService.apply()``."""

    async def apply(
        self, *, tenant_id: TenantId, candidate: EvolveCandidate
    ) -> ApplyOutcome: ...


class DirectApplyGuard:
    """Placeholder guard — records the apply but does NOT mutate any
    production surface. Production deployments MUST swap this for a
    kind-specific guard (see module docstring).
    """

    async def apply(
        self, *, tenant_id: TenantId, candidate: EvolveCandidate
    ) -> ApplyOutcome:
        return ApplyOutcome(
            candidate_id=candidate.id,
            kind=candidate.kind,
            summary={
                "mode": "direct",
                "tenant_id": str(tenant_id),
                "kind": candidate.kind.value,
                "fingerprint": candidate.fingerprint,
            },
        )


__all__ = ["ApplyGuard", "ApplyOutcome", "DirectApplyGuard"]
