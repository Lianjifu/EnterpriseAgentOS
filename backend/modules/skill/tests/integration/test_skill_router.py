"""HTTP integration tests for skill module router."""

from __future__ import annotations

import sys
import time
from typing import Any
from uuid import UUID

from _skill_unit_in_memory import (  # type: ignore[import-not-found]
    FakeRunTokenIssuer,
    InMemoryArtifactStore,
    InMemoryUnitOfWork,
    RecordingSkillEventPublisher,
)
from eos_schema.ids import TenantId, UserId, WorkspaceId
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.middleware.base import BaseHTTPMiddleware

from deos.modules.skill.adapter.http.router import build_router
from deos.modules.skill.application.invocation_runner import InvocationRunner
from deos.modules.skill.application.services import SkillService


# Inline test-id helpers (replaces the legacy `from conftest import`
# which collides under `--import-mode=importlib`).
def make_tenant() -> TenantId:
    return TenantId(UUID("00000000-0000-0000-0000-000000000001"))


def make_user() -> UserId:
    return UserId(UUID("00000000-0000-0000-0000-000000000010"))


def make_workspace() -> WorkspaceId:
    return WorkspaceId(UUID("00000000-0000-0000-0000-000000000002"))


class FastSandbox:
    """Real-ish Sandbox that completes via a real asyncio task."""

    mode = "fast"

    def __init__(self) -> None:
        self.started: list = []

    async def start(self, spec):
        self.started.append(spec)
        return spec.run_id

    async def stream(self, run_id):
        from eos_sandbox.sandbox import SandboxEvent, SandboxRunStatus

        yield SandboxEvent(
            run_id=run_id,
            status=SandboxRunStatus.RUNNING,
            stream="stdout",
            data="ok\n",
            seq=1,
        )

    async def cancel(self, run_id) -> None:
        return None

    async def wait(self, run_id):
        from eos_sandbox.sandbox import SandboxEvent, SandboxRunStatus

        return SandboxEvent(
            run_id=run_id,
            status=SandboxRunStatus.SUCCEEDED,
            stream="system",
            data="exit=0",
            seq=-1,
        )

    async def shutdown(self) -> None:
        return None


def _build_app() -> tuple[FastAPI, Any, Any]:
    """Build a FastAPI app wired to in-memory state.

    We override the skill_dependency to use the shared in-memory state
    rather than going through the live session-factory.
    """
    app = FastAPI(title="skill-test")
    from eos_http.error_envelope import error_envelope_middleware

    app.add_middleware(BaseHTTPMiddleware, dispatch=error_envelope_middleware)  # type: ignore[arg-type]
    uow = InMemoryUnitOfWork()
    publisher = RecordingSkillEventPublisher()
    artifacts = InMemoryArtifactStore()
    issuer = FakeRunTokenIssuer()
    sandbox = FastSandbox()
    runner = InvocationRunner(
        sandbox=sandbox,
        invocations=uow.invocations,
        publisher=publisher,
        artifacts=artifacts,
    )

    def factory_for_session(session: Any) -> SkillService:
        return SkillService.from_parts(
            uow_factory=lambda: uow,
            publisher=publisher,
            run_token_issuer=issuer,
            runner=runner,
            skill_repository=uow.skills,
            install_repository=uow.installs,
            invocation_repository=uow.invocations,
            artifacts=artifacts,
        )

    class _Container:
        def session_factory(self) -> Any:
            class _NullSession:
                async def rollback(self_inner) -> None:
                    return None

                async def commit(self_inner) -> None:
                    return None

            class _Null:
                def session(self):
                    class _CM:
                        async def __aenter__(self_inner):
                            return _NullSession()

                        async def __aexit__(self_inner, *a):
                            return None

                    return _CM()

            return _Null()

    app.state.container = _Container()
    app.state.skill_factory = type(
        "F", (), {"for_session": staticmethod(factory_for_session)}
    )
    app.include_router(build_router())
    return app, uow, runner


def _headers() -> dict[str, str]:
    return {
        "X-Tenant-Id": str(make_tenant()),
        "X-Workspace-Id": str(make_workspace()),
        "X-User-Id": str(make_user()),
    }


def test_router_register_201() -> None:
    app, _uow, _runner = _build_app()
    client = TestClient(app)
    resp = client.post(
        "/v1/skills",
        headers=_headers(),
        json={
            "name": "echo",
            "version": "1.0.0",
            "description": "echo skill",
            "entrypoint": sys.executable,
            "image": "python:3.12-slim",
            "parameters_schema": {},
            "artifact_uri": "skill-artifact://seed",
            "network_policy": "default",
            "timeout_seconds": 30,
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["name"] == "echo"
    assert body["version"] == "1.0.0"
    assert body["enabled"] is True


def test_router_get_skill_404() -> None:
    app, _uow, _runner = _build_app()
    client = TestClient(app)
    resp = client.get(
        "/v1/skills/00000000-0000-0000-0000-000000000099",
        headers=_headers(),
    )
    assert resp.status_code == 404


def test_router_register_duplicate_409() -> None:
    app, _uow, _runner = _build_app()
    client = TestClient(app)
    payload = {
        "name": "echo",
        "version": "1.0.0",
        "description": "",
        "entrypoint": sys.executable,
        "image": "python:3.12-slim",
        "parameters_schema": {},
        "artifact_uri": "skill-artifact://seed",
        "network_policy": "default",
        "timeout_seconds": 30,
    }
    client.post("/v1/skills", headers=_headers(), json=payload)
    resp = client.post("/v1/skills", headers=_headers(), json=payload)
    assert resp.status_code == 409


def test_router_install_201_returns_run_token() -> None:
    app, _uow, _runner = _build_app()
    client = TestClient(app)
    payload = {
        "name": "echo",
        "version": "1.0.0",
        "description": "",
        "entrypoint": sys.executable,
        "image": "python:3.12-slim",
        "parameters_schema": {},
        "artifact_uri": "skill-artifact://seed",
        "network_policy": "default",
        "timeout_seconds": 30,
    }
    reg = client.post("/v1/skills", headers=_headers(), json=payload).json()
    resp = client.post(f"/v1/skills/{reg['id']}/install", headers=_headers())
    assert resp.status_code == 201
    body = resp.json()
    assert body["run_token"].startswith("tok-")
    assert body["expires_at_ms"] > 0


def test_router_invoke_async_202() -> None:
    app, _uow, _runner = _build_app()
    client = TestClient(app)
    payload = {
        "name": "echo",
        "version": "1.0.0",
        "description": "",
        "entrypoint": sys.executable,
        "image": "python:3.12-slim",
        "parameters_schema": {},
        "artifact_uri": "skill-artifact://seed",
        "network_policy": "default",
        "timeout_seconds": 30,
    }
    reg = client.post("/v1/skills", headers=_headers(), json=payload).json()
    client.post(f"/v1/skills/{reg['id']}/install", headers=_headers())
    resp = client.post(
        f"/v1/skills/{reg['id']}/invoke",
        headers=_headers(),
        json={"arguments": {}, "wait": False},
    )
    assert resp.status_code == 202
    body = resp.json()
    invocation_id = body["id"]
    # Poll status (real-time wait via time.sleep — TestClient runs the runner
    # task in its own loop on the calling thread, so just polling works).
    deadline = time.time() + 2.0
    while time.time() < deadline:
        st = client.get(
            f"/v1/skills/invocations/{invocation_id}", headers=_headers()
        ).json()
        if st["status"] in {"succeeded", "failed", "cancelled", "timed_out"}:
            assert st["status"] == "succeeded"
            return
        time.sleep(0.02)
    raise AssertionError("invocation did not finish in time")


def test_router_disable_skill_204() -> None:
    app, _uow, _runner = _build_app()
    client = TestClient(app)
    payload = {
        "name": "echo",
        "version": "1.0.0",
        "description": "",
        "entrypoint": sys.executable,
        "image": "python:3.12-slim",
        "parameters_schema": {},
        "artifact_uri": "skill-artifact://seed",
        "network_policy": "default",
        "timeout_seconds": 30,
    }
    reg = client.post("/v1/skills", headers=_headers(), json=payload).json()
    resp = client.delete(f"/v1/skills/{reg['id']}", headers=_headers())
    assert resp.status_code == 204
