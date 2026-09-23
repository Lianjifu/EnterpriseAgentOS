"""HTTP router for the model module.

Endpoints:

- ``POST   /v1/model-credentials``              register encrypted credential
- ``GET    /v1/model-credentials``              list credentials
- ``POST   /v1/model-credentials/{cid}/rotate`` rotate (admin only)
- ``POST   /v1/models``                         register model
- ``GET    /v1/models``                         list models
- ``GET    /v1/models/{mid}``                   get model
- ``PATCH  /v1/models/{mid}``                   update model (enable/disable)
- ``DELETE /v1/models/{mid}``                   delete model
- ``POST   /v1/models/{mid}/invoke``            hot-path LLM call
- ``POST   /v1/routing-policies``               register routing policy
- ``GET    /v1/routing-policies``               list routing policies

Auth + actor context is provided by ``eos_http``; the composition
container wires the actual ``ModelService`` instance via
``app.dependency_overrides``.
"""

from __future__ import annotations

from collections.abc import Callable, Coroutine
from typing import Annotated, Any
from uuid import UUID

from eos_schema.ids import (
    CredentialId,
    ModelId,
    RoutingPolicyId,
)
from fastapi import APIRouter, Path, Query, Request, status

from deos.modules.model.adapter.http.dto import (
    CredentialResponse,
    InvokeRequest,
    InvokeResponse,
    ModelListResponse,
    ModelResponse,
    RegisterCredentialRequest,
    RegisterModelRequest,
    RegisterRoutingPolicyRequest,
    RoutingPolicyResponse,
    UpdateModelRequest,
)
from deos.modules.model.adapter.http.mappers import (
    chat_response_to_invoke,
    credential_to_response,
    invoke_request_to_chat,
    model_list_to_response,
    model_to_response,
    routing_policy_to_response,
)
from deos.modules.model.application.services import ModelService
from deos.modules.model.domain.errors import (
    CredentialNotFound,
    ModelAlreadyExists,
    ModelError,
    ModelNotFound,
)
from deos.modules.model.domain.value_objects import ModelProvider

router = APIRouter(prefix="/v1", tags=["model"])

# Type alias for the service factory — the container injects the real
# service via Depends(make_model_service) overridden at composition time.
ServiceFactory = Callable[[], Coroutine[Any, Any, ModelService]]


def make_model_service(request: Request) -> ModelService:
    """Resolve the ``ModelService`` from app state.

    Wired by the composition container via ``app.state.model_service``.
    Falls back to ``request.app.state.model_service`` so test
    applications can override it without touching dependencies.
    """
    svc = getattr(request.app.state, "model_service", None)
    if svc is None:
        raise RuntimeError(
            "model_service is not configured; composition container "
            "must set app.state.model_service before serving"
        )
    return svc


# ── Credentials ───────────────────────────────────────────────────────────


@router.post(
    "/model-credentials",
    response_model=CredentialResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_credential(
    body: RegisterCredentialRequest,
    request: Request,
) -> CredentialResponse:
    svc = make_model_service(request)
    actor = _require_admin(request)
    cred = await svc.register_credential(
        actor=actor,
        provider=ModelProvider(body.provider),
        label=body.label,
        api_key=body.api_key,
        base_url=body.base_url,
    )
    return credential_to_response(cred)


@router.get(
    "/model-credentials",
    response_model=list[CredentialResponse],
)
async def list_credentials(request: Request) -> list[CredentialResponse]:
    svc = make_model_service(request)
    actor = _require_admin(request)
    creds = await svc.credential_repo.list(  # type: ignore[attr-defined]
        tenant_id=actor.tenant_id, limit=200
    )
    return [credential_to_response(c) for c in creds]


@router.post(
    "/model-credentials/{credential_id}/rotate",
    response_model=CredentialResponse,
)
async def rotate_credential(
    request: Request,
    credential_id: Annotated[UUID, Path()],
    body: RegisterCredentialRequest,
) -> CredentialResponse:
    svc = make_model_service(request)
    actor = _require_admin(request)
    rotated = await svc.rotate_credential(
        actor=actor,
        credential_id=CredentialId(credential_id),
        new_api_key=body.api_key,
    )
    return credential_to_response(rotated)


# ── Models ────────────────────────────────────────────────────────────────


@router.post(
    "/models",
    response_model=ModelResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_model(
    body: RegisterModelRequest,
    request: Request,
) -> ModelResponse:
    svc = make_model_service(request)
    actor = _require_admin(request)
    model = await svc.register(
        actor=actor,
        name=body.name,
        provider=ModelProvider(body.provider),
        upstream_model=body.upstream_model,
        workspace_id=body.workspace_id,
        credential_id=CredentialId(body.credential_id) if body.credential_id else None,
        routing_policy_id=RoutingPolicyId(body.routing_policy_id)
        if body.routing_policy_id
        else None,
    )
    return model_to_response(model)


@router.get("/models", response_model=ModelListResponse)
async def list_models(
    request: Request,
    enabled_only: bool = Query(default=False),
    limit: int = Query(default=100, ge=1, le=500),
) -> ModelListResponse:
    svc = make_model_service(request)
    actor = _require_actor(request)
    items = await svc.list_models(actor=actor, enabled_only=enabled_only, limit=limit)
    return model_list_to_response(items)


@router.get("/models/{model_id}", response_model=ModelResponse)
async def get_model(
    request: Request,
    model_id: Annotated[UUID, Path()],
) -> ModelResponse:
    svc = make_model_service(request)
    actor = _require_actor(request)
    model = await svc.model_repo.get(  # type: ignore[attr-defined]
        tenant_id=actor.tenant_id, model_id=ModelId(model_id)
    )
    if model is None:
        raise ModelNotFound(
            f"model {model_id} not found",
            code="MODEL_NOT_FOUND",
        )
    return model_to_response(model)


@router.patch("/models/{model_id}", response_model=ModelResponse)
async def update_model(
    request: Request,
    model_id: Annotated[UUID, Path()],
    body: UpdateModelRequest,
) -> ModelResponse:
    svc = make_model_service(request)
    actor = _require_admin(request)
    model = await svc.model_repo.get(  # type: ignore[attr-defined]
        tenant_id=actor.tenant_id, model_id=ModelId(model_id)
    )
    if model is None:
        raise ModelNotFound(
            f"model {model_id} not found",
            code="MODEL_NOT_FOUND",
        )
    updated = model
    if body.enabled is not None:
        updated = updated.with_enabled(body.enabled)
    if "credential_id" in body.model_fields_set:
        updated = updated.with_credential(
            CredentialId(body.credential_id) if body.credential_id else None
        )
    if "routing_policy_id" in body.model_fields_set:
        updated = updated.with_routing_policy(
            RoutingPolicyId(body.routing_policy_id) if body.routing_policy_id else None
        )
    await svc.model_repo.update(updated)  # type: ignore[attr-defined]
    return model_to_response(updated)


@router.delete(
    "/models/{model_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_model(
    request: Request,
    model_id: Annotated[UUID, Path()],
) -> None:
    svc = make_model_service(request)
    actor = _require_admin(request)
    deleted = await svc.model_repo.delete(  # type: ignore[attr-defined]
        tenant_id=actor.tenant_id, model_id=ModelId(model_id)
    )
    if not deleted:
        raise ModelNotFound(
            f"model {model_id} not found",
            code="MODEL_NOT_FOUND",
        )


# ── Invoke (hot path) ─────────────────────────────────────────────────────


@router.post(
    "/models/{model_id}/invoke",
    response_model=InvokeResponse,
)
async def invoke_model(
    request: Request,
    model_id: Annotated[UUID, Path()],
    body: InvokeRequest,
) -> InvokeResponse:
    svc = make_model_service(request)
    actor = _require_actor(request)
    model = await svc.model_repo.get(  # type: ignore[attr-defined]
        tenant_id=actor.tenant_id, model_id=ModelId(model_id)
    )
    if model is None:
        raise ModelNotFound(
            f"model {model_id} not found",
            code="MODEL_NOT_FOUND",
        )
    chat_req = invoke_request_to_chat(body, model.upstream_model)
    resp = await svc.invoke(actor=actor, model_id=ModelId(model_id), req=chat_req)
    return chat_response_to_invoke(resp)


# ── Routing policies ──────────────────────────────────────────────────────


@router.post(
    "/routing-policies",
    response_model=RoutingPolicyResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_routing_policy(
    request: Request,
    body: RegisterRoutingPolicyRequest,
) -> RoutingPolicyResponse:
    svc = make_model_service(request)
    actor = _require_admin(request)
    from deos.modules.model.domain.entities import make_routing_policy
    from deos.modules.model.domain.value_objects import RoutingStrategy

    policy = make_routing_policy(
        tenant_id=actor.tenant_id,
        strategy=RoutingStrategy(body.strategy),
        primary_model_id=ModelId(body.primary_model_id)
        if body.primary_model_id
        else None,
        failover_model_ids=[ModelId(m) for m in body.failover_model_ids],
        selection_rules=body.selection_rules,
    )
    await svc.routing_repo.add(policy)  # type: ignore[attr-defined]
    return routing_policy_to_response(policy)


@router.get(
    "/routing-policies",
    response_model=list[RoutingPolicyResponse],
)
async def list_routing_policies(request: Request) -> list[RoutingPolicyResponse]:
    svc = make_model_service(request)
    actor = _require_admin(request)
    policies = await svc.routing_repo.list(  # type: ignore[attr-defined]
        tenant_id=actor.tenant_id, limit=200
    )
    return [routing_policy_to_response(p) for p in policies]


# ── auth placeholders ─────────────────────────────────────────────────────


def _require_actor(request: Request):  # type: ignore[no-untyped-def]
    """Resolve the request actor from app state.

    Wired by the composition container; tests override via
    ``app.dependency_overrides[_require_actor]``.
    """
    actor = getattr(request.state, "actor", None)
    if actor is None:
        raise RuntimeError(
            "actor not resolved; auth middleware must populate "
            "request.state.actor before this router runs"
        )
    return actor


def _require_admin(request: Request):  # type: ignore[no-untyped-def]
    actor = _require_actor(request)
    roles: frozenset[str] = getattr(actor, "roles", frozenset())  # type: ignore[attr-defined]
    if "admin" not in roles:
        from eos_kernel.errors import ForbiddenError

        raise ForbiddenError(
            "admin role required",
            code="TENANT_DENIED",
        )
    return actor


__all__ = [
    "delete_model",
    "get_model",
    "invoke_model",
    "list_credentials",
    "list_models",
    "list_routing_policies",
    "make_model_service",
    "register_credential",
    "register_model",
    "register_routing_policy",
    "rotate_credential",
    "router",
    "update_model",
]


# Silence ruff — keep CredentialNotFound / ModelAlreadyExists /
# ModelError imports referenced via __all__ re-exports.
_ = (CredentialNotFound, ModelAlreadyExists, ModelError)
