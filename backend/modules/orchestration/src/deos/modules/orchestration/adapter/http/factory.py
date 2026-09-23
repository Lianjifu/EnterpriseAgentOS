"""HTTP factory type alias for orchestration module."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from deos.modules.orchestration.application.services import OrchestrationService


@runtime_checkable
class OrchestrationServiceFactory(Protocol):
    """Per-request factory exposed by composition via ``app.state``."""

    def for_session(self) -> OrchestrationService: ...


__all__ = ["OrchestrationServiceFactory"]
