"""Messaging-backed knowledge event publisher.

Wraps the in-process :class:`eos_messaging.bus.EventBus` so use cases
can publish domain events through a thin :class:`KnowledgeEventPublisher`
shaped Protocol without taking a hard dependency on the bus.
"""

from __future__ import annotations

import logging

from deos.modules.knowledge.application.ports import KnowledgeEventPublisher

logger = logging.getLogger(__name__)


class MessagingKnowledgeEventPublisher(KnowledgeEventPublisher):
    def __init__(self, bus) -> None:  # type: ignore[no-untyped-def]
        self._bus = bus

    async def publish(self, event: object) -> None:
        topic = getattr(event, "TOPIC", None)
        if topic is None:
            logger.warning("knowledge event %r has no TOPIC", type(event).__name__)
            return
        try:
            await self._bus.publish(topic, event)
        except Exception:  # pragma: no cover — defensive
            logger.exception("knowledge event bus publish failed: topic=%s", topic)


__all__ = ["MessagingKnowledgeEventPublisher"]
