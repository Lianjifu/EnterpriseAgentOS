"""HTTP adapter — FastAPI router + dependency wiring.

Public routes (mounted on `/v1/identity`):

  POST   /tenants                                  create_tenant
  POST   /workspaces                               create_workspace
  GET    /workspaces?tenant_id=...                 list_workspaces
  POST   /users                                    register_user
  GET    /users/{uid}                              get_user
  POST   /users/{uid}/api-keys                     issue_api_key
  POST   /users/{uid}/api-keys/{kid}/revoke        revoke_api_key
  POST   /login                                    login
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request

from deos.modules.identity.adapter.http.dto import (
    APIKeyResponse,
    CreateTenantRequest,
    CreateWorkspaceRequest,
    IssueAPIKeyRequest,
    LoginRequest,
    LoginResponse,
    RegisterUserRequest,
    TenantResponse,
    UserResponse,
    WorkspaceResponse,
)
from deos.modules.identity.adapter.http.mappers import (
    api_key_domain_to_response,
    tenant_domain_to_response,
    user_domain_to_response,
    workspace_domain_to_response,
)
from deos.modules.identity.application.services import IdentityService


def get_service(request: Request) -> IdentityService:
    """Sync facade — returns the per-request IdentityService. The actual
    session-bound instance is created by `get_identity_service` and cached on
    `request.state.identity_service` via the FastAPI dependency below."""
    svc = getattr(request.state, "identity_service", None)
    if svc is None:
        raise RuntimeError("IdentityService not bound on request.state")
    return svc


async def get_identity_service(request: Request) -> IdentityService:
    """FastAPI dependency — opens a per-request session and binds an
    IdentityService to it for the lifetime of the request. The session is
    committed on success and rolled back on exception."""
    factory = getattr(request.app.state, "identity_factory", None)
    container = getattr(request.app.state, "container", None)
    if factory is None or container is None:
        raise RuntimeError("IdentityService factory not wired on app.state")
    sf = container.session_factory()
    async with sf.session() as session:
        svc = factory.for_session(session)
        request.state.identity_service = svc
        try:
            yield svc
        except Exception:
            await session.rollback()
            raise
        await session.commit()


def build_router() -> APIRouter:
    router = APIRouter(prefix="/v1/identity", tags=["identity"])

    # ── tenants ────────────────────────────────────────────────────────────
    @router.post("/tenants", response_model=TenantResponse, status_code=201)
    async def create_tenant(
        body: CreateTenantRequest,
        svc: IdentityService = Depends(get_identity_service),  # noqa: B008
    ) -> TenantResponse:
        t = await svc.create_tenant().execute(
            slug=body.slug,
            display_name=body.display_name,
            metadata=body.metadata,
        )
        return tenant_domain_to_response(t)

    # ── workspaces ─────────────────────────────────────────────────────────
    @router.post("/workspaces", response_model=WorkspaceResponse, status_code=201)
    async def create_workspace(
        body: CreateWorkspaceRequest,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        svc: IdentityService = Depends(get_identity_service),  # noqa: B008
    ) -> WorkspaceResponse:
        w = await svc.create_workspace().execute(
            tenant_id=x_tenant_id, slug=body.slug, display_name=body.display_name
        )
        return workspace_domain_to_response(w)

    @router.get("/workspaces", response_model=list[WorkspaceResponse])
    async def list_workspaces(
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        limit: int = Query(50, ge=1, le=100),
        offset: int = Query(0, ge=0),
        svc: IdentityService = Depends(get_identity_service),  # noqa: B008
    ) -> list[WorkspaceResponse]:
        rows = await svc.workspaces.list_for_tenant(x_tenant_id, limit, offset)
        return [workspace_domain_to_response(r) for r in rows]

    # ── users ──────────────────────────────────────────────────────────────
    @router.post("/users", response_model=UserResponse, status_code=201)
    async def register_user(
        body: RegisterUserRequest,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        svc: IdentityService = Depends(get_identity_service),  # noqa: B008
    ) -> UserResponse:
        u = await svc.register_user().execute(
            tenant_id=x_tenant_id,
            email=body.email,
            display_name=body.display_name,
            password=body.password,
        )
        return user_domain_to_response(u)

    @router.get("/users/{uid}", response_model=UserResponse)
    async def get_user(
        uid: UUID,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        svc: IdentityService = Depends(get_identity_service),  # noqa: B008
    ) -> UserResponse:
        from eos_kernel.errors import ForbiddenError

        u = await svc.users.get(uid)
        if u is None:
            from deos.modules.identity.domain.errors import UserNotFound

            raise UserNotFound(f"user {uid} not found")
        if u.tenant_id != x_tenant_id:
            raise ForbiddenError("cross-tenant access", code="TENANT_DENIED")
        return user_domain_to_response(u)

    # ── API keys ───────────────────────────────────────────────────────────
    @router.post(
        "/users/{uid}/api-keys",
        response_model=APIKeyResponse,
        status_code=201,
    )
    async def issue_api_key(
        uid: UUID,
        body: IssueAPIKeyRequest,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        svc: IdentityService = Depends(get_identity_service),  # noqa: B008
    ) -> APIKeyResponse:
        from eos_kernel.errors import ForbiddenError

        # Owner must belong to the calling tenant; defense in depth on top
        # of the with_loader_criteria auto-filter.
        owner = await svc.users.get(uid)
        if owner is None or owner.tenant_id != x_tenant_id:
            raise ForbiddenError("cross-tenant access", code="TENANT_DENIED")
        # If a workspace is supplied, it must also belong to the tenant.
        if body.workspace_id is not None:
            ws = await svc.workspaces.get(body.workspace_id)
            if ws is None or ws.tenant_id != x_tenant_id:
                raise ForbiddenError("cross-tenant workspace", code="WORKSPACE_DENIED")
        k, raw = await svc.issue_api_key().execute(
            owner_user_id=uid,
            name=body.name,
            workspace_id=body.workspace_id,
            ttl_days=body.ttl_days,
        )
        return api_key_domain_to_response(k, raw=raw)

    @router.post(
        "/users/{uid}/api-keys/{kid}/revoke",
        status_code=204,
    )
    async def revoke_api_key(
        uid: UUID,
        kid: UUID,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        svc: IdentityService = Depends(get_identity_service),  # noqa: B008
    ) -> None:
        from eos_kernel.errors import ForbiddenError

        existing = await svc.api_keys.get(kid)
        if (
            existing is None
            or existing.tenant_id != x_tenant_id
            or existing.owner_user_id != uid
        ):
            raise ForbiddenError("cross-tenant access", code="TENANT_DENIED")
        await svc.revoke_api_key().execute(api_key_id=kid)

    # ── login ──────────────────────────────────────────────────────────────
    @router.post("/login", response_model=LoginResponse)
    async def login(
        body: LoginRequest,
        svc: IdentityService = Depends(get_identity_service),  # noqa: B008
    ) -> LoginResponse:
        token, exp = await svc.login().execute(
            tenant_id=body.tenant_id, email=body.email, password=body.password
        )
        return LoginResponse(access_token=token, expires_at=exp)

    return router


# Alias used by the composition root
router = build_router


# Module attribute for ``router: APIRouter = build_router()``
def __getattr__(name: str) -> Any:
    if name == "router":
        return build_router()
    raise AttributeError(name)
