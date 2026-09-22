"""FastAPI app factory."""

from __future__ import annotations

from typing import Annotated

from eos_auth.dependencies import (
    AuthenticatedPrincipal,
    require_authenticated,
    require_role,
)
from eos_http.cors import build_cors_config
from eos_http.health import health_router, liveness_router, readiness_router
from eos_http.middleware import build_default_middleware_chain
from eos_http.rate_limit import RateLimitPolicy
from eos_persistence.tenant_guard import install_tenant_loader
from eos_vault.actor import ActorContext
from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse

from deos.composition.container import Container
from deos.composition.lifespan import lifespan
from deos.composition.settings import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    container = Container(settings)

    app = FastAPI(
        title="Enterprise Agent OS",
        version="0.1.0",
        debug=settings.debug,
        lifespan=lifespan,
    )

    app.state.container = container
    app.state.settings = settings

    # Health
    app.include_router(health_router)
    app.include_router(liveness_router)
    app.include_router(readiness_router)

    # Identity module
    from deos.modules.identity.adapter.http.router import (
        build_router as identity_router,
    )

    app.include_router(identity_router())

    # Agent runtime module
    from deos.modules.agent_runtime.adapter.http.router import (
        build_router as agent_runtime_router,
    )

    app.include_router(agent_runtime_router())

    # Tool module
    from deos.modules.tool.adapter.http.router import build_router as tool_router

    app.include_router(tool_router())

    # Skill module
    from deos.modules.skill.adapter.http.router import build_router as skill_router

    app.include_router(skill_router())

    # Memory module
    from deos.modules.memory.adapter.http.router import build_router as memory_router

    app.include_router(memory_router())

    # Governance module — /v1/policies + /v1/approvals
    from deos.modules.governance.adapter.http.factory import (
        make_approval_service,
        make_policy_evaluator,
        make_policy_service,
    )
    from deos.modules.governance.adapter.http.router import (
        _require_actor,
        _require_admin,
    )
    from deos.modules.governance.adapter.http.router import (
        router as governance_router,
    )

    app.include_router(governance_router)

    def _actor_from_principal(p: AuthenticatedPrincipal) -> ActorContext:
        return ActorContext(
            tenant_id=p.tenant_id,
            workspace_id=p.workspace_id,
            principal_id=p.principal.id,
            roles=frozenset(p.principal.roles),
        )

    async def _resolve_actor(
        p: Annotated[AuthenticatedPrincipal, Depends(require_authenticated)],
    ) -> ActorContext:
        return _actor_from_principal(p)

    async def _resolve_admin(
        p: Annotated[AuthenticatedPrincipal, Depends(require_role("admin"))],
    ) -> ActorContext:
        return _actor_from_principal(p)

    app.dependency_overrides[_require_actor] = _resolve_actor
    app.dependency_overrides[_require_admin] = _resolve_admin
    app.dependency_overrides[make_policy_service] = lambda: container.policy_service()
    app.dependency_overrides[make_approval_service] = lambda: container.approval_service()
    app.dependency_overrides[make_policy_evaluator] = lambda: container.policy_evaluator()

    # P6 model module — /v1/models + /v1/model-credentials + /v1/routing-policies
    from deos.modules.model.adapter.http.router import (
        _require_actor as model_require_actor,
    )
    from deos.modules.model.adapter.http.router import (
        _require_admin as model_require_admin,
    )
    from deos.modules.model.adapter.http.router import (
        router as model_router,
    )

    app.include_router(model_router)
    app.dependency_overrides[model_require_actor] = _resolve_actor
    app.dependency_overrides[model_require_admin] = _resolve_admin

    # P6 channel module — /v1/channels CRUD + /v1/channels/{cid}/webhook
    from deos.modules.channel.adapter.http.router import (
        _require_actor as channel_require_actor,
    )
    from deos.modules.channel.adapter.http.router import (
        _require_admin as channel_require_admin,
    )
    from deos.modules.channel.adapter.http.router import (
        router as channel_router,
    )

    app.include_router(channel_router)
    app.dependency_overrides[channel_require_actor] = _resolve_actor
    app.dependency_overrides[channel_require_admin] = _resolve_admin

    # Metrics endpoint
    @app.get(settings.metrics_path)
    async def metrics() -> JSONResponse:
        from eos_observability.metrics import render_prometheus

        body, content_type = render_prometheus()
        return JSONResponse(content=body.decode(), media_type=content_type)

    # Wire the ORM tenant-loader so every TenantScopedLoader query is
    # auto-filtered by the current request's tenant id.
    install_tenant_loader()

    # Middleware chain — outermost: ErrorEnvelope → Observability →
    # RateLimit → CORS → Auth → TenantGuard → WorkspaceGuard → App.
    build_default_middleware_chain(
        app,
        cors=build_cors_config(
            {
                "EOS_CORS_ALLOW_ORIGINS": settings.cors_allow_origins,
                "EOS_CORS_ALLOW_CREDENTIALS": str(
                    settings.cors_allow_credentials
                ).lower(),
                "EOS_CORS_ALLOW_METHODS": settings.cors_allow_methods,
                "EOS_CORS_ALLOW_HEADERS": settings.cors_allow_headers,
            }
        ),
        rate_limit=RateLimitPolicy(
            requests_per_minute=settings.rate_limit_per_tenant_per_min,
            window_seconds=settings.rate_limit_window_seconds,
        ),
        # Pass the verifier directly; the chain mounts AuthMiddleware via
        # `app.add_middleware(AuthMiddleware, verifier=...)` itself.
        auth_verifier=container.jwt_verifier(),
    )

    return app


# Alias for `uvicorn deos.composition.main:app` (older uvicorn pattern)
app = create_app() if False else None  # pragma: no cover


def __getattr__(name: str):  # type: ignore[no-untyped-def]
    if name == "app":
        return create_app()
    raise AttributeError(name)
