"""Governance domain — value objects + entities + errors + match + events."""

from __future__ import annotations

from deos.modules.governance.domain.entities import (
    Approval,
    AuditLogEntry,
    DecisionEvent,
    DecisionRecord,
    PolicyRule,
)
from deos.modules.governance.domain.events import (
    ApprovalDecided,
    ApprovalRequested,
    AuditLogAppended,
    DecisionRecorded,
    PolicyCreated,
    PolicyDeleted,
    PolicyUpdated,
)
from deos.modules.governance.domain.policy_match import action_precedence, match
from deos.modules.governance.domain.value_objects import (
    ApprovalStatus,
    PolicyEffect,
    PolicySubject,
)

__all__ = [
    "Approval",
    "ApprovalDecided",
    "ApprovalRequested",
    "ApprovalStatus",
    "AuditLogAppended",
    "AuditLogEntry",
    "DecisionEvent",
    "DecisionRecord",
    "DecisionRecorded",
    "PolicyCreated",
    "PolicyDeleted",
    "PolicyEffect",
    "PolicyRule",
    "PolicySubject",
    "PolicyUpdated",
    "action_precedence",
    "match",
]