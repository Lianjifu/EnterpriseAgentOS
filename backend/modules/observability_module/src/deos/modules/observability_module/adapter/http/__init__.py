"""observability_module — HTTP adapter package."""

from deos.modules.observability_module.adapter.http.factory import (
    ObservabilityServiceFactory,
)
from deos.modules.observability_module.adapter.http.router import (
    build_router,
    observability_service_dependency,
)

__all__ = [
    "ObservabilityServiceFactory",
    "build_router",
    "observability_service_dependency",
]