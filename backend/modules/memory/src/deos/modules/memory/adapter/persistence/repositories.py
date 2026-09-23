"""SQLAlchemy repository implementation of the memory application ports."""

from __future__ import annotations

from datetime import datetime

from eos_persistence.tenant_guard import current_tenant_id
from eos_schema.ids import MemoryEntryId, TenantId, WorkspaceId
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from deos.modules.memory.adapter.persistence.mappers import (
    apply_domain_to_orm,
    memory_entry_domain_to_orm,
    memory_entry_orm_to_domain,
)
from deos.modules.memory.adapter.persistence.models import MemoryEntryORM
from deos.modules.memory.application.ports import MemoryRepository
from deos.modules.memory.domain.entities import MemoryEntry
from deos.modules.memory.domain.value_objects import MemoryScope


def _cross_tenant(o: object) -> bool:
    bound = current_tenant_id()
    if bound is None:
        return False
    return getattr(o, "tenant_id", None) != bound


class SqlMemoryRepository(MemoryRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def add(self, entry: MemoryEntry) -> MemoryEntry:
        self._s.add(memory_entry_domain_to_orm(entry))
        await self._s.flush()
        # Return the entry with the persisted timestamp if any
        return entry

    async def get(
        self, *, tenant_id: TenantId, memory_id: MemoryEntryId
    ) -> MemoryEntry | None:
        o = await self._s.get(MemoryEntryORM, memory_id)
        if o is None or _cross_tenant(o):
            return None
        if o.tenant_id != tenant_id:
            return None
        return memory_entry_orm_to_domain(o)

    async def list(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        scope: MemoryScope | None = None,
        limit: int = 50,
    ) -> list[MemoryEntry]:
        stmt = (
            select(MemoryEntryORM)
            .where(MemoryEntryORM.workspace_id == workspace_id)
            .order_by(MemoryEntryORM.created_at.asc())
            .limit(limit)
        )
        if scope is not None:
            stmt = stmt.where(MemoryEntryORM.scope == scope.value)
        rows = (await self._s.execute(stmt)).scalars().all()
        # Tenant auto-filter is on TenantScopedMixin; this also enforces it.
        return [memory_entry_orm_to_domain(r) for r in rows if r.tenant_id == tenant_id]

    async def update(self, entry: MemoryEntry) -> MemoryEntry:
        o = await self._s.get(MemoryEntryORM, entry.id)
        if o is None or _cross_tenant(o):
            return entry
        if o.tenant_id != entry.tenant_id:
            return entry
        apply_domain_to_orm(o, entry)
        await self._s.flush()
        return memory_entry_orm_to_domain(o)

    async def revoke(
        self, *, tenant_id: TenantId, memory_id: MemoryEntryId
    ) -> MemoryEntry:
        o = await self._s.get(MemoryEntryORM, memory_id)
        if o is None or _cross_tenant(o):
            raise LookupError(f"memory {memory_id} not found")
        if o.tenant_id != tenant_id:
            raise LookupError(f"memory {memory_id} not found")
        domain = memory_entry_orm_to_domain(o)
        revoked = domain.revoke()
        apply_domain_to_orm(o, revoked)
        await self._s.flush()
        return memory_entry_orm_to_domain(o)

    async def purge_expired(self, *, tenant_id: TenantId, now: datetime) -> int:
        stmt = (
            delete(MemoryEntryORM)
            .where(
                MemoryEntryORM.expires_at.is_not(None),
                MemoryEntryORM.expires_at <= now,
            )
            .execution_options(synchronize_session=False)
        )
        result = await self._s.execute(stmt)
        return int(getattr(result, "rowcount", 0) or 0)


__all__ = ["SqlMemoryRepository"]
