"""PurgeExpiredMemoriesUseCase.

Hard-deletes entries whose ``expires_at <= now``.  Intended to be
called by a scheduled job (P9 scheduler).  Tenant-scoped; caller picks
the tenant.  Returns the count purged.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime

from eos_schema.ids import TenantId

from deos.modules.memory.application.ports import (
    MemoryEventPublisher,
    MemoryRepository,
    VectorSearchPort,
)
from deos.modules.memory.domain.events import MemoryExpiredPurged

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(UTC)


@dataclass(slots=True)
class PurgeExpiredMemoriesUseCase:
    repository: MemoryRepository
    vector_search: VectorSearchPort
    publisher: MemoryEventPublisher | None = None

    async def execute(self, *, tenant_id: TenantId) -> int:
        purged = await self.repository.purge_expired(tenant_id=tenant_id, now=_utcnow())
        if purged == 0:
            return 0

        # We don't have the workspace breakdown here without re-querying; the
        # event payload keeps tenant + a single aggregate count.  Workspace-
        # level fanout is left to the scheduler that drives the purge.
        if self.publisher is not None:
            try:
                await self.publisher.publish(
                    MemoryExpiredPurged(
                        tenant_id=tenant_id,
                        workspace_id=None,
                        purged_count=purged,
                    )
                )
            except Exception:
                logger.exception("publish MemoryExpiredPurged failed for %s", tenant_id)

        return purged


__all__ = ["PurgeExpiredMemoriesUseCase"]
