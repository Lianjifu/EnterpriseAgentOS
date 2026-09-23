"""Event publisher adapter — wraps `eos_messaging.EventBus.publish` with
`EventEnvelope.wrap(...)` so use cases can publish bare `DomainEvent`s.
"""

from __future__ import annotations

from uuid import UUID

from eos_kernel.contextvars import current_trace_id
from eos_kernel.events import DomainEvent
from eos_messaging.bus import EventBus
from eos_messaging.domain_event import EventEnvelope

from deos.modules.agent_runtime.application.ports import EventPublisher


class AgentRuntimeEventPublisher(EventPublisher):
    def __init__(self, bus: EventBus) -> None:
        self._bus = bus

    async def publish(
        self,
        event: DomainEvent,
        *,
        tenant_id: UUID,
        workspace_id: UUID | None,
        trace_id: str | None = None,
    ) -> None:
        envelope = EventEnvelope.wrap(
            event,
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            trace_id=trace_id or current_trace_id(),
        )
        await self._bus.publish(envelope)
