"""HTTP router for the memory module: write / recall / get / list / revoke.

Mounts under ``/v1/memories`` (FastAPI prefix).  Per-request service is
resolved via :func:`memory_service_dependency`.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request

from deos.modules.memory.adapter.http.dto import (
    MemoryEntryResponse,
    MemoryListResponse,
    RecallRequest,
    RecallResponse,
    WriteMemoryRequest,
)
from deos.modules.memory.adapter.http.factory import MemoryServiceFactory
from deos.modules.memory.adapter.http.mappers import (
    memory_entry_to_dto,
    memory_hit_to_dto,
)
from deos.modules.memory.application.services import MemoryService
from deos.modules.memory.domain.value_objects import MemoryScope


async def memory_service_dependency(
    request: Request,
) -> MemoryService:
    """Yield a per-request ``MemoryService``.

    Production wires ``MemoryServiceFactory`` via ``app.state``; tests
    pre-populate ``app.state.memory_service_factory`` with an in-memory
    factory.  When the factory is missing we surface 503.
    """
    factory: MemoryServiceFactory | None = getattr(
        request.app.state, "memory_service_factory", None
    )
    if factory is None:
        raise HTTPException(status_code=503, detail="memory service factory not wired")
    return factory.for_session()


def build_router() -> APIRouter:
    router = APIRouter(prefix="/v1/memories", tags=["memory"])

    @router.post("", status_code=201, response_model=MemoryEntryResponse)
    async def write_memory(
        body: WriteMemoryRequest,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        x_user_id: UUID = Header(..., alias="X-User-Id"),  # noqa: B008
        svc: MemoryService = Depends(memory_service_dependency),  # noqa: B008
    ) -> MemoryEntryResponse:
        entry = await svc.write(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            owner_id=x_user_id,
            scope=MemoryScope(body.scope),
            content=body.content,
            metadata=body.metadata,
            expires_at=body.expires_at,
        )
        return memory_entry_to_dto(entry)

    @router.post("/recall", response_model=RecallResponse)
    async def recall(
        body: RecallRequest,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        svc: MemoryService = Depends(memory_service_dependency),  # noqa: B008
    ) -> RecallResponse:
        hits = await svc.recall(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            query=body.query,
            top_k=body.top_k,
            scope_filter=MemoryScope(body.scope_filter) if body.scope_filter else None,
        )
        return RecallResponse(
            results=[memory_hit_to_dto(h) for h in hits],
            query=body.query,
            top_k=body.top_k,
        )

    @router.get("/{memory_id}", response_model=MemoryEntryResponse)
    async def get_memory(
        memory_id: UUID,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        svc: MemoryService = Depends(memory_service_dependency),  # noqa: B008
    ) -> MemoryEntryResponse:
        from eos_schema.ids import MemoryEntryId

        entry = await svc.get_memory.execute(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            memory_id=MemoryEntryId(memory_id),
        )
        return memory_entry_to_dto(entry)

    @router.get("", response_model=MemoryListResponse)
    async def list_memories(
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        scope: str | None = Query(default=None),
        limit: int = Query(50, ge=1, le=200),
        svc: MemoryService = Depends(memory_service_dependency),  # noqa: B008
    ) -> MemoryListResponse:
        scope_filter = MemoryScope(scope) if scope else None
        rows = await svc.list_memories.execute(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            scope=scope_filter,
            limit=limit,
        )
        items = [memory_entry_to_dto(r) for r in rows]
        return MemoryListResponse(items=items, total=len(items))

    @router.delete("/{memory_id}", status_code=200, response_model=MemoryEntryResponse)
    async def revoke_memory(
        memory_id: UUID,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        x_user_id: UUID = Header(..., alias="X-User-Id"),  # noqa: B008
        svc: MemoryService = Depends(memory_service_dependency),  # noqa: B008
    ) -> MemoryEntryResponse:
        from eos_schema.ids import MemoryEntryId

        entry = await svc.revoke(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            memory_id=MemoryEntryId(memory_id),
            actor_id=x_user_id,
        )
        return memory_entry_to_dto(entry)

    return router


__all__ = ["build_router", "memory_service_dependency"]
