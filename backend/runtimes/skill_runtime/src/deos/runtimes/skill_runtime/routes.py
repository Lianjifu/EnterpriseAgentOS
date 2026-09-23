"""4 routes for the skill sandbox runtime sidecar.

POST /v1/sandbox/start        body: {run_token, spec}   → 200 {run_id}
GET  /v1/sandbox/{run_id}/events   SSE                  → text/event-stream
POST /v1/sandbox/{run_id}/cancel   body: {run_token}    → 204
GET  /v1/sandbox/{run_id}/wait                            → 200 {SandboxEvent}

Each request verifies a RunToken (HMAC). Bad sig → 401
RUN_TOKEN_BAD_SIG. Expired → 401.
"""

from collections.abc import AsyncIterator
from typing import Any
from uuid import UUID

from eos_sandbox.run_token import verify_run_token
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from deos.runtimes.skill_runtime.registry import SandboxRegistry


def build_router() -> APIRouter:
    router = APIRouter(prefix="/v1/sandbox", tags=["skill-runtime"])

    def _registry(request: Request) -> SandboxRegistry:
        return request.app.state.skill_runtime_registry

    def _secret(request: Request) -> str:
        return request.app.state.skill_runtime_secret

    def _verify(token: str, secret: str) -> None:
        try:
            parsed = verify_run_token(token, secret=secret)
        except Exception as exc:
            raise HTTPException(
                status_code=401,
                detail=f"RUN_TOKEN_{type(exc).__name__}",
            ) from exc
        if parsed.is_expired:
            raise HTTPException(status_code=401, detail="RUN_TOKEN_EXPIRED")

    @router.post("/start")
    async def start(
        body: dict[str, Any],
        request: Request,
        registry: SandboxRegistry = Depends(_registry),  # noqa: B008
        secret: str = Depends(_secret),
    ) -> dict[str, str]:
        _verify(body["run_token"], secret)
        spec = body["spec"]
        from eos_sandbox.sandbox import SandboxRunSpec
        from eos_schema.ids import SkillId, TenantId, WorkspaceId

        s = SandboxRunSpec(
            run_id=__import__("uuid").uuid4(),
            tenant_id=TenantId(spec["tenant_id"]),
            workspace_id=WorkspaceId(spec["workspace_id"]),
            skill_id=SkillId(spec["skill_id"]),
            image=spec.get("image", "python:3.12-slim"),
            command=tuple(spec["command"]),
            env=dict(spec.get("env", {})),
            working_dir=spec.get("working_dir"),
            timeout_seconds=int(spec.get("timeout_seconds", 30)),
            network_policy=spec.get("network_policy", "default"),
            cpu_quota=spec.get("cpu_quota"),
            memory_bytes=spec.get("memory_bytes"),
        )
        run_id = await registry.start(s)
        return {"run_id": str(run_id)}

    @router.get("/{run_id}/events")
    async def events(
        run_id: UUID,
        request: Request,
        registry: SandboxRegistry = Depends(_registry),  # noqa: B008
    ) -> StreamingResponse:
        from eos_sandbox.sandbox import SandboxRunStatus

        async def stream() -> AsyncIterator[str]:
            assert registry._sandbox is not None
            try:
                async for ev in registry._sandbox.stream(run_id):
                    yield f"data: {ev.data}\n\n"
                    if ev.status == SandboxRunStatus.SUCCEEDED:
                        return
            except Exception as exc:  # noqa: BLE001
                yield f"event: error\ndata: {exc}\n\n"

        return StreamingResponse(stream(), media_type="text/event-stream")

    @router.post("/{run_id}/cancel", status_code=204)
    async def cancel(
        run_id: UUID,
        body: dict[str, Any],
        request: Request,
        registry: SandboxRegistry = Depends(_registry),  # noqa: B008
        secret: str = Depends(_secret),
    ) -> None:
        _verify(body["run_token"], secret)
        assert registry._sandbox is not None
        await registry._sandbox.cancel(run_id)

    @router.get("/{run_id}/wait")
    async def wait(
        run_id: UUID,
        request: Request,
        registry: SandboxRegistry = Depends(_registry),  # noqa: B008
    ) -> dict[str, Any]:
        assert registry._sandbox is not None
        ev = await registry._sandbox.wait(run_id)
        return {"status": ev.status.value, "data": ev.data}

    return router


__all__ = ["build_router"]
