"""HTTP adapter for the orchestration module."""

from __future__ import annotations

from deos.modules.orchestration.adapter.http.router import (
    build_router,
    orchestration_service_dependency,
)

__all__ = ["build_router", "orchestration_service_dependency"]
