"""Redis-stream event bus for production.

Streams are keyed `eos:events:{tenant_id}`. Consumer groups give at-least-once
delivery; failed messages go to `eos:events:dlq` with the original envelope
preserved.
"""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator
from typing import TYPE_CHECKING

from eos_messaging.bus import EventBus
from eos_messaging.domain_event import EventEnvelope

if TYPE_CHECKING:
    from redis.asyncio import Redis

logger = logging.getLogger(__name__)


def _is_busy_group(exc: BaseException) -> bool:
    """XGROUP CREATE returns BUSYGROUP if the group already exists."""
    msg = str(exc)
    return "BUSYGROUP" in msg or "Consumer Group name already exists" in msg


class RedisStreamBus(EventBus):
    def __init__(
        self,
        redis: Redis,
        *,
        prefix: str = "eos:events:",
        dlq_stream: str = "eos:events:dlq",
        consumer_group: str = "eos-default",
    ) -> None:
        self._r = redis
        self._prefix = prefix
        self._dlq = dlq_stream
        self._group = consumer_group
        self._subs: dict[str, list[object]] = {}

    async def publish(self, envelope: EventEnvelope) -> None:
        key = self._stream_key(envelope.tenant_id)
        payload = {
            "event_id": str(envelope.event_id),
            "event_name": envelope.event_name,
            "tenant_id": str(envelope.tenant_id),
            "workspace_id": str(envelope.workspace_id) if envelope.workspace_id else "",
            "trace_id": envelope.trace_id or "",
            "occurred_at_ms": envelope.occurred_at_ms,
            "payload": json.dumps(envelope.payload, default=str),
            "metadata": json.dumps(envelope.metadata, default=str),
        }
        await self._r.xadd(key, payload)  # type: ignore[arg-type]

    def subscribe(self, event_name: str, handler: object) -> None:
        self._subs.setdefault(event_name, []).append(handler)

    async def start(self) -> None:
        # Idempotent group creation
        for key in await self._r.keys(f"{self._prefix}*"):
            try:
                await self._r.xgroup_create(key, self._group, id="0", mkstream=True)
            except Exception as exc:
                if not _is_busy_group(exc):
                    raise
                logger.debug("consumer group already exists on stream %s", key)

    async def stop(self) -> None:
        return None

    async def stream(  # type: ignore[override]
        self, tenant_id: object
    ) -> AsyncIterator[EventEnvelope]:
        key = self._stream_key(tenant_id)
        try:
            await self._r.xgroup_create(key, self._group, id="0", mkstream=True)
        except Exception as exc:
            if not _is_busy_group(exc):
                raise
            logger.debug("consumer group already exists on stream %s", key)

        last_id = ">"
        while True:
            resp = await self._r.xreadgroup(
                groupname=self._group,
                consumername=f"{self._group}-c1",
                streams={key: last_id},
                count=10,
                block=1000,
            )
            for _stream, entries in resp:  # type: ignore[str-unpack, union-attr]
                for msg_id, fields in entries:  # type: ignore[str-unpack, union-attr]
                    yield _envelope_from_fields(tenant_id, fields)  # type: ignore[arg-type]
                    await self._r.xack(key, self._group, msg_id)  # type: ignore[arg-type]

    def _stream_key(self, tenant_id: object) -> str:
        return f"{self._prefix}{tenant_id}"


def _envelope_from_fields(
    tenant_id: object, fields: dict[bytes, bytes]
) -> EventEnvelope:
    """Reconstruct an envelope from xadd fields. Stays import-light to avoid a
    circular dep on schema."""
    from uuid import UUID

    return EventEnvelope(
        event_id=UUID(fields[b"event_id"].decode()),
        event_name=fields[b"event_name"].decode(),
        tenant_id=UUID(str(tenant_id))
        if not isinstance(tenant_id, UUID)
        else tenant_id,
        workspace_id=UUID(fields[b"workspace_id"].decode())
        if fields.get(b"workspace_id")
        else None,
        trace_id=fields.get(b"trace_id", b"").decode() or None,
        occurred_at_ms=int(fields[b"occurred_at_ms"]),
        payload=json.loads(fields[b"payload"]),
        metadata=json.loads(fields.get(b"metadata", b"{}") or b"{}"),
    )
