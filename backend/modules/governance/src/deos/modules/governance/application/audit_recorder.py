"""AuditRecorder — subscribes to business events and persists them to audit_log.

Subscribed topics (set by lifespan wiring):
- ``agent.turn.started`` / ``agent.turn.completed``
- ``tool.execution.started`` / ``tool.execution.completed`` / ``tool.execution.failed``
- ``skill.invocation.started`` / ``skill.invocation.completed``
- ``memory.written`` / ``memory.revoked``
- ``governance.policy.*`` / ``governance.approval.*`` / ``governance.decision.*``

The recorder is intentionally side-effect-only — never raises back to
the EventBus handler.  A failing audit write is logged at ``warning``
and dropped, since the originating business operation has already
succeeded by the time the event lands here.
"""

from __future__ import annotations

import logging
from typing import Any, Callable, Coroutine

from eos_schema.ids import TenantId, UserId
from eos_vault.actor import ActorContext

from deos.modules.governance.application.ports import AuditLogPort, ClockPort

_log = logging.getLogger(__name__)


def extract_actor_id(payload: dict[str, Any]) -> UserId | None:
    raw = payload.get("actor_id") or payload.get("user_id") or payload.get(
        "principal_id"
    )
    if raw is None:
        return None
    try:
        return UserId(raw)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def extract_tenant_id(payload: dict[str, Any]) -> TenantId | None:
    raw = payload.get("tenant_id")
    if raw is None:
        return None
    try:
        return TenantId(raw)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


class AuditRecorder:
    def __init__(
        self,
        *,
        audit_port: AuditLogPort,
        clock: ClockPort,
        topics: tuple[str, ...] = (),
        actor_resolver: Callable[[dict[str, Any]], UserId | None] | None = None,
    ) -> None:
        self._audit = audit_port
        self._clock = clock
        self._topics = topics
        self._actor_resolver = actor_resolver or extract_actor_id

    def topics(self) -> tuple[str, ...]:
        return self._topics

    async def handle(self, envelope: Any) -> None:
        """EventBus handler — accepts an EventEnvelope or a raw dict payload."""
        if isinstance(envelope, dict):
            # The EventEnvelope shape wraps the actual payload under
            # ``payload``; if present, persist only that sub-dict so we
            # don't try to JSON-envelope UUIDs/``occurred_at_ms`` ints
            # from the envelope envelope itself.
            payload = envelope.get("payload") if "payload" in envelope else envelope
            event_type = (
                envelope.get("event_name")
                or envelope.get("topic")
                or payload.get("event_name")
                or "unknown"
            )
        else:
            payload = getattr(envelope, "payload", None) or {}
            event_type = (
                getattr(envelope, "event_name", None)
                or getattr(envelope, "topic", None)
                or "unknown"
            )

        tenant_id = extract_tenant_id(payload)
        if tenant_id is None:
            _log.warning("audit dropped: missing tenant_id topic=%s", event_type)
            return
        actor_id = self._actor_resolver(payload)
        try:
            await self._audit.append(
                tenant_id=tenant_id,
                actor_id=actor_id,
                event_type=event_type,
                payload=_scrub(payload),
            )
        except Exception as exc:  # noqa: BLE001 — audit must not raise
            _log.warning(
                "audit append failed topic=%s tenant=%s err=%s",
                event_type,
                tenant_id,
                exc,
            )

    async def record_actor(
        self,
        *,
        tenant_id: TenantId,
        actor_id: UserId | None,
        event_type: str,
        payload: dict[str, Any],
    ) -> None:
        await self._audit.append(
            tenant_id=tenant_id,
            actor_id=actor_id,
            event_type=event_type,
            payload=_scrub(payload),
        )


def _scrub(payload: dict[str, Any]) -> dict[str, Any]:
    """Strip well-known secret fields before persisting.

    The audit log must not contain raw secret material; callers store
    ``secrets_ref`` (a pointer into the vault) and the recorder keeps
    only that reference.
    """
    SENSITIVE = {"password", "api_key", "secret", "token", "authorization"}  # noqa: N806
    out: dict[str, Any] = {}
    for k, v in payload.items():
        if k.lower() in SENSITIVE and not k.endswith("_ref"):
            out[k + "_redacted"] = "***"
        else:
            out[k] = v
    return out


def build_default_topics() -> tuple[str, ...]:
    return (
        "agent.turn.started",
        "agent.turn.completed",
        "agent.turn.failed",
        "tool.execution.started",
        "tool.execution.completed",
        "tool.execution.failed",
        "skill.invocation.started",
        "skill.invocation.completed",
        "skill.invocation.failed",
        "memory.written",
        "memory.revoked",
        "memory.expired_purged",
        "governance.policy.created",
        "governance.policy.updated",
        "governance.policy.deleted",
        "governance.approval.requested",
        "governance.approval.decided",
        "governance.decision.recorded",
    )


__all__ = ["AuditRecorder", "build_default_topics", "extract_actor_id"]


# Re-export so callers can build an ActorContext straight from a payload
# without importing the auth layer.
def actor_from_payload(
    payload: dict[str, Any],
) -> ActorContext | None:
    tenant_id = extract_tenant_id(payload)
    if tenant_id is None:
        return None
    workspace_id = payload.get("workspace_id")
    principal_id = extract_actor_id(payload)
    roles = payload.get("roles") or ()
    if not isinstance(roles, (frozenset, list, tuple, set)):
        roles = ()
    return ActorContext(
        tenant_id=tenant_id,
        workspace_id=workspace_id if isinstance(workspace_id, type(tenant_id)) else None,
        principal_id=principal_id,
        roles=frozenset(roles),
    )


HandlerType = Callable[[Any], Coroutine[Any, Any, None]]