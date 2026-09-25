"""HTTP router for the memory module: write / recall / get / list / revoke
+ per-workspace memory governance policy.

Mounts under ``/v1/memories`` (FastAPI prefix).  Per-request service is
resolved via :func:`memory_service_dependency`.

Route ordering: literal paths (``/policy``, ``/recall``) MUST be
registered before the ``/{memory_id}`` wildcard so FastAPI doesn't
422-validate the literal ``policy`` against the UUID path param. Same
trick as identity's ``/users/me`` vs ``/users/{uid}``.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request

from deos.modules.memory.adapter.http.dto import (
    MemoryEntryResponse,
    MemoryListResponse,
    MemoryPolicyResponse,
    MemoryPolicyUpdateRequest,
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
from deos.modules.memory.domain.entities import MemoryPolicy
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

    # ── policy: literal path; registered BEFORE /{memory_id} wildcard ──
    @router.get("/policy", response_model=MemoryPolicyResponse)
    async def get_memory_policy(
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        svc: MemoryService = Depends(memory_service_dependency),  # noqa: B008
    ) -> MemoryPolicyResponse:
        from eos_schema.ids import WorkspaceId

        policy = await svc.get_memory_policy(workspace_id=WorkspaceId(x_workspace_id))
        return _policy_to_response(policy)

    @router.patch("/policy", response_model=MemoryPolicyResponse)
    async def update_memory_policy(
        body: MemoryPolicyUpdateRequest,
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        svc: MemoryService = Depends(memory_service_dependency),  # noqa: B008
    ) -> MemoryPolicyResponse:
        from eos_schema.ids import WorkspaceId

        patch = body.model_dump(exclude_unset=True)
        policy = await svc.update_memory_policy(
            workspace_id=WorkspaceId(x_workspace_id), **patch
        )
        return _policy_to_response(policy)

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


def _policy_to_response(p: MemoryPolicy) -> MemoryPolicyResponse:
    return MemoryPolicyResponse(
        workspace_id=str(p.workspace_id),
        short_term_ttl_hours=p.short_term_ttl_hours,
        working_memory_ttl_days=p.working_memory_ttl_days,
        daily_refinement_time=p.daily_refinement_time,
        short_to_working_enabled=p.short_to_working_enabled,
        working_to_long_enabled=p.working_to_long_enabled,
        long_to_knowledge_enabled=p.long_to_knowledge_enabled,
        minimum_confidence=p.minimum_confidence,
        long_term_write_approval=p.long_term_write_approval,
        sensitive_data_masking=p.sensitive_data_masking,
        long_term_capacity=p.long_term_capacity,
        used_capacity=p.used_capacity,
    )


__all__ = ["build_router", "memory_service_dependency"]