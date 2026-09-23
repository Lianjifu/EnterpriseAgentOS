"""Event adapter — bridges domain events to eos_messaging bus."""

from __future__ import annotations

from eos_kernel.contextvars import current_trace_id
from eos_messaging.bus import EventBus, EventEnvelope

from deos.modules.skill.application.ports import SkillEventPublisher
from deos.modules.skill.domain.entities import SkillPackage  # noqa: F401
from deos.modules.skill.domain.events import DomainEvent


class MessagingSkillEventPublisher(SkillEventPublisher):
    def __init__(self, bus: EventBus) -> None:
        self._bus = bus

    async def publish(self, event: DomainEvent) -> None:
        tenant_id = getattr(event, "tenant_id", None)
        workspace_id = getattr(event, "workspace_id", None)
        envelope = EventEnvelope.wrap(
            event,
            tenant_id=tenant_id
            if tenant_id is not None
            else __import__(  # type: ignore[arg-type]
                "uuid"
            ).uuid4(),
            workspace_id=workspace_id,
            trace_id=current_trace_id(),
        )
        await self._bus.publish(envelope)


__all__ = ["MessagingSkillEventPublisher"]
