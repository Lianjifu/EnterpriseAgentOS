"""Sandbox selection for the skill runtime sidecar."""

from __future__ import annotations

from eos_sandbox.local import LocalSandbox
from eos_sandbox.sandbox import Sandbox

from deos.runtimes.skill_runtime.registry import SandboxRegistry


def build_registry(*, sandbox: Sandbox | None = None) -> SandboxRegistry:
    """Pick LocalSandbox for dev/CI; DockerSandbox is wired in P10."""
    return SandboxRegistry(sandbox=sandbox or LocalSandbox())


__all__ = ["build_registry"]
