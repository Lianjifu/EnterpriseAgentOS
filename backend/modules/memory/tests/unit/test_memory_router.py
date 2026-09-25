"""HTTP integration tests for /v1/memories.

Uses an in-memory ``MemoryService`` (from the unit test fakes) wired into
a tiny FastAPI app.  Verifies route shapes, header requirements, and
200/201/422/404 status codes.
"""

from __future__ import annotations

from uuid import uuid4

from _memory_unit_in_memory import (
    DeterministicEmbedding,
    InMemoryMemoryRepository,
    InMemoryPolicyRepository,
    InMemoryVectorSearch,
    RecordingPublisher,
)
from fastapi import FastAPI
from fastapi.testclient import TestClient

from deos.modules.memory.adapter.http.factory import MemoryServiceFactory
from deos.modules.memory.adapter.http.router import build_router
from deos.modules.memory.application.services import MemoryService
from deos.modules.memory.domain.entities import EMBEDDING_DIM


def _build_app() -> tuple[FastAPI, MemoryService]:
    repo = InMemoryMemoryRepository()
    vs = InMemoryVectorSearch()
    emb = DeterministicEmbedding()
    pub = RecordingPublisher()
    policy_repo = InMemoryPolicyRepository()
    svc = MemoryService.from_parts(
        repository=repo,
        vector_search=vs,
        embedding=emb,
        publisher=pub,
        policy_repository=policy_repo,
    )

    app = FastAPI()
    app.state.memory_service_factory = _ConstantFactory(svc)
    app.include_router(build_router())
    # mirror composition root: AppError → JSON envelope with correct status
    from eos_http.error_envelope import error_envelope_middleware
    from starlette.middleware.base import BaseHTTPMiddleware

    app.add_middleware(BaseHTTPMiddleware, dispatch=error_envelope_middleware)
    return app, svc


class _ConstantFactory(MemoryServiceFactory):
    """Test-only factory that always returns the same service."""

    def __init__(self, svc: MemoryService) -> None:
        self._svc = svc

    def for_session(self) -> MemoryService:
        return self._svc


def test_post_creates_memory_returns_201() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    tenant = str(uuid4())
    ws = str(uuid4())
    user = str(uuid4())

    resp = client.post(
        "/v1/memories",
        headers={
            "X-Tenant-Id": tenant,
            "X-Workspace-Id": ws,
            "X-User-Id": user,
        },
        json={"scope": "workspace", "content": "hello world"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["content"] == "hello world"
    assert body["scope"] == "workspace"
    assert body["embedding_dim"] == EMBEDDING_DIM
    assert body["revoked"] is False


def test_post_validation_rejects_empty_content() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    resp = client.post(
        "/v1/memories",
        headers={
            "X-Tenant-Id": str(uuid4()),
            "X-Workspace-Id": str(uuid4()),
            "X-User-Id": str(uuid4()),
        },
        json={"scope": "workspace", "content": "   "},
    )
    assert resp.status_code == 422


def test_post_rejects_unknown_scope_literal() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    resp = client.post(
        "/v1/memories",
        headers={
            "X-Tenant-Id": str(uuid4()),
            "X-Workspace-Id": str(uuid4()),
            "X-User-Id": str(uuid4()),
        },
        json={"scope": "global", "content": "x"},
    )
    assert resp.status_code == 422


def test_recall_returns_hits() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    tenant = str(uuid4())
    ws = str(uuid4())
    user = str(uuid4())
    hdr = {"X-Tenant-Id": tenant, "X-Workspace-Id": ws, "X-User-Id": user}

    # write 3 entries
    for c in ["alpha bravo", "alpha charlie", "delta echo"]:
        r = client.post(
            "/v1/memories", headers=hdr, json={"scope": "workspace", "content": c}
        )
        assert r.status_code == 201

    resp = client.post(
        "/v1/memories/recall", headers=hdr, json={"query": "alpha", "top_k": 2}
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["query"] == "alpha"
    assert body["top_k"] == 2
    assert len(body["results"]) == 2
    # top hit must contain 'alpha'
    assert "alpha" in body["results"][0]["content"]


def test_get_returns_existing_memory() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    tenant = str(uuid4())
    ws = str(uuid4())
    user = str(uuid4())
    hdr = {"X-Tenant-Id": tenant, "X-Workspace-Id": ws, "X-User-Id": user}

    created = client.post(
        "/v1/memories", headers=hdr, json={"scope": "user", "content": "hello"}
    ).json()
    mid = created["id"]

    resp = client.get(f"/v1/memories/{mid}", headers=hdr)
    assert resp.status_code == 200
    assert resp.json()["id"] == mid


def test_get_wrong_workspace_returns_404() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr_a = {
        "X-Tenant-Id": str(uuid4()),
        "X-Workspace-Id": str(uuid4()),
        "X-User-Id": str(uuid4()),
    }
    hdr_b = {
        "X-Tenant-Id": hdr_a["X-Tenant-Id"],
        "X-Workspace-Id": str(uuid4()),
        "X-User-Id": hdr_a["X-User-Id"],
    }
    created = client.post(
        "/v1/memories",
        headers=hdr_a,
        json={"scope": "workspace", "content": "x"},
    ).json()
    mid = created["id"]

    resp = client.get(f"/v1/memories/{mid}", headers=hdr_b)
    assert resp.status_code == 404


def test_list_returns_items_and_total() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = {
        "X-Tenant-Id": str(uuid4()),
        "X-Workspace-Id": str(uuid4()),
        "X-User-Id": str(uuid4()),
    }
    for c in ["a", "b", "c"]:
        client.post(
            "/v1/memories", headers=hdr, json={"scope": "workspace", "content": c}
        )

    resp = client.get("/v1/memories", headers=hdr)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    assert len(body["items"]) == 3


def test_list_filters_by_scope() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = {
        "X-Tenant-Id": str(uuid4()),
        "X-Workspace-Id": str(uuid4()),
        "X-User-Id": str(uuid4()),
    }
    client.post("/v1/memories", headers=hdr, json={"scope": "user", "content": "u1"})
    client.post(
        "/v1/memories", headers=hdr, json={"scope": "workspace", "content": "w1"}
    )

    resp = client.get("/v1/memories?scope=user", headers=hdr)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["scope"] == "user"


def test_delete_revokes_memory() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = {
        "X-Tenant-Id": str(uuid4()),
        "X-Workspace-Id": str(uuid4()),
        "X-User-Id": str(uuid4()),
    }
    created = client.post(
        "/v1/memories", headers=hdr, json={"scope": "workspace", "content": "kill me"}
    ).json()
    mid = created["id"]

    resp = client.delete(f"/v1/memories/{mid}", headers=hdr)
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == mid
    assert body["revoked"] is True
    assert body["version_lock"] == 2

    # second revoke -> 409
    resp2 = client.delete(f"/v1/memories/{mid}", headers=hdr)
    assert resp2.status_code == 409


def test_missing_factory_returns_503() -> None:
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    app = FastAPI()
    app.include_router(build_router())  # NO factory wired
    client = TestClient(app)
    resp = client.post(
        "/v1/memories",
        headers={
            "X-Tenant-Id": str(uuid4()),
            "X-Workspace-Id": str(uuid4()),
            "X-User-Id": str(uuid4()),
        },
        json={"scope": "workspace", "content": "x"},
    )
    assert resp.status_code == 503


def test_recall_rejects_oversize_top_k() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = {
        "X-Tenant-Id": str(uuid4()),
        "X-Workspace-Id": str(uuid4()),
        "X-User-Id": str(uuid4()),
    }
    resp = client.post(
        "/v1/memories/recall", headers=hdr, json={"query": "x", "top_k": 100}
    )
    assert resp.status_code == 422


# ── policy endpoint ────────────────────────────────────────────────────


def test_get_policy_returns_defaults_for_new_workspace() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    workspace_id = uuid4()
    hdr = {"X-Workspace-Id": str(workspace_id)}
    resp = client.get("/v1/memories/policy", headers=hdr)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["workspace_id"] == str(workspace_id)
    assert body["short_term_ttl_hours"] == 24
    assert body["working_memory_ttl_days"] == 7
    assert body["long_term_write_approval"] is True
    assert body["used_capacity"] == 0


def test_get_policy_missing_header_returns_422() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    resp = client.get("/v1/memories/policy")
    assert resp.status_code == 422


def test_patch_policy_merges_partial_update() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = {"X-Workspace-Id": str(uuid4())}
    # Seed via GET (lazy default)
    client.get("/v1/memories/policy", headers=hdr)
    resp = client.patch(
        "/v1/memories/policy",
        headers=hdr,
        json={
            "short_term_ttl_hours": 48,
            "long_term_write_approval": False,
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    # patched fields
    assert body["short_term_ttl_hours"] == 48
    assert body["long_term_write_approval"] is False
    # untouched defaults preserved
    assert body["working_memory_ttl_days"] == 7
    assert body["sensitive_data_masking"] is True


def test_patch_policy_persists_across_gets() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = {"X-Workspace-Id": str(uuid4())}
    client.patch(
        "/v1/memories/policy",
        headers=hdr,
        json={"long_term_capacity": 12345},
    )
    resp = client.get("/v1/memories/policy", headers=hdr)
    assert resp.json()["long_term_capacity"] == 12345


def test_patch_policy_rejects_unknown_field() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = {"X-Workspace-Id": str(uuid4())}
    resp = client.patch(
        "/v1/memories/policy",
        headers=hdr,
        json={"not_a_field": True},
    )
    assert resp.status_code == 422


def test_policy_literal_wins_over_memory_id_wildcard() -> None:
    """`/policy` must hit its own handler, NOT `/{}` with 'policy' as id."""
    app, _ = _build_app()
    client = TestClient(app)
    hdr = {"X-Workspace-Id": str(uuid4())}
    resp = client.get("/v1/memories/policy", headers=hdr)
    assert resp.status_code == 200
    assert "short_term_ttl_hours" in resp.json()
