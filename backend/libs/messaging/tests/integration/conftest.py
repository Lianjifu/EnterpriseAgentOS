"""Per-package conftest for messaging integration tests.

Bridges ``tests/shared/fixtures.py`` (session-scoped Redis/Kafka
testcontainers) into the libs/messaging test namespace so integration
tests can opt in via plain ``redis_client`` / ``kafka_bootstrap_servers``
fixture parameters.
"""

from __future__ import annotations

from shared.fixtures import (  # noqa: F401
    kafka_bootstrap_servers,
    redis_client,
    redis_url,
)
