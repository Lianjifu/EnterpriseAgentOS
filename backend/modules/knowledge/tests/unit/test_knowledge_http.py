"""HTTP integration tests for /v1/knowledge.

Uses an in-memory ``KnowledgeService`` wired into a tiny FastAPI app.
Verifies route shapes, header requirements, and 200/201/202/422/503
status codes.
"""

from __future__ import annotations

import base64
from uuid import uuid4

from _knowledge_unit_in_memory import (
    DeterministicEmbedding,
    InMemoryKnowledgeRepository,
    InMemoryStorage,
    InMemoryVectorSearch,
    RecordingPublisher,
)
from fastapi import FastAPI
from fastapi.testclient import TestClient

from deos.modules.knowledge.adapter.http.factory import KnowledgeServiceFactory
from deos.modules.knowledge.adapter.http.router import build_router
from deos.modules.knowledge.application.chunker import FixedWindowChunker
from deos.modules.knowledge.application.services import KnowledgeService
from deos.modules.knowledge.application.use_cases.ingest_asset import (
    IngestKnowledgeAssetUseCase,
)


def _build_app() -> tuple[FastAPI, KnowledgeService]:
    repo = InMemoryKnowledgeRepository()
    storage = InMemoryStorage()
    vec = InMemoryVectorSearch()
    embed = DeterministicEmbedding()
    pub = RecordingPublisher()
    chunker = FixedWindowChunker()
    ingest = IngestKnowledgeAssetUseCase(
        repository=repo,
        storage=storage,
        embedding=embed,
        chunker=chunker,
        vector_search=vec,
        publisher=pub,
    )
    svc = KnowledgeService.from_parts(
        repository=repo,
        storage=storage,
        embedding=embed,
        vector_search=vec,
        publisher=pub,
        chunker=chunker,
    )

    # Replace ``IngestTextUseCase.execute`` with a closure that always
    # forwards to the ``IngestKnowledgeAssetUseCase`` pipeline.
    #
    # Capture the original ``execute`` BEFORE swapping, otherwise we'd
    # recursively call ourselves via ``self._base.ingest_text`` (which
    # IS the pipeline wrapper after the swap).
    original_execute = svc.ingest_text.execute

    class _PipelineTextUseCase:  # duck-typed as IngestTextUseCase
        def __init__(self, pipeline: IngestKnowledgeAssetUseCase) -> None:
            self._pipeline = pipeline
            self._original = original_execute

        async def execute(self, **kwargs):  # type: ignore[no-untyped-def]
            asset = await self._original(**kwargs)
            return await self._pipeline.execute(
                tenant_id=kwargs["tenant_id"], asset_id=asset.id
            )

    pipeline_text = _PipelineTextUseCase(ingest)
    object.__setattr__(svc, "ingest_text", pipeline_text)  # type: ignore[arg-type]

    app = FastAPI()
    app.state.knowledge_service_factory = _ConstantFactory(svc)
    app.include_router(build_router())
    from eos_http.error_envelope import error_envelope_middleware
    from starlette.middleware.base import BaseHTTPMiddleware

    app.add_middleware(BaseHTTPMiddleware, dispatch=error_envelope_middleware)
    return app, svc


class _ConstantFactory(KnowledgeServiceFactory):
    def __init__(self, svc: KnowledgeService) -> None:
        self._svc = svc

    def for_session(self) -> KnowledgeService:
        return self._svc


def _hdrs(tenant=None, ws=None, user=None) -> dict[str, str]:
    return {
        "X-Tenant-Id": tenant or str(uuid4()),
        "X-Workspace-Id": ws or str(uuid4()),
        "X-User-Id": user or str(uuid4()),
    }


# ── packages ────────────────────────────────────────────────────────────


def test_create_package_returns_201_and_id() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    resp = client.post(
        "/v1/knowledge/packages",
        headers=_hdrs(),
        json={"name": "faq", "description": "FAQ pkg"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["name"] == "faq"
    assert body["status"] == "active"
    assert body["asset_count"] == 0


def test_create_package_rejects_duplicate_name() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = _hdrs()
    client.post("/v1/knowledge/packages", headers=hdr, json={"name": "faq"})
    resp = client.post("/v1/knowledge/packages", headers=hdr, json={"name": "faq"})
    assert resp.status_code == 409


def test_create_package_rejects_extra_field() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    resp = client.post(
        "/v1/knowledge/packages",
        headers=_hdrs(),
        json={"name": "x", "unknown": 1},
    )
    assert resp.status_code == 422


def test_list_packages_returns_total() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = _hdrs()
    for n in ("a", "b", "c"):
        client.post("/v1/knowledge/packages", headers=hdr, json={"name": n})
    resp = client.get("/v1/knowledge/packages", headers=hdr)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    assert {i["name"] for i in body["items"]} == {"a", "b", "c"}


def test_get_package_returns_dto() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = _hdrs()
    pid = client.post(
        "/v1/knowledge/packages", headers=hdr, json={"name": "p"}
    ).json()["id"]
    resp = client.get(f"/v1/knowledge/packages/{pid}", headers=hdr)
    assert resp.status_code == 200
    assert resp.json()["id"] == pid


def test_get_package_cross_workspace_returns_404() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr_a = _hdrs()
    pid = client.post(
        "/v1/knowledge/packages", headers=hdr_a, json={"name": "p"}
    ).json()["id"]
    hdr_b = {
        "X-Tenant-Id": hdr_a["X-Tenant-Id"],
        "X-Workspace-Id": str(uuid4()),
        "X-User-Id": hdr_a["X-User-Id"],
    }
    resp = client.get(f"/v1/knowledge/packages/{pid}", headers=hdr_b)
    assert resp.status_code == 404


def test_revoke_package_returns_revoked_status() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = _hdrs()
    pid = client.post(
        "/v1/knowledge/packages", headers=hdr, json={"name": "p"}
    ).json()["id"]
    resp = client.delete(f"/v1/knowledge/packages/{pid}", headers=hdr)
    assert resp.status_code == 200
    assert resp.json()["status"] == "revoked"


# ── assets ──────────────────────────────────────────────────────────────


def test_text_ingest_returns_202_and_ready() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = _hdrs()
    pid = client.post(
        "/v1/knowledge/packages", headers=hdr, json={"name": "p"}
    ).json()["id"]
    resp = client.post(
        f"/v1/knowledge/packages/{pid}/assets/text",
        headers=hdr,
        json={"name": "doc.txt", "text": "How to reset your password."},
    )
    assert resp.status_code == 202, resp.text
    body = resp.json()
    assert body["package_id"] == pid
    assert body["status"] in {"ready", "processing"}


def test_upload_asset_b64_returns_201() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = _hdrs()
    pid = client.post(
        "/v1/knowledge/packages", headers=hdr, json={"name": "p"}
    ).json()["id"]
    payload = base64.b64encode(b"hello bytes").decode("ascii")
    resp = client.post(
        f"/v1/knowledge/packages/{pid}/assets",
        headers=hdr,
        params={
            "name": "blob.bin",
            "kind": "text",
            "mime_type": "text/plain",
            "data_b64": payload,
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["byte_size"] == len(b"hello bytes")
    assert body["storage_uri"].startswith("knowledge-asset://")


def test_upload_asset_b64_rejects_invalid_base64() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = _hdrs()
    pid = client.post(
        "/v1/knowledge/packages", headers=hdr, json={"name": "p"}
    ).json()["id"]
    resp = client.post(
        f"/v1/knowledge/packages/{pid}/assets",
        headers=hdr,
        params={
            "name": "blob.bin",
            "kind": "text",
            "mime_type": "text/plain",
            "data_b64": "not!valid!base64",
        },
    )
    assert resp.status_code == 422


def test_detach_asset_returns_revoked() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = _hdrs()
    pid = client.post(
        "/v1/knowledge/packages", headers=hdr, json={"name": "p"}
    ).json()["id"]
    aid = client.post(
        f"/v1/knowledge/packages/{pid}/assets/text",
        headers=hdr,
        json={"name": "doc.txt", "text": "hello"},
    ).json()["id"]
    resp = client.delete(f"/v1/knowledge/assets/{aid}", headers=hdr)
    assert resp.status_code == 200
    assert resp.json()["status"] == "revoked"


# ── search ──────────────────────────────────────────────────────────────


def test_search_returns_hits_after_ingest() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = _hdrs()
    pid = client.post(
        "/v1/knowledge/packages", headers=hdr, json={"name": "p"}
    ).json()["id"]
    client.post(
        f"/v1/knowledge/packages/{pid}/assets/text",
        headers=hdr,
        json={"name": "faq.txt", "text": "How to reset your password."},
    )
    resp = client.post(
        f"/v1/knowledge/packages/{pid}/search",
        headers=hdr,
        json={"query": "reset password", "top_k": 5},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["query"] == "reset password"
    assert body["top_k"] == 5
    assert body["results"], "expected at least one hit"
    for hit in body["results"]:
        assert hit["package_id"] == pid
        assert "score" in hit


def test_search_rejects_empty_query() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = _hdrs()
    pid = client.post(
        "/v1/knowledge/packages", headers=hdr, json={"name": "p"}
    ).json()["id"]
    resp = client.post(
        f"/v1/knowledge/packages/{pid}/search",
        headers=hdr,
        json={"query": ""},
    )
    assert resp.status_code == 422


# ── error envelope / wiring ─────────────────────────────────────────────


def test_missing_factory_returns_503() -> None:
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    app = FastAPI()
    app.include_router(build_router())  # NO factory wired
    client = TestClient(app)
    resp = client.post(
        "/v1/knowledge/packages",
        headers=_hdrs(),
        json={"name": "p"},
    )
    assert resp.status_code == 503


__all__: list[str] = []
