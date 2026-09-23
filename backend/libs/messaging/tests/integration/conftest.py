"""Per-package conftest for messaging integration tests.

Bridges ``tests/shared/fixtures.py`` (session-scoped Redis testcontainer)
into the libs/messaging test namespace so integration tests can opt in via
a plain ``redis_client`` fixture parameter.
"""

from __future__ import annotations

from shared.fixtures import redis_client, redis_url  # noqa: F401
