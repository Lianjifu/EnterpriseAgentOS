"""Observability: logging, tracing, Prometheus metrics."""

from eos_observability.logging import configure_logging, get_logger
from eos_observability.metrics import (
    Counter,
    Gauge,
    Histogram,
    MetricsRegistry,
    metrics_registry,
    record_http_request,
    render_prometheus,
)
from eos_observability.middleware import ObservabilityMiddleware
from eos_observability.tracing import (
    configure_tracing,
    current_span,
    get_tracer,
    shutdown_tracing,
)

__all__ = [
    "Counter",
    "Gauge",
    "Histogram",
    "MetricsRegistry",
    "ObservabilityMiddleware",
    "configure_logging",
    "configure_tracing",
    "current_span",
    "get_logger",
    "get_tracer",
    "metrics_registry",
    "record_http_request",
    "render_prometheus",
    "shutdown_tracing",
]
