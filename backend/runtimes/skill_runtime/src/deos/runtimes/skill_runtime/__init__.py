"""Skill sandbox runtime sidecar (P3 skeleton).

Exposes 4 routes (start / events / cancel / wait) under
`/runtime/skill`. Each request verifies a RunToken (HMAC) before
touching the sandbox.

P3 NOTE: the live composition root runs sandboxes in-process via
`InvocationRunner`. This sidecar is wired in P10 (real split). For P3,
the file is mountable under `/runtime/skill` for the smoke test.
"""

from deos.runtimes.skill_runtime.registry import SandboxRegistry
from deos.runtimes.skill_runtime.routes import build_router

__all__ = ["SandboxRegistry", "build_router"]
