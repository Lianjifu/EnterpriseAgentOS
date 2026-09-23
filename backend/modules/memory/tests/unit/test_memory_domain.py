"""Unit tests for the memory domain — entity invariants and value objects."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from eos_schema.ids import MemoryEntryId, TenantId, UserId, WorkspaceId

from deos.modules.memory.domain.entities import EMBEDDING_DIM, MemoryEntry
from deos.modules.memory.domain.errors import (
    InvalidMemorySpec,
    MemoryAlreadyRevoked,
)
from deos.modules.memory.domain.value_objects import MemoryQuery, MemoryScope


def _tenant() -> TenantId:
    return TenantId(uuid4())


def _workspace() -> WorkspaceId:
    return WorkspaceId(uuid4())


def _owner() -> UserId:
    return UserId(uuid4())


def _embedding(seed: int = 0) -> list[float]:
    # Deterministic 1536-dim unit-ish vector; values don't matter for these tests.
    return [(seed + i) * 0.001 for i in range(EMBEDDING_DIM)]


def _entry(**overrides) -> MemoryEntry:
    base = {
        "tenant_id": _tenant(),
        "workspace_id": _workspace(),
        "owner_id": _owner(),
        "scope": MemoryScope.WORKSPACE,
        "content": "hello world",
        "embedding": _embedding(),
    }
    base.update(overrides)
    return MemoryEntry.create(**base)


# MemoryEntry.create --------------------------------------------------------


def test_create_assigns_uuid_when_id_missing() -> None:
    e = _entry()
    # `MemoryEntryId` is a NewType alias over UUID; runtime check via UUID().
    assert isinstance(UUID(str(e.id)), UUID)
    assert e.id != MemoryEntryId(UUID(int=0))


def test_create_uses_caller_id_when_provided() -> None:
    fixed = MemoryEntryId(uuid4())
    e = _entry(id=fixed)
    assert e.id == fixed


def test_create_rejects_empty_content() -> None:
    with pytest.raises(InvalidMemorySpec):
        _entry(content="")


def test_create_rejects_whitespace_only_content() -> None:
    with pytest.raises(InvalidMemorySpec):
        _entry(content="   \n")


def test_create_rejects_wrong_embedding_dim() -> None:
    with pytest.raises(InvalidMemorySpec):
        _entry(embedding=[0.1] * 100)


def test_create_rejects_non_memory_scope() -> None:
    with pytest.raises(InvalidMemorySpec):
        _entry(scope="global")  # type: ignore[arg-type]


def test_create_defaults_revoked_false() -> None:
    e = _entry()
    assert e.revoked is False
    assert e.version_lock == 1


def test_create_stores_embedding_as_tuple() -> None:
    e = _entry(embedding=_embedding(seed=2))
    assert isinstance(e.embedding, tuple)
    assert e.embedding[0] == pytest.approx(0.002)


# revoke --------------------------------------------------------------------


def test_revoke_marks_revoked_and_bumps_version() -> None:
    e = _entry()
    rev = e.revoke(now=datetime(2030, 1, 1, tzinfo=UTC))
    assert rev.revoked is True
    assert rev.version_lock == 2
    assert rev.updated_at == datetime(2030, 1, 1, tzinfo=UTC)


def test_revoke_is_immutable_call_returns_new_object() -> None:
    e = _entry()
    rev = e.revoke()
    assert e is not rev
    assert e.revoked is False  # original unchanged
    assert rev.id == e.id


def test_revoke_twice_raises() -> None:
    e = _entry().revoke()
    with pytest.raises(MemoryAlreadyRevoked):
        e.revoke()


# is_visible ----------------------------------------------------------------


def test_is_visible_when_not_revoked_no_expiry() -> None:
    e = _entry()
    assert e.is_visible() is True


def test_is_visible_false_when_revoked() -> None:
    e = _entry().revoke()
    assert e.is_visible() is False


def test_is_visible_false_when_expired() -> None:
    past = datetime.now(UTC) - timedelta(hours=1)
    e = _entry(expires_at=past)
    assert e.is_visible() is False


def test_is_visible_true_when_future_expiry() -> None:
    future = datetime.now(UTC) + timedelta(hours=1)
    e = _entry(expires_at=future)
    assert e.is_visible() is True


def test_is_visible_uses_supplied_now() -> None:
    future = datetime(2030, 1, 1, tzinfo=UTC)
    e = _entry(expires_at=future)
    past = datetime(2025, 1, 1, tzinfo=UTC)
    assert e.is_visible(now=past) is True


# MemoryQuery ---------------------------------------------------------------


def test_memory_query_default_top_k_is_10() -> None:
    q = MemoryQuery(query="hi")
    assert q.top_k == 10


def test_memory_query_rejects_empty_query() -> None:
    with pytest.raises(ValueError):
        MemoryQuery(query="")


def test_memory_query_rejects_top_k_out_of_range() -> None:
    with pytest.raises(ValueError):
        MemoryQuery(query="x", top_k=0)
    with pytest.raises(ValueError):
        MemoryQuery(query="x", top_k=51)


def test_memory_query_accepts_scope_filter() -> None:
    q = MemoryQuery(query="x", scope_filter=MemoryScope.USER)
    assert q.scope_filter == MemoryScope.USER
