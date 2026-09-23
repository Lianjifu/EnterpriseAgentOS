"""Unit tests for the memory use cases + service."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from eos_schema.ids import MemoryEntryId, TenantId, UserId, WorkspaceId

from deos.modules.memory.application import MemoryService
from deos.modules.memory.domain.entities import EMBEDDING_DIM
from deos.modules.memory.domain.errors import (
    InvalidMemorySpec,
    MemoryAlreadyRevoked,
    MemoryExpired,
    MemoryNotFound,
)
from deos.modules.memory.domain.events import MemoryRevoked, MemoryWritten
from deos.modules.memory.domain.value_objects import MemoryScope

from _memory_unit_in_memory import (
    DeterministicEmbedding,
    InMemoryMemoryRepository,
    InMemoryVectorSearch,
    RecordingPublisher,
)


def _tenant() -> TenantId:
    return TenantId(uuid4())


def _workspace() -> WorkspaceId:
    return WorkspaceId(uuid4())


def _user() -> UserId:
    return UserId(uuid4())


def _ids() -> tuple[TenantId, WorkspaceId, UserId]:
    return _tenant(), _workspace(), _user()


def _build_service() -> tuple[
    MemoryService, InMemoryMemoryRepository, InMemoryVectorSearch, RecordingPublisher
]:
    repo = InMemoryMemoryRepository()
    vs = InMemoryVectorSearch()
    emb = DeterministicEmbedding()
    pub = RecordingPublisher()
    svc = MemoryService.from_parts(
        repository=repo, vector_search=vs, embedding=emb, publisher=pub
    )
    return svc, repo, vs, pub


# WriteMemoryUseCase --------------------------------------------------------


async def test_write_persists_and_indexes_and_publishes() -> None:
    svc, repo, vs, pub = _build_service()
    tenant, ws, owner = _ids()

    entry = await svc.write_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        owner_id=owner,
        scope=MemoryScope.WORKSPACE,
        content="hello world",
        metadata={"src": "test"},
    )

    assert entry.id != MemoryEntryId(UUID(int=0))
    assert entry.tenant_id == tenant
    assert entry.workspace_id == ws
    assert entry.scope == MemoryScope.WORKSPACE
    assert entry.content == "hello world"
    assert len(entry.embedding) == EMBEDDING_DIM
    assert entry.revoked is False

    # repository has it
    assert (await repo.get(tenant_id=tenant, memory_id=entry.id)) is not None
    # vector index has it
    hits = await vs.search(
        tenant_id=tenant,
        workspace_id=ws,
        query_embedding=entry.embedding,
        top_k=5,
    )
    assert any(h.memory_id == entry.id for h in hits)
    # event published
    assert len(pub.events) == 1
    assert isinstance(pub.events[0], MemoryWritten)


async def test_write_rejects_empty_content_at_domain_layer() -> None:
    svc, _, _, _ = _build_service()
    tenant, ws, owner = _ids()
    import pytest

    with pytest.raises(InvalidMemorySpec):
        await svc.write_memory.execute(
            tenant_id=tenant,
            workspace_id=ws,
            owner_id=owner,
            scope=MemoryScope.WORKSPACE,
            content="   ",
        )


# RecallMemoryUseCase -------------------------------------------------------


async def test_recall_returns_top_k_ordered_by_score() -> None:
    svc, _, _, _ = _build_service()
    tenant, ws, owner = _ids()

    a = await svc.write_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        owner_id=owner,
        scope=MemoryScope.WORKSPACE,
        content="alpha bravo charlie",
    )
    b = await svc.write_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        owner_id=owner,
        scope=MemoryScope.WORKSPACE,
        content="delta echo foxtrot",
    )
    c = await svc.write_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        owner_id=owner,
        scope=MemoryScope.WORKSPACE,
        content="golf hotel india",
    )

    hits = await svc.recall_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        query_text="alpha bravo",
        top_k=2,
    )
    assert len(hits) == 2
    # 'a' shares tokens with query → should rank first
    assert hits[0].entry.id == a.id
    # scores monotonically descending
    assert hits[0].score >= hits[1].score
    # ids should be a subset of {a, b, c}
    assert {h.entry.id for h in hits}.issubset({a.id, b.id, c.id})


async def test_recall_filters_revoked_entries() -> None:
    svc, _, _, _ = _build_service()
    tenant, ws, owner = _ids()
    keep = await svc.write_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        owner_id=owner,
        scope=MemoryScope.WORKSPACE,
        content="keep this entry",
    )
    drop = await svc.write_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        owner_id=owner,
        scope=MemoryScope.WORKSPACE,
        content="drop this entry",
    )
    await svc.revoke_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        memory_id=drop.id,
        actor_id=owner,
    )

    hits = await svc.recall_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        query_text="entry",
        top_k=10,
    )
    ids = {h.entry.id for h in hits}
    assert keep.id in ids
    assert drop.id not in ids


async def test_recall_empty_query_raises() -> None:
    svc, _, _, _ = _build_service()
    tenant, ws, _ = _ids()
    import pytest

    with pytest.raises(ValueError):
        await svc.recall_memory.execute(
            tenant_id=tenant,
            workspace_id=ws,
            query_text="",
            top_k=5,
        )


# GetMemoryUseCase ----------------------------------------------------------


async def test_get_returns_entry() -> None:
    svc, _, _, _ = _build_service()
    tenant, ws, owner = _ids()
    e = await svc.write_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        owner_id=owner,
        scope=MemoryScope.WORKSPACE,
        content="hi",
    )
    got = await svc.get_memory.execute(
        tenant_id=tenant, workspace_id=ws, memory_id=e.id
    )
    assert got.id == e.id


async def test_get_raises_not_found_for_wrong_workspace() -> None:
    svc, _, _, _ = _build_service()
    tenant, ws, owner = _ids()
    e = await svc.write_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        owner_id=owner,
        scope=MemoryScope.WORKSPACE,
        content="hi",
    )
    import pytest

    other_ws = WorkspaceId(uuid4())
    with pytest.raises(MemoryNotFound):
        await svc.get_memory.execute(
            tenant_id=tenant, workspace_id=other_ws, memory_id=e.id
        )


async def test_get_raises_expired_when_expired() -> None:
    svc, _, _, _ = _build_service()
    tenant, ws, owner = _ids()
    e = await svc.write_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        owner_id=owner,
        scope=MemoryScope.WORKSPACE,
        content="hi",
        expires_at=datetime.now(UTC) - timedelta(seconds=1),
    )
    import pytest

    with pytest.raises(MemoryExpired):
        await svc.get_memory.execute(tenant_id=tenant, workspace_id=ws, memory_id=e.id)


# ListMemoriesUseCase -------------------------------------------------------


async def test_list_filters_revoked_and_expired() -> None:
    svc, _, _, _ = _build_service()
    tenant, ws, owner = _ids()
    keep = await svc.write_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        owner_id=owner,
        scope=MemoryScope.WORKSPACE,
        content="alive",
    )
    gone = await svc.write_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        owner_id=owner,
        scope=MemoryScope.WORKSPACE,
        content="bye",
        expires_at=datetime.now(UTC) - timedelta(seconds=1),
    )
    await svc.revoke_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        memory_id=gone.id,
        actor_id=owner,
    )
    rows = await svc.list_memories.execute(tenant_id=tenant, workspace_id=ws, limit=50)
    ids = {r.id for r in rows}
    assert keep.id in ids
    assert gone.id not in ids


async def test_list_filters_by_scope() -> None:
    svc, _, _, _ = _build_service()
    tenant, ws, owner = _ids()
    a = await svc.write_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        owner_id=owner,
        scope=MemoryScope.USER,
        content="user-scope",
    )
    b = await svc.write_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        owner_id=owner,
        scope=MemoryScope.WORKSPACE,
        content="ws-scope",
    )
    rows = await svc.list_memories.execute(
        tenant_id=tenant, workspace_id=ws, scope=MemoryScope.USER, limit=50
    )
    assert {r.id for r in rows} == {a.id}
    rows = await svc.list_memories.execute(
        tenant_id=tenant, workspace_id=ws, scope=MemoryScope.WORKSPACE, limit=50
    )
    assert {r.id for r in rows} == {b.id}


async def test_list_rejects_invalid_limit() -> None:
    svc, _, _, _ = _build_service()
    tenant, ws, _ = _ids()
    import pytest

    with pytest.raises(ValueError):
        await svc.list_memories.execute(tenant_id=tenant, workspace_id=ws, limit=0)
    with pytest.raises(ValueError):
        await svc.list_memories.execute(tenant_id=tenant, workspace_id=ws, limit=201)


# RevokeMemoryUseCase -------------------------------------------------------


async def test_revoke_marks_revoked_and_publishes() -> None:
    svc, _, _, pub = _build_service()
    tenant, ws, owner = _ids()
    e = await svc.write_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        owner_id=owner,
        scope=MemoryScope.WORKSPACE,
        content="to revoke",
    )
    rev = await svc.revoke_memory.execute(
        tenant_id=tenant, workspace_id=ws, memory_id=e.id, actor_id=owner
    )
    assert rev.revoked is True
    assert rev.version_lock == 2
    assert isinstance(pub.events[-1], MemoryRevoked)


async def test_revoke_twice_raises() -> None:
    svc, _, _, _ = _build_service()
    tenant, ws, owner = _ids()
    e = await svc.write_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        owner_id=owner,
        scope=MemoryScope.WORKSPACE,
        content="x",
    )
    await svc.revoke_memory.execute(
        tenant_id=tenant, workspace_id=ws, memory_id=e.id, actor_id=owner
    )
    import pytest

    with pytest.raises(MemoryAlreadyRevoked):
        await svc.revoke_memory.execute(
            tenant_id=tenant, workspace_id=ws, memory_id=e.id, actor_id=owner
        )


async def test_revoke_unknown_raises_not_found() -> None:
    svc, _, _, _ = _build_service()
    tenant, ws, owner = _ids()
    import pytest

    with pytest.raises(MemoryNotFound):
        await svc.revoke_memory.execute(
            tenant_id=tenant,
            workspace_id=ws,
            memory_id=MemoryEntryId(uuid4()),
            actor_id=owner,
        )


# PurgeExpiredMemoriesUseCase ----------------------------------------------


async def test_purge_removes_only_expired() -> None:
    svc, repo, _, pub = _build_service()
    tenant, ws, owner = _ids()
    keep = await svc.write_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        owner_id=owner,
        scope=MemoryScope.WORKSPACE,
        content="keep",
    )
    expired = await svc.write_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        owner_id=owner,
        scope=MemoryScope.WORKSPACE,
        content="expire",
        expires_at=datetime.now(UTC) - timedelta(seconds=1),
    )
    purged = await svc.purge_expired.execute(tenant_id=tenant)
    assert purged == 1
    # expired gone
    assert (await repo.get(tenant_id=tenant, memory_id=expired.id)) is None
    # keep still there
    assert (await repo.get(tenant_id=tenant, memory_id=keep.id)) is not None
    # one expired_purged event
    from deos.modules.memory.domain.events import MemoryExpiredPurged

    assert any(isinstance(e, MemoryExpiredPurged) for e in pub.events)


async def test_purge_zero_when_nothing_due() -> None:
    svc, _, _, pub = _build_service()
    tenant, ws, owner = _ids()
    await svc.write_memory.execute(
        tenant_id=tenant,
        workspace_id=ws,
        owner_id=owner,
        scope=MemoryScope.WORKSPACE,
        content="alive",
    )
    purged = await svc.purge_expired.execute(tenant_id=tenant)
    assert purged == 0
    # no event when purged == 0
    assert not any(type(e).__name__ == "MemoryExpiredPurged" for e in pub.events)


# MemoryService facade ------------------------------------------------------


async def test_memory_service_implements_port_protocol() -> None:
    """``MemoryService`` must satisfy ``MemoryServicePort`` for the
    agent_runtime wiring in P4-9."""
    from deos.modules.memory.application.memory_service_port import MemoryServicePort

    svc, _, _, _ = _build_service()
    assert isinstance(svc, MemoryServicePort)


async def test_memory_service_write_then_recall() -> None:
    svc, _, _, _ = _build_service()
    tenant, ws, owner = _ids()
    await svc.write(
        tenant_id=tenant,
        workspace_id=ws,
        owner_id=owner,
        scope=MemoryScope.WORKSPACE,
        content="facade test",
    )
    hits = await svc.recall(tenant_id=tenant, workspace_id=ws, query="facade", top_k=5)
    assert len(hits) == 1
    assert "facade test" in hits[0].entry.content
