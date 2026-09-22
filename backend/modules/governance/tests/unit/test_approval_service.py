"""Tests for ``Approval`` state machine + ``ApprovalService``."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from eos_schema.ids import TenantId, UserId

from deos.modules.governance.application.approval_service import ApprovalService
from deos.modules.governance.domain.entities import Approval
from deos.modules.governance.domain.errors import (
    ApprovalAlreadyDecided,
    ApprovalExpired,
    ApproverMustDiffer,
)
from deos.modules.governance.domain.value_objects import ApprovalStatus
from _governance_unit_in_memory import (
    FixedClock,
    InMemoryApprovalRepository,
    RecordingPublisher,
    SequenceIds,
)

TID = TenantId(UUID("00000000-0000-0000-0000-000000000001"))
USER_A = UserId(UUID("00000000-0000-0000-0000-00000000000a"))
USER_B = UserId(UUID("00000000-0000-0000-0000-00000000000b"))


def _service() -> tuple[
    ApprovalService, InMemoryApprovalRepository, RecordingPublisher, FixedClock
]:
    repo = InMemoryApprovalRepository()
    pub = RecordingPublisher()
    clock = FixedClock()
    ids = SequenceIds()
    svc = ApprovalService(
        repo=repo,
        clock=clock,
        ids=ids,
        publisher=pub,
        default_ttl_seconds=3600,
    )
    return svc, repo, pub, clock


async def test_create_starts_pending_and_publishes_event():
    svc, _, pub, clock = _service()
    ap = await svc.create(
        tenant_id=TID,
        requester_id=USER_A,
        action="tool:execute:reverse",
        resource={"tool": "reverse"},
    )
    assert ap.status is ApprovalStatus.PENDING
    assert ap.expires_at > clock.now()
    assert any(t == "governance.approval.requested" for t, _ in pub.published)


async def test_approve_happy_path():
    svc, repo, pub, _ = _service()
    ap = await svc.create(
        tenant_id=TID,
        requester_id=USER_A,
        action="tool:execute:reverse",
        resource={"tool": "reverse"},
    )
    decided = await svc.approve(
        tenant_id=TID, approval_id=ap.id, approver_id=USER_B  # type: ignore[arg-type]
    )
    assert decided.status is ApprovalStatus.APPROVED
    assert decided.approver_id == USER_B
    assert any(t == "governance.approval.decided" for t, _ in pub.published)


async def test_approve_same_actor_as_requester_rejected():
    svc, _, _, _ = _service()
    ap = await svc.create(
        tenant_id=TID,
        requester_id=USER_A,
        action="tool:execute:reverse",
        resource={},
    )
    import pytest

    with pytest.raises(ApproverMustDiffer):
        await svc.approve(
            tenant_id=TID, approval_id=ap.id, approver_id=USER_A  # type: ignore[arg-type]
        )


async def test_approve_already_decided_rejected():
    svc, _, _, _ = _service()
    ap = await svc.create(
        tenant_id=TID,
        requester_id=USER_A,
        action="tool:execute:reverse",
        resource={},
    )
    await svc.approve(
        tenant_id=TID, approval_id=ap.id, approver_id=USER_B  # type: ignore[arg-type]
    )
    import pytest

    with pytest.raises(ApprovalAlreadyDecided):
        await svc.approve(
            tenant_id=TID, approval_id=ap.id, approver_id=USER_B  # type: ignore[arg-type]
        )


async def test_deny_records_reason_in_payload():
    svc, repo, _, _ = _service()
    ap = await svc.create(
        tenant_id=TID,
        requester_id=USER_A,
        action="tool:execute:reverse",
        resource={},
    )
    decided = await svc.deny(
        tenant_id=TID,
        approval_id=ap.id,  # type: ignore[arg-type]
        approver_id=USER_B,
        reason="not authorized",
    )
    assert decided.status is ApprovalStatus.DENIED
    assert decided.payload["deny_reason"] == "not authorized"


async def test_expire_if_due_returns_expired_when_past():
    svc, _, _, clock = _service()
    ap = await svc.create(
        tenant_id=TID,
        requester_id=USER_A,
        action="tool:execute:reverse",
        resource={},
    )
    # Advance past expiry
    clock.advance(seconds=3601)
    expired = await svc.expire_if_due(
        tenant_id=TID, approval_id=ap.id  # type: ignore[arg-type]
    )
    assert expired is not None
    assert expired.status is ApprovalStatus.EXPIRED


async def test_expire_if_due_no_op_when_not_due():
    svc, _, _, _ = _service()
    ap = await svc.create(
        tenant_id=TID,
        requester_id=USER_A,
        action="tool:execute:reverse",
        resource={},
    )
    res = await svc.expire_if_due(
        tenant_id=TID, approval_id=ap.id  # type: ignore[arg-type]
    )
    assert res is None


async def test_approve_after_expiry_rejected():
    svc, _, _, clock = _service()
    ap = await svc.create(
        tenant_id=TID,
        requester_id=USER_A,
        action="tool:execute:reverse",
        resource={},
    )
    clock.advance(seconds=3601)
    import pytest

    with pytest.raises(ApprovalExpired):
        await svc.approve(
            tenant_id=TID, approval_id=ap.id, approver_id=USER_B  # type: ignore[arg-type]
        )


async def test_approval_entity_returns_new_instance():
    """Mutation methods return new Approval; original is unchanged."""
    ap = Approval.create(
        tenant_id=TID,
        requester_id=USER_A,
        action="tool:execute:reverse",
        resource={"k": "v"},
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    approved = ap.approve(approver_id=USER_B)
    assert ap.status is ApprovalStatus.PENDING
    assert approved.status is ApprovalStatus.APPROVED
    assert ap is not approved
