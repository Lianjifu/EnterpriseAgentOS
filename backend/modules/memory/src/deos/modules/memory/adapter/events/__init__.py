"""Event adapter — bridges memory domain events to eos_messaging bus."""

from __future__ import annotations

from eos_kernel.contextvars import current_trace_id
from eos_messaging.bus import EventBus, EventEnvelope

from deos.modules.memory.application.ports import MemoryEventPublisher


class MessagingMemoryEventPublisher(MemoryEventPublisher):
    def __init__(self, bus: EventBus) -> None:
        self._bus = bus

    async def publish(self, event: object) -> None:
        tenant_id = getattr(event, "tenant_id", None)
        workspace_id = getattr(event, "workspace_id", None)
        envelope = EventEnvelope.wrap(
            event,
            tenant_id=tenant_id,  # type: ignore[arg-type]
            workspace_id=workspace_id,
            trace_id=current_trace_id(),
        )
        await self._bus.publish(envelope)


__all__ = ["MessagingMemoryEventPublisher"]