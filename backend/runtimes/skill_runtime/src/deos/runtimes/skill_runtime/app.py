"""FastAPI app factory for the skill sandbox runtime sidecar.

P3 NOTE: this app is wired but not auto-mounted by the composition root
in P3 (process-internal `InvocationRunner` is the default). P10 will
swap the default + expose the sidecar.
"""

from __future__ import annotations

from fastapi import FastAPI

from deos.runtimes.skill_runtime import build_router
from deos.runtimes.skill_runtime.container import build_registry


def create_app(*, sandbox=None, run_token_secret: str = "") -> FastAPI:
    app = FastAPI(title="eos-skill-runtime", version="0.1.0")
    app.state.skill_runtime_registry = build_registry(sandbox=sandbox)
    app.state.skill_runtime_secret = run_token_secret
    app.include_router(build_router())
    return app


__all__ = ["create_app"]
