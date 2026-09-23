"""HTTP router for the skill module: CRUD + install + invoke + cancel.

Routes mount under `/v1/skills`. Per-request DB session + service is
bound via an async-generator dependency (`skill_dependency`).

Mirrors the tool module router pattern.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    Query,
    Request,
    Response,
)
from fastapi.responses import JSONResponse

from deos.modules.skill.adapter.http.dto import (
    InstallSkillResponse,
    InvokeSkillRequest,
    RegisterSkillRequest,
    SkillInvocationListResponse,
    SkillInvocationResponse,
    SkillListResponse,
    SkillResponse,
    UpdateSkillRequest,
)
from deos.modules.skill.adapter.http.mappers import (
    install_to_response,
    skill_invocation_to_dto,
    skill_to_dto,
)
from deos.modules.skill.application.services import SkillService
from deos.modules.skill.domain.entities import NetworkPolicy
from deos.modules.skill.domain.errors import SandboxTimeout


async def skill_dependency(request: Request) -> SkillService:
    """Per-request session + service binding.

    Tests inject `skill_factory_for_session` on the app state; the live
    lifespan wires `_SkillFactory` via `app.state.skill_factory`.
    """
    factory = getattr(request.app.state, "skill_factory", None)
    container = getattr(request.app.state, "container", None)
    if factory is None or container is None:
        raise HTTPException(status_code=503, detail="skill factory not wired")
    sf = container.session_factory()
    async with sf.session() as session:
        svc = factory.for_session(session)
        request.state.skill_service = svc
        try:
            yield svc
        except Exception:
            await session.rollback()
            raise
        await session.commit()


def build_router() -> APIRouter:
    router = APIRouter(prefix="/v1/skills", tags=["skill"])

    @router.post("", status_code=201, response_model=SkillResponse)
    async def register_skill(
        body: RegisterSkillRequest,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        x_user_id: UUID = Header(..., alias="X-User-Id"),  # noqa: B008
        svc: SkillService = Depends(skill_dependency),  # noqa: B008
    ) -> SkillResponse:
        pkg = await svc.register_skill.execute(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            registered_by=x_user_id,
            name=body.name,
            version=body.version,
            description=body.description,
            entrypoint=body.entrypoint,
            image=body.image,
            parameters_schema=body.parameters_schema,
            artifact_uri=body.artifact_uri,
            network_policy=NetworkPolicy(body.network_policy),
            cpu_quota=body.cpu_quota,
            memory_bytes=body.memory_bytes,
            timeout_seconds=body.timeout_seconds,
        )
        return skill_to_dto(pkg)

    @router.get("", response_model=SkillListResponse)
    async def list_skills(
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        limit: int = Query(50, ge=1, le=200),
        offset: int = Query(0, ge=0),
        enabled_only: bool = Query(False),
        svc: SkillService = Depends(skill_dependency),  # noqa: B008
    ) -> SkillListResponse:
        items = await svc.list_skills.execute(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            limit=limit,
            offset=offset,
            enabled_only=enabled_only,
        )
        return SkillListResponse(
            items=[skill_to_dto(p) for p in items],
            total=len(items),
        )

    @router.get("/{skill_id}", response_model=SkillResponse)
    async def get_skill(
        skill_id: UUID,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        svc: SkillService = Depends(skill_dependency),  # noqa: B008
    ) -> SkillResponse:
        pkg = await svc.get_skill.execute(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            skill_id=skill_id,
        )
        return skill_to_dto(pkg)

    @router.patch("/{skill_id}", response_model=SkillResponse)
    async def update_skill(
        skill_id: UUID,
        body: UpdateSkillRequest,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        x_user_id: UUID = Header(..., alias="X-User-Id"),  # noqa: B008
        svc: SkillService = Depends(skill_dependency),  # noqa: B008
    ) -> SkillResponse:
        pkg = await svc.update_skill.execute(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            skill_id=skill_id,
            updated_by=x_user_id,
            expected_version_lock=body.expected_version_lock,
            description=body.description,
            entrypoint=body.entrypoint,
            image=body.image,
            parameters_schema=body.parameters_schema,
            artifact_uri=body.artifact_uri,
            network_policy=(
                NetworkPolicy(body.network_policy) if body.network_policy else None
            ),
            cpu_quota=body.cpu_quota,
            memory_bytes=body.memory_bytes,
            timeout_seconds=body.timeout_seconds,
            enabled=body.enabled,
        )
        return skill_to_dto(pkg)

    @router.delete("/{skill_id}", status_code=204)
    async def disable_skill(
        skill_id: UUID,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        x_user_id: UUID = Header(..., alias="X-User-Id"),  # noqa: B008
        svc: SkillService = Depends(skill_dependency),  # noqa: B008
    ) -> Response:
        await svc.disable_skill.execute(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            skill_id=skill_id,
            disabled_by=x_user_id,
        )
        return Response(status_code=204)

    @router.post(
        "/{skill_id}/install", status_code=201, response_model=InstallSkillResponse
    )
    async def install_skill(
        skill_id: UUID,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        x_user_id: UUID = Header(..., alias="X-User-Id"),  # noqa: B008
        svc: SkillService = Depends(skill_dependency),  # noqa: B008
    ) -> InstallSkillResponse:
        result = await svc.install_skill.execute(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            skill_id=skill_id,
            installed_by=x_user_id,
        )
        return install_to_response(
            install=result.install,
            run_token=result.run_token,
            expires_at_ms=result.expires_at_ms,
            jti=result.jti,
        )

    @router.post(
        "/{skill_id}/invoke", status_code=202, response_model=SkillInvocationResponse
    )
    async def invoke_skill(
        skill_id: UUID,
        body: InvokeSkillRequest,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        x_user_id: UUID = Header(..., alias="X-User-Id"),  # noqa: B008
        svc: SkillService = Depends(skill_dependency),  # noqa: B008
    ) -> SkillInvocationResponse:
        invocation = await svc.invoke_skill.execute(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            invoked_by=x_user_id,
            skill_id=skill_id,
            arguments=body.arguments,
        )
        if not body.wait:
            return skill_invocation_to_dto(invocation)
        # Sync path: wait for terminal status, 504 → SandboxTimeout
        try:
            terminal = await svc.runner.wait(invocation.id)
        except SandboxTimeout:
            raise HTTPException(status_code=504, detail="SANDBOX_TIMEOUT")
        return skill_invocation_to_dto(terminal)

    @router.get("/invocations/{invocation_id}", response_model=SkillInvocationResponse)
    async def get_invocation(
        invocation_id: UUID,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        svc: SkillService = Depends(skill_dependency),  # noqa: B008
    ) -> SkillInvocationResponse:
        inv = await svc.get_invocation.execute(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            invocation_id=invocation_id,
        )
        return skill_invocation_to_dto(inv)

    @router.get("/invocations", response_model=SkillInvocationListResponse)
    async def list_invocations(
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        skill_id: UUID | None = Query(None),  # noqa: B008
        status: str | None = Query(None),
        limit: int = Query(50, ge=1, le=200),
        offset: int = Query(0, ge=0),
        svc: SkillService = Depends(skill_dependency),  # noqa: B008
    ) -> SkillInvocationListResponse:
        from deos.modules.skill.domain.entities import SkillInvocationStatus

        st = SkillInvocationStatus(status) if status else None
        items = await svc.list_invocations.execute(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            skill_id=skill_id,
            status=st,
            limit=limit,
            offset=offset,
        )
        return SkillInvocationListResponse(
            items=[skill_invocation_to_dto(i) for i in items],
            total=len(items),
        )

    @router.post(
        "/invocations/{invocation_id}/cancel",
        response_model=SkillInvocationResponse,
    )
    async def cancel_invocation(
        invocation_id: UUID,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        svc: SkillService = Depends(skill_dependency),  # noqa: B008
    ) -> JSONResponse | SkillInvocationResponse:
        from deos.modules.skill.domain.errors import SkillCancelled

        try:
            inv = await svc.cancel_invocation.execute(
                tenant_id=x_tenant_id,
                workspace_id=x_workspace_id,
                invocation_id=invocation_id,
            )
        except SkillCancelled as e:
            # Idempotent: return 200 + the cancelled status, not 4xx
            return JSONResponse(
                status_code=e.status,
                content={"code": e.code, "message": str(e)},
            )
        return skill_invocation_to_dto(inv)

    return router


__all__ = ["build_router", "skill_dependency"]
