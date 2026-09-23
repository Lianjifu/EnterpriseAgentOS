"""Unit tests for ApplyGuard + DirectApplyGuard."""

from __future__ import annotations

from typing import Any
from uuid import UUID

import pytest

from deos.modules.self_evolution.application.apply_guard import (
    ApplyGuard,
    ApplyOutcome,
    DirectApplyGuard,
)
from deos.modules.self_evolution.domain.entities import EvolveCandidate
from deos.modules.self_evolution.domain.value_objects import EvolveKind

TENANT = UUID(int=1)


def _candidate() -> EvolveCandidate:
    return EvolveCandidate.create(
        tenant_id=TENANT,  # type: ignore[arg-type]
        kind=EvolveKind.MEMORY_PROMOTE,
        payload={"key": "alpha"},
        confidence=0.7,
        trigger_reason="post-turn",
    )


@pytest.mark.asyncio
async def test_direct_apply_guard_returns_outcome() -> None:
    cand = _candidate()
    outcome = await DirectApplyGuard().apply(
        tenant_id=TENANT, candidate=cand  # type: ignore[arg-type]
    )
    assert isinstance(outcome, ApplyOutcome)
    assert outcome.candidate_id == cand.id
    assert outcome.kind is cand.kind
    assert outcome.summary["mode"] == "direct"
    assert outcome.summary["kind"] == "memory_promote"


@pytest.mark.asyncio
async def test_direct_apply_guard_is_swappable() -> None:
    """ApplyGuard is a Protocol — a custom impl must satisfy it."""

    class _TraceGuard(ApplyGuard):
        def __init__(self) -> None:
            self.calls: list[tuple[UUID, EvolveKind]] = []

        async def apply(  # type: ignore[override]
            self, *, tenant_id: UUID, candidate: EvolveCandidate
        ) -> ApplyOutcome:
            self.calls.append((tenant_id, candidate.kind))
            return ApplyOutcome(
                candidate_id=candidate.id,
                kind=candidate.kind,
                summary={"traced": True},
            )

    guard = _TraceGuard()
    cand = _candidate()
    out = await guard.apply(tenant_id=TENANT, candidate=cand)  # type: ignore[arg-type]
    assert guard.calls == [(TENANT, cand.kind)]
    assert out.summary == {"traced": True}


def test_apply_guard_protocol_recognises_direct() -> None:
    """``isinstance`` on a runtime_checkable Protocol returns True for direct impl."""
    assert isinstance(DirectApplyGuard(), ApplyGuard)


@pytest.mark.asyncio
async def test_apply_outcome_summary_is_isolated_per_call() -> None:
    """The summary dict in one call must not bleed into another."""
    guard = DirectApplyGuard()
    cand1 = _candidate()
    cand2 = _candidate()
    out1 = await guard.apply(tenant_id=TENANT, candidate=cand1)  # type: ignore[arg-type]
    out2 = await guard.apply(tenant_id=TENANT, candidate=cand2)  # type: ignore[arg-type]
    out1.summary["mutated"] = True  # type: ignore[arg-type]
    assert "mutated" not in out2.summary


@pytest.mark.asyncio
async def test_apply_guard_can_raise_apply_guard_rejected() -> None:
    """A guard that vetoes must surface as ``ApplyGuardRejected``."""
    from deos.modules.self_evolution.domain.errors import ApplyGuardRejected

    class _VetoGuard(ApplyGuard):
        async def apply(  # type: ignore[override]
            self, *, tenant_id: UUID, candidate: EvolveCandidate
        ) -> ApplyOutcome:
            raise ApplyGuardRejected(
                "draft layer missing",
                code="APPLY_GUARD_REJECTED",
                details={"reason": "draft layer missing"},
            )

    cand = _candidate()
    with pytest.raises(ApplyGuardRejected):
        await _VetoGuard().apply(tenant_id=TENANT, candidate=cand)  # type: ignore[arg-type]


_ = Any  # silence unused-import