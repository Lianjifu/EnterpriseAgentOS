"""Messaging-backed model event publisher.

Wraps the in-process :class:`eos_messaging.bus.EventBus` so the model
service can publish business events through the narrow
``ModelEventPublisher`` Protocol without importing the bus directly.

The model module keeps its events on the ``(topic, payload)`` shape —
each :class:`DomainEvent` subclass carries a ``TOPIC`` constant and a
``to_payload()`` method — so this adapter mirrors the
:class:`governance.adapter.events.MessagingEventPublisher` design:
copy the topic into ``event_name`` verbatim and ship the payload
dict through ``EventEnvelope``.
"""

from __future__ import annotations

import logging
import time
from typing import TYPE_CHECKING, Any
from uuid import UUID, uuid4

from eos_messaging.domain_event import EventEnvelope

if TYPE_CHECKING:
    from eos_messaging.bus import EventBus

logger = logging.getLogger(__name__)


class MessagingModelEventPublisher:
    def __init__(self, bus: EventBus) -> None:
        self._bus = bus

    async def publish(self, topic: str, payload: dict[str, Any]) -> None:
        raw_tid = payload.get("tenant_id")
        tenant_id: UUID
        if raw_tid is not None:
            try:
                tenant_id = UUID(str(raw_tid))
            except (TypeError, ValueError):
                tenant_id = UUID("00000000-0000-0000-0000-000000000000")
        else:
            tenant_id = UUID("00000000-0000-0000-0000-000000000000")
        raw_wid = payload.get("workspace_id")
        workspace_id = UUID(str(raw_wid)) if raw_wid is not None else None

        envelope = EventEnvelope(
            event_id=uuid4(),
            event_name=topic,
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            occurred_at_ms=int(time.time() * 1000),
            trace_id=None,
            payload=dict(payload),
        )
        try:
            await self._bus.publish(envelope)
        except Exception:  # pragma: no cover — defensive
            logger.exception("model event bus publish failed: topic=%s", topic)


__all__ = ["MessagingModelEventPublisher"]