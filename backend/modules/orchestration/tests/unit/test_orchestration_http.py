"""HTTP router tests for /v1/orchestration.

Builds a tiny FastAPI app with an in-memory :class:`OrchestrationService`
(no Postgres), then exercises each endpoint to verify status codes,
header requirements, and DTO round-trips.
"""

from __future__ import annotations

from uuid import UUID, uuid4

from _orchestration_unit_in_memory import (
    InMemoryPlanRepository,
    InMemoryStepRunRepository,
    InMemoryWorkflowRunRepository,
    RecordingEventPublisher,
    RecordingSkillDispatchPort,
    RecordingSubAgentPort,
    RecordingToolDispatchPort,
)
from fastapi import FastAPI
from fastapi.testclient import TestClient

from deos.modules.orchestration.adapter.http.factory import (
    OrchestrationServiceFactory,
)
from deos.modules.orchestration.adapter.http.router import build_router
from deos.modules.orchestration.application.conditions import (
    SafeConditionEvaluator,
)
from deos.modules.orchestration.application.services import OrchestrationService
from deos.modules.orchestration.application.template import (
    StringTemplateRenderer,
)


def _build_app() -> tuple[FastAPI, OrchestrationService]:
    plan_repo = InMemoryPlanRepository()
    run_repo = InMemoryWorkflowRunRepository()
    step_repo = InMemoryStepRunRepository()
    sub_agent = RecordingSubAgentPort()
    tool = RecordingToolDispatchPort()
    skill = RecordingSkillDispatchPort()
    publisher = RecordingEventPublisher()
    svc = OrchestrationService.from_parts(
        plan_repository=plan_repo,
        run_repository=run_repo,
        step_run_repository=step_repo,
        sub_agent=sub_agent,
        tool_dispatch=tool,
        skill_dispatch=skill,
        template_renderer=StringTemplateRenderer(),
        condition_evaluator=SafeConditionEvaluator(),
        publisher=publisher,
    )

    class _Factory(OrchestrationServiceFactory):
        def __init__(self, s: OrchestrationService) -> None:
            self._s = s

        def for_session(self) -> OrchestrationService:
            return self._s

    app = FastAPI()
    app.state.orchestration_service_factory = _Factory(svc)
    app.include_router(build_router())
    return app, svc


_AGENT_STEP = {
    "kind": "agent",
    "step_id": "a1",
    "agent_id": "00000000-0000-0000-0000-000000000001",
    "agent_version": "1.0.0",
    "user_input_template": "echo",
}


def _plan_dsl(name: str) -> dict:
    return {"name": name, "entry": _AGENT_STEP}


def _hdrs() -> dict[str, str]:
    return {
        "X-Tenant-Id": str(uuid4()),
        "X-Workspace-Id": str(uuid4()),
        "X-User-Id": str(uuid4()),
    }


def test_create_plan_201() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = _hdrs()
    body = {
        "name": "p1",
        "description": "",
        "entry_dsl": _plan_dsl("p1"),
        "max_total_steps": 10,
    }
    resp = client.post("/v1/orchestration/plans", headers=hdr, json=body)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["name"] == "p1"
    assert data["max_total_steps"] == 10


def test_create_plan_duplicate_name_409() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = _hdrs()
    body = {
        "name": "dup",
        "entry_dsl": _plan_dsl("dup"),
    }
    assert (
        client.post("/v1/orchestration/plans", headers=hdr, json=body).status_code
        == 201
    )
    dup = client.post("/v1/orchestration/plans", headers=hdr, json=body)
    assert dup.status_code == 409


def test_create_plan_missing_dsl_422() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    resp = client.post(
        "/v1/orchestration/plans",
        headers=_hdrs(),
        json={"name": "x", "entry_dsl": {}},
    )
    assert resp.status_code == 422


def test_list_plans_returns_total() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = _hdrs()
    for i in range(2):
        client.post(
            "/v1/orchestration/plans",
            headers=hdr,
            json={"name": f"p{i}", "entry_dsl": _plan_dsl(f"p{i}")},
        )
    resp = client.get("/v1/orchestration/plans", headers=hdr)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2


def test_get_plan_404_when_missing() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    resp = client.get(
        f"/v1/orchestration/plans/{uuid4()}",
        headers={"X-Tenant-Id": str(uuid4())},
    )
    assert resp.status_code == 404


def test_run_plan_synchronous_succeeds() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = _hdrs()
    create = client.post(
        "/v1/orchestration/plans",
        headers=hdr,
        json={"name": "run-ok", "entry_dsl": _plan_dsl("run-ok")},
    )
    plan_id = create.json()["id"]
    resp = client.post(
        f"/v1/orchestration/plans/{plan_id}/runs",
        headers=hdr,
        json={"variables": {"x": 1}},
    )
    # v1 behaviour: POST /runs returns 202 Accepted with a poll_url
    # envelope (the executor still blocks synchronously; the body no
    # longer carries the full run + step payload).
    assert resp.status_code == 202, resp.text
    data = resp.json()
    assert data["status"] == "succeeded"
    assert data["plan_id"] == plan_id
    assert data["poll_url"].endswith(f"/v1/orchestration/runs/{data['run_id']}")
    # Following the poll_url returns the canonical run state.
    follow = client.get(data["poll_url"], headers=hdr)
    assert follow.status_code == 200
    assert follow.json()["id"] == data["run_id"]


def test_run_plan_404_unknown_plan() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    resp = client.post(
        f"/v1/orchestration/plans/{uuid4()}/runs",
        headers=_hdrs(),
        json={},
    )
    assert resp.status_code == 404


def test_run_plan_idempotency_returns_existing() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = _hdrs()
    create = client.post(
        "/v1/orchestration/plans",
        headers=hdr,
        json={"name": "idem", "entry_dsl": _plan_dsl("idem")},
    )
    plan_id = create.json()["id"]
    body = {"idempotency_key": "k-1"}
    first = client.post(
        f"/v1/orchestration/plans/{plan_id}/runs", headers=hdr, json=body
    )
    assert first.status_code == 202
    second = client.post(
        f"/v1/orchestration/plans/{plan_id}/runs", headers=hdr, json=body
    )
    assert second.status_code == 202
    # Same run id from the partial UQ → idempotent replay.
    assert second.json()["run_id"] == first.json()["run_id"]


def test_get_run_404_unknown() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    resp = client.get(
        f"/v1/orchestration/runs/{uuid4()}",
        headers={"X-Tenant-Id": str(uuid4())},
    )
    assert resp.status_code == 404


def test_list_runs_filters_by_plan() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = _hdrs()
    create = client.post(
        "/v1/orchestration/plans",
        headers=hdr,
        json={"name": "runs-by-plan", "entry_dsl": _plan_dsl("runs-by-plan")},
    )
    plan_id = create.json()["id"]
    client.post(
        f"/v1/orchestration/plans/{plan_id}/runs",
        headers=hdr,
        json={"idempotency_key": "k-1"},
    )
    resp = client.get(
        "/v1/orchestration/runs",
        headers=hdr,
        params={"plan_id": plan_id},
    )
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 1
    assert items[0]["plan_id"] == plan_id


def test_cancel_run_returns_terminal() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    hdr = _hdrs()
    create = client.post(
        "/v1/orchestration/plans",
        headers=hdr,
        json={"name": "cancel", "entry_dsl": _plan_dsl("cancel")},
    )
    plan_id = create.json()["id"]
    run_resp = client.post(
        f"/v1/orchestration/plans/{plan_id}/runs",
        headers=hdr,
        json={"idempotency_key": "cancel-1"},
    )
    run_id = run_resp.json()["run_id"]
    cancel = client.post(
        f"/v1/orchestration/runs/{run_id}/cancel",
        headers=hdr,
    )
    # The run is already terminal (succeeded); cancel is a no-op.
    assert cancel.status_code == 200


def test_factory_missing_returns_503() -> None:
    """Without ``orchestration_service_factory`` on app.state, the dep
    should surface a 503 (not raise AttributeError)."""
    from fastapi import Depends

    from deos.modules.orchestration.adapter.http.router import (
        orchestration_service_dependency,
    )

    app = FastAPI()

    @app.get("/probe")
    async def _probe(svc=Depends(orchestration_service_dependency)):  # type: ignore[no-untyped-def]  # noqa: B008
        return svc

    client = TestClient(app)
    resp = client.get("/probe")
    assert resp.status_code == 503


def test_create_plan_extra_field_rejected() -> None:
    app, _ = _build_app()
    client = TestClient(app)
    resp = client.post(
        "/v1/orchestration/plans",
        headers=_hdrs(),
        json={
            "name": "p",
            "entry_dsl": _plan_dsl("p"),
            "extra": "nope",
        },
    )
    assert resp.status_code == 422


__all__ = []  # pytest discovery picks up test_* functions
_ = (UUID,)
