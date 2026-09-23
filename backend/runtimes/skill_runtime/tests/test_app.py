"""P3 skeleton smoke test — verifies RunToken roundtrip + 401 on bad sig."""

from __future__ import annotations

from uuid import UUID, uuid4

import httpx
from eos_sandbox.run_token import issue_run_token

from deos.runtimes.skill_runtime.app import create_app

SECRET = "test-secret"


def _client(app) -> httpx.AsyncClient:
    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url="http://test")


async def test_create_app_health() -> None:
    app = create_app(run_token_secret=SECRET)
    async with _client(app) as c:
        r = await c.get("/openapi.json")
        assert r.status_code == 200


async def test_start_with_bad_sig_401() -> None:
    app = create_app(run_token_secret=SECRET)
    async with _client(app) as c:
        r = await c.post(
            "/v1/sandbox/start",
            json={"run_token": "garbage", "spec": {}},
        )
        assert r.status_code == 401


async def test_start_with_expired_token_401() -> None:
    app = create_app(run_token_secret=SECRET)
    async with _client(app) as c:
        tok = issue_run_token(
            secret=SECRET,
            skill_id=uuid4(),
            tenant_id=uuid4(),
            workspace_id=uuid4(),
            ttl_seconds=-1,
        ).raw
        r = await c.post(
            "/v1/sandbox/start",
            json={"run_token": tok, "spec": {}},
        )
        assert r.status_code == 401


async def test_round_trip_token() -> None:
    """Issue a token via issue_run_token, then verify it accepts."""
    app = create_app(run_token_secret=SECRET)
    async with _client(app) as c:
        tok = issue_run_token(
            secret=SECRET,
            skill_id=uuid4(),
            tenant_id=uuid4(),
            workspace_id=uuid4(),
        ).raw
        r = await c.post(
            "/v1/sandbox/start",
            json={
                "run_token": tok,
                "spec": {
                    "tenant_id": str(uuid4()),
                    "workspace_id": str(uuid4()),
                    "skill_id": str(uuid4()),
                    "command": ["python3", "-c", "pass"],
                    "image": "python:3.12-slim",
                    "timeout_seconds": 30,
                },
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        UUID(body["run_id"])
