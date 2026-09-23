"""Sandbox registry for the skill runtime sidecar."""

from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID, uuid4

from eos_sandbox.sandbox import Sandbox, SandboxRunSpec


@dataclass(slots=True)
class SandboxRegistry:
    """Tracks live runs so /events, /cancel, /wait can resolve them."""

    sandbox: Sandbox
    _runs: dict[UUID, UUID] = field(default_factory=dict)

    async def start(self, spec: SandboxRunSpec) -> UUID:
        run_id = uuid4()
        await self.sandbox.start(spec)
        self._runs[run_id] = spec.run_id
        return run_id


__all__ = ["SandboxRegistry"]
