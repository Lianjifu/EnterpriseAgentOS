"""HTTP router for the knowledge module: packages + assets + search.

Mounts under ``/v1/knowledge`` (FastAPI prefix).  Per-request service is
resolved via :func:`knowledge_service_dependency`.
"""

from __future__ import annotations

import base64
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request

from deos.modules.knowledge.adapter.http.dto import (
    AssetTextRequest,
    CreateKnowledgePackageRequest,
    KnowledgeAssetListResponse,
    KnowledgeAssetResponse,
    KnowledgePackageListResponse,
    KnowledgePackageResponse,
    SearchKnowledgeRequest,
    SearchKnowledgeResponse,
)
from deos.modules.knowledge.adapter.http.factory import KnowledgeServiceFactory
from deos.modules.knowledge.adapter.http.mappers import (
    asset_to_dto,
    package_to_dto,
    search_hit_to_dto,
)
from deos.modules.knowledge.application.services import KnowledgeService
from deos.modules.knowledge.domain.value_objects import KnowledgeAssetKind


async def knowledge_service_dependency(
    request: Request,
) -> KnowledgeService:
    """Yield a per-request ``KnowledgeService``.

    Production wires ``KnowledgeServiceFactory`` via ``app.state``; tests
    pre-populate ``app.state.knowledge_service_factory`` with an in-memory
    factory.  When the factory is missing we surface 503.
    """
    factory: KnowledgeServiceFactory | None = getattr(
        request.app.state, "knowledge_service_factory", None
    )
    if factory is None:
        raise HTTPException(
            status_code=503, detail="knowledge service factory not wired"
        )
    return factory.for_session()


def _build_multipart_router() -> APIRouter | None:
    """Return a sub-router exposing ``/assets/upload`` (multipart).

    Returns ``None`` when ``python-multipart`` is not installed so
    ``build_router()`` stays import-safe in tests + minimal installs.
    Callers that want the multipart endpoint should call
    :func:`build_multipart_router` and include its result.
    """
    try:
        from fastapi import File, Form, UploadFile  # type: ignore[import-untyped]
    except Exception:  # pragma: no cover - missing optional dep  # noqa: BLE001
        return None

    from eos_schema.ids import KnowledgePackageId, UserId

    sub = APIRouter(prefix="/v1/knowledge", tags=["knowledge"])

    @sub.post(
        "/packages/{package_id}/assets/upload",
        status_code=201,
        response_model=KnowledgeAssetResponse,
    )
    async def upload_asset_multipart(
        package_id: UUID,
        name: str = Form(..., min_length=1, max_length=256),
        kind: str = Form(..., min_length=1, max_length=16),
        mime_type: str = Form(default="application/octet-stream", max_length=128),
        file: UploadFile = File(...),  # noqa: B008
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        x_user_id: UUID = Header(..., alias="X-User-Id"),  # noqa: B008
        svc: KnowledgeService = Depends(knowledge_service_dependency),  # noqa: B008
    ) -> KnowledgeAssetResponse:
        data = await file.read()
        asset = await svc.upload_asset.execute(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            package_id=KnowledgePackageId(package_id),
            name=name,
            mime_type=mime_type,
            kind=KnowledgeAssetKind(kind),
            data=data,
            actor_id=UserId(x_user_id),
        )
        return asset_to_dto(asset)

    return sub


def build_router() -> APIRouter:
    router = APIRouter(prefix="/v1/knowledge", tags=["knowledge"])

    # ── packages ────────────────────────────────────────────────────────

    @router.post(
        "/packages",
        status_code=201,
        response_model=KnowledgePackageResponse,
    )
    async def create_package(
        body: CreateKnowledgePackageRequest,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        x_user_id: UUID = Header(..., alias="X-User-Id"),  # noqa: B008
        svc: KnowledgeService = Depends(knowledge_service_dependency),  # noqa: B008
    ) -> KnowledgePackageResponse:
        from eos_schema.ids import UserId

        pkg = await svc.create_package.execute(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            name=body.name,
            description=body.description,
            metadata=body.metadata,
            created_by=UserId(x_user_id),
            signature=body.signature,
            signer_key_id=body.signer_key_id,
            image_digest=body.image_digest,
        )
        return package_to_dto(pkg)

    @router.get(
        "/packages",
        response_model=KnowledgePackageListResponse,
    )
    async def list_packages(
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        limit: int = Query(50, ge=1, le=200),
        svc: KnowledgeService = Depends(knowledge_service_dependency),  # noqa: B008
    ) -> KnowledgePackageListResponse:
        rows = await svc.list_packages.execute(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            limit=limit,
        )
        items = [package_to_dto(r) for r in rows]
        return KnowledgePackageListResponse(items=items, total=len(items))

    @router.get(
        "/packages/{package_id}",
        response_model=KnowledgePackageResponse,
    )
    async def get_package(
        package_id: UUID,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        svc: KnowledgeService = Depends(knowledge_service_dependency),  # noqa: B008
    ) -> KnowledgePackageResponse:
        from eos_schema.ids import KnowledgePackageId

        pkg = await svc.get_package.execute(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            package_id=KnowledgePackageId(package_id),
        )
        return package_to_dto(pkg)

    @router.delete(
        "/packages/{package_id}",
        status_code=200,
        response_model=KnowledgePackageResponse,
    )
    async def revoke_package(
        package_id: UUID,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        x_user_id: UUID = Header(..., alias="X-User-Id"),  # noqa: B008
        svc: KnowledgeService = Depends(knowledge_service_dependency),  # noqa: B008
    ) -> KnowledgePackageResponse:
        from eos_schema.ids import KnowledgePackageId, UserId

        pkg = await svc.revoke_package.execute(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            package_id=KnowledgePackageId(package_id),
            actor_id=UserId(x_user_id),
        )
        return package_to_dto(pkg)

    # ── assets: list ────────────────────────────────────────────────────

    @router.get(
        "/packages/{package_id}/assets",
        response_model=KnowledgeAssetListResponse,
    )
    async def list_assets(
        package_id: UUID,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        svc: KnowledgeService = Depends(knowledge_service_dependency),  # noqa: B008
    ) -> KnowledgeAssetListResponse:
        from eos_schema.ids import KnowledgePackageId

        rows = await svc.list_assets.execute(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            package_id=KnowledgePackageId(package_id),
        )
        items = [asset_to_dto(r) for r in rows]
        return KnowledgeAssetListResponse(items=items, total=len(items))

    # ── assets: text ingest ─────────────────────────────────────────────

    @router.post(
        "/packages/{package_id}/assets/text",
        status_code=202,
        response_model=KnowledgeAssetResponse,
    )
    async def ingest_text(
        package_id: UUID,
        body: AssetTextRequest,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        x_user_id: UUID = Header(..., alias="X-User-Id"),  # noqa: B008
        svc: KnowledgeService = Depends(knowledge_service_dependency),  # noqa: B008
    ) -> KnowledgeAssetResponse:
        from eos_schema.ids import KnowledgePackageId, UserId

        asset = await svc.ingest_text.execute(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            package_id=KnowledgePackageId(package_id),
            name=body.name,
            text=body.text,
            mime_type=body.mime_type,
            metadata=body.metadata,
            actor_id=UserId(x_user_id),
        )
        return asset_to_dto(asset)

    # ── assets: JSON body with base64 payload ───────────────────────────

    @router.post(
        "/packages/{package_id}/assets",
        status_code=201,
        response_model=KnowledgeAssetResponse,
    )
    async def upload_asset_b64(
        package_id: UUID,
        name: str = Query(..., min_length=1, max_length=256),
        kind: str = Query(..., min_length=1, max_length=16),
        mime_type: str = Query(default="application/octet-stream", max_length=128),
        data_b64: str = Query(..., min_length=1),
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        x_user_id: UUID = Header(..., alias="X-User-Id"),  # noqa: B008
        svc: KnowledgeService = Depends(knowledge_service_dependency),  # noqa: B008
    ) -> KnowledgeAssetResponse:
        from eos_schema.ids import KnowledgePackageId, UserId

        try:
            data = base64.b64decode(data_b64, validate=True)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(
                status_code=422, detail=f"invalid base64 payload: {exc}"
            )
        asset = await svc.upload_asset.execute(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            package_id=KnowledgePackageId(package_id),
            name=name,
            mime_type=mime_type,
            kind=KnowledgeAssetKind(kind),
            data=data,
            actor_id=UserId(x_user_id),
        )
        return asset_to_dto(asset)

    # ── assets: detach ──────────────────────────────────────────────────

    @router.delete(
        "/assets/{asset_id}",
        status_code=200,
        response_model=KnowledgeAssetResponse,
    )
    async def detach_asset(
        asset_id: UUID,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        x_user_id: UUID = Header(..., alias="X-User-Id"),  # noqa: B008
        svc: KnowledgeService = Depends(knowledge_service_dependency),  # noqa: B008
    ) -> KnowledgeAssetResponse:
        from eos_schema.ids import KnowledgeAssetId, UserId

        asset = await svc.detach_asset.execute(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            asset_id=KnowledgeAssetId(asset_id),
            actor_id=UserId(x_user_id),
        )
        return asset_to_dto(asset)

    # ── search ──────────────────────────────────────────────────────────

    @router.post(
        "/packages/{package_id}/search",
        response_model=SearchKnowledgeResponse,
    )
    async def search_in_package(
        package_id: UUID,
        body: SearchKnowledgeRequest,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        svc: KnowledgeService = Depends(knowledge_service_dependency),  # noqa: B008
    ) -> SearchKnowledgeResponse:
        asset_kind = (
            KnowledgeAssetKind(body.asset_kind) if body.asset_kind else None
        )
        rows = await svc.search_query(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            query=body.query,
            top_k=body.top_k,
            package_ids=(str(package_id),),
            asset_kind=asset_kind,
        )
        return SearchKnowledgeResponse(
            query=body.query,
            top_k=body.top_k,
            results=[search_hit_to_dto(r) for r in rows],
        )

    @router.post(
        "/search",
        response_model=SearchKnowledgeResponse,
    )
    async def search_workspace(
        body: SearchKnowledgeRequest,
        x_tenant_id: UUID = Header(..., alias="X-Tenant-Id"),  # noqa: B008
        x_workspace_id: UUID = Header(..., alias="X-Workspace-Id"),  # noqa: B008
        svc: KnowledgeService = Depends(knowledge_service_dependency),  # noqa: B008
    ) -> SearchKnowledgeResponse:
        asset_kind = (
            KnowledgeAssetKind(body.asset_kind) if body.asset_kind else None
        )
        rows = await svc.search_query(
            tenant_id=x_tenant_id,
            workspace_id=x_workspace_id,
            query=body.query,
            top_k=body.top_k,
            package_ids=tuple(body.package_ids),
            asset_kind=asset_kind,
        )
        return SearchKnowledgeResponse(
            query=body.query,
            top_k=body.top_k,
            results=[search_hit_to_dto(r) for r in rows],
        )

    return router


def build_multipart_router() -> APIRouter | None:
    """Returns the multipart sub-router or ``None`` if python-multipart
    is not installed.  Callers can include it conditionally."""
    return _build_multipart_router()


__all__ = [
    "build_multipart_router",
    "build_router",
    "knowledge_service_dependency",
]
