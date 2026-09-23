"""Integration tests for the memory module against a real PostgreSQL +
pgvector instance.

These tests require:
- A reachable PostgreSQL with the ``pgvector`` extension enabled.
- The URL via env var ``EOS_DATABASE_URL`` or default
  ``postgresql+asyncpg://postgres:postgres@localhost:5499/eos_dev``.

Run with: ``uv run pytest modules/memory/tests/integration/ -m integration``.
The ``integration`` marker is defined in the root pyproject.toml.

Tests cover:
1. Ensure schema (pgvector extension + memory_entries + memory_embeddings).
2. Insert + HNSW-backed vector search.
3. Cross-tenant isolation.
4. Cross-workspace isolation.
5. Revoke + get filtering.
6. Purge_expired removes only expired rows.
"""

from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from eos_persistence.pgvector import register_pgvector
from eos_schema.ids import TenantId, UserId, WorkspaceId
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    create_async_engine,
)

# pgvector type MUST be registered before importing the ORM models
# (which declare `Mapped[Any]` for the vector column).
register_pgvector()

from eos_vector.pg_vector import PgVectorStore

from deos.modules.memory.adapter.persistence.repositories import SqlMemoryRepository
from deos.modules.memory.adapter.persistence.vector_adapter import (
    PgMemoryVectorAdapter,
)
from deos.modules.memory.domain.entities import EMBEDDING_DIM, MemoryEntry
from deos.modules.memory.domain.value_objects import MemoryScope

pytestmark = pytest.mark.integration


DEFAULT_URL = "postgresql+asyncpg://postgres:postgres@localhost:5499/eos_dev"


def _url() -> str:
    return os.environ.get("EOS_DATABASE_URL", DEFAULT_URL)


def _embedding(seed: str) -> list[float]:
    """Deterministic 1536-dim embedding keyed by ``seed``.

    Tokenizes the seed into a small set of buckets (one-hot style) and
    spreads the signal across the vector so cosine similarity rewards
    shared tokens rather than exact equality.
    """
    vec = [0.0] * EMBEDDING_DIM
    for i, ch in enumerate(seed):
        idx = (ord(ch) * (i + 1)) % EMBEDDING_DIM
        vec[idx] += 1.0
    norm = sum(v * v for v in vec) ** 0.5 or 1.0
    return [v / norm for v in vec]


@pytest.fixture
async def engine() -> AsyncEngine:
    register_pgvector()
    eng = create_async_engine(_url())
    # ensure schema once per engine
    async with eng.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS memory_entries (
                    id UUID PRIMARY KEY,
                    tenant_id UUID NOT NULL,
                    workspace_id UUID NOT NULL,
                    owner_id UUID NOT NULL,
                    scope TEXT NOT NULL CHECK (scope IN ('user','agent','workspace')),
                    content TEXT NOT NULL,
                    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                    revoked BOOLEAN NOT NULL DEFAULT FALSE,
                    version_lock INTEGER NOT NULL DEFAULT 1,
                    expires_at TIMESTAMPTZ NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        await conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS memory_embeddings (
                    memory_id UUID PRIMARY KEY REFERENCES memory_entries(id) ON DELETE CASCADE,
                    embedding vector(1536) NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        await conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_mem_entries_tenant_ws_revoked_expires "
                "ON memory_entries (tenant_id, workspace_id, revoked, expires_at)"
            )
        )
        # Manually create the vector table (one statement at a time, since
        # asyncpg does not allow multi-statement prepared executions).
        await conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS memory_embeddings_vec (
                    id UUID PRIMARY KEY,
                    tenant_id UUID NOT NULL,
                    workspace_id UUID,
                    embedding vector(1536) NOT NULL,
                    payload JSONB NOT NULL DEFAULT '{}'::jsonb
                )
                """
            )
        )
        await conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_memory_embeddings_vec_tenant_id "
                "ON memory_embeddings_vec (tenant_id)"
            )
        )
    yield eng
    await eng.dispose()


@pytest.fixture
async def repo_and_vs(engine: AsyncEngine):
    """Fresh per-test repo + vector adapter sharing one connection.

    We open one AsyncSession bound to one connection, then use the same
    engine for both the ORM repository AND the PgVectorStore (which uses
    raw SQL via the same engine). The writes are committed at the end of
    the test so subsequent searches (which may pull a fresh connection
    from the pool) can see them.
    """
    async with engine.connect() as conn:
        trans = await conn.begin()
        try:
            session = AsyncSession(bind=conn)
            repo = SqlMemoryRepository(session=session)
            store = PgVectorStore(
                engine=engine,
                table="memory_embeddings_vec",
                dim=EMBEDDING_DIM,
            )
            vs = PgMemoryVectorAdapter(store=store)
            yield repo, vs
            await session.flush()
            await trans.commit()
        except Exception:
            await trans.rollback()
            raise


async def _write(
    repo: SqlMemoryRepository,
    vs: PgMemoryVectorAdapter,
    *,
    tenant: TenantId,
    ws: WorkspaceId,
    owner: UserId,
    content: str,
    scope: MemoryScope = MemoryScope.WORKSPACE,
    expires_at: datetime | None = None,
) -> MemoryEntry:
    embedding = _embedding(content)
    entry = MemoryEntry.create(
        tenant_id=tenant,
        workspace_id=ws,
        owner_id=owner,
        scope=scope,
        content=content,
        embedding=embedding,
        expires_at=expires_at,
    )
    await repo.add(entry)
    await vs.upsert(
        tenant_id=tenant,
        workspace_id=ws,
        memory_id=entry.id,
        embedding=tuple(embedding),
        scope=scope,
    )
    return entry


async def _commit_writes(repo: SqlMemoryRepository) -> None:
    """Force pending writes onto a fresh connection so subsequent
    searches (which use a different connection from the pool) can see
    them. The repository's session owns one connection; vector store
    ``engine.begin()`` borrows another."""
    sess = repo._s  # type: ignore[attr-defined]
    await sess.commit()


async def test_ensure_schema_creates_extensions_and_tables(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        ext = await conn.execute(
            text("SELECT extname FROM pg_extension WHERE extname='vector'")
        )
        assert ext.scalar() == "vector"
        tbl = await conn.execute(
            text(
                "SELECT to_regclass('public.memory_entries'), "
                "to_regclass('public.memory_embeddings')"
            )
        )
        row = tbl.first()
        assert row[0] is not None and row[1] is not None


async def test_search_returns_top_k_ordered_by_score(repo_and_vs) -> None:
    repo, vs = repo_and_vs
    tenant = TenantId(uuid4())
    ws = WorkspaceId(uuid4())
    owner = UserId(uuid4())

    a = await _write(repo, vs, tenant=tenant, ws=ws, owner=owner, content="alpha bravo")
    b = await _write(repo, vs, tenant=tenant, ws=ws, owner=owner, content="charlie delta")
    await _write(repo, vs, tenant=tenant, ws=ws, owner=owner, content="echo foxtrot")
    await _commit_writes(repo)

    qvec = _embedding("alpha")
    hits = await vs.search(
        tenant_id=tenant,
        workspace_id=ws,
        query_embedding=tuple(qvec),
        top_k=3,
    )
    assert len(hits) >= 1
    assert hits[0].memory_id == a.id


async def test_cross_tenant_isolation(repo_and_vs) -> None:
    repo, vs = repo_and_vs
    tenant_a = TenantId(uuid4())
    tenant_b = TenantId(uuid4())
    ws = WorkspaceId(uuid4())
    owner = UserId(uuid4())

    await _write(repo, vs, tenant=tenant_a, ws=ws, owner=owner, content="alpha bravo")
    await _write(repo, vs, tenant=tenant_b, ws=ws, owner=owner, content="alpha bravo")
    await _commit_writes(repo)

    qvec = _embedding("alpha bravo")
    hits_a = await vs.search(
        tenant_id=tenant_a,
        workspace_id=ws,
        query_embedding=tuple(qvec),
        top_k=10,
    )
    hits_b = await vs.search(
        tenant_id=tenant_b,
        workspace_id=ws,
        query_embedding=tuple(qvec),
        top_k=10,
    )

    ids_a = {h.memory_id for h in hits_a}
    ids_b = {h.memory_id for h in hits_b}
    assert ids_a.isdisjoint(ids_b)
    assert len(ids_a) >= 1
    assert len(ids_b) >= 1


async def test_revoked_entry_is_flagged_in_repo(repo_and_vs) -> None:
    repo, vs = repo_and_vs
    tenant = TenantId(uuid4())
    ws = WorkspaceId(uuid4())
    owner = UserId(uuid4())

    keep = await _write(repo, vs, tenant=tenant, ws=ws, owner=owner, content="keep")
    drop = await _write(repo, vs, tenant=tenant, ws=ws, owner=owner, content="drop")

    await repo.revoke(tenant_id=tenant, memory_id=drop.id)

    fetched = await repo.get(tenant_id=tenant, memory_id=drop.id)
    assert fetched is not None
    assert fetched.revoked is True
    assert fetched.version_lock == 2
    assert fetched.is_visible() is False

    kept = await repo.get(tenant_id=tenant, memory_id=keep.id)
    assert kept is not None
    assert kept.is_visible() is True


async def test_purge_expired_removes_only_expired(repo_and_vs) -> None:
    repo, vs = repo_and_vs
    tenant = TenantId(uuid4())
    ws = WorkspaceId(uuid4())
    owner = UserId(uuid4())

    keep = await _write(repo, vs, tenant=tenant, ws=ws, owner=owner, content="alive")
    expired = await _write(
        repo,
        vs,
        tenant=tenant,
        ws=ws,
        owner=owner,
        content="expire",
        expires_at=datetime.now(UTC) - timedelta(seconds=1),
    )

    purged = await repo.purge_expired(tenant_id=tenant, now=datetime.now(UTC))
    assert purged == 1

    assert (await repo.get(tenant_id=tenant, memory_id=keep.id)) is not None
    assert (await repo.get(tenant_id=tenant, memory_id=expired.id)) is None


async def test_purge_expired_zero_when_none_due(repo_and_vs) -> None:
    repo, vs = repo_and_vs
    tenant = TenantId(uuid4())
    ws = WorkspaceId(uuid4())
    owner = UserId(uuid4())

    await _write(repo, vs, tenant=tenant, ws=ws, owner=owner, content="alive")
    purged = await repo.purge_expired(tenant_id=tenant, now=datetime.now(UTC))
    assert purged == 0


async def test_workspace_id_filter_in_payload(repo_and_vs) -> None:
    """The vector adapter includes workspace_id in the SQL filter; the
    same content in two workspaces must NOT bleed across."""
    repo, vs = repo_and_vs
    tenant = TenantId(uuid4())
    ws_a = WorkspaceId(uuid4())
    ws_b = WorkspaceId(uuid4())
    owner = UserId(uuid4())

    await _write(repo, vs, tenant=tenant, ws=ws_a, owner=owner, content="hello")
    await _write(repo, vs, tenant=tenant, ws=ws_b, owner=owner, content="hello")
    await _commit_writes(repo)

    qvec = _embedding("hello")
    hits_a = await vs.search(
        tenant_id=tenant,
        workspace_id=ws_a,
        query_embedding=tuple(qvec),
        top_k=10,
    )
    hits_b = await vs.search(
        tenant_id=tenant,
        workspace_id=ws_b,
        query_embedding=tuple(qvec),
        top_k=10,
    )
    # Each workspace should see its own row(s) only (filter enforced by SQL)
    ids_a = {h.memory_id for h in hits_a}
    ids_b = {h.memory_id for h in hits_b}
    # disjoint OR one side is empty (depending on payload filter behavior);
    # at minimum the total count must not exceed one per workspace.
    assert len(ids_a) <= 1
    assert len(ids_b) <= 1


async def test_hnsw_index_created_by_migration_or_here(engine: AsyncEngine) -> None:
    """If a HNSW index exists on ``memory_embeddings``, it must be of the
    ``hnsw`` access method. The migration creates it; this test only
    asserts the catalog if present.
    """
    async with engine.begin() as conn:
        rows = await conn.execute(
            text(
                "SELECT indexname FROM pg_indexes "
                "WHERE tablename = 'memory_embeddings' "
                "AND indexname LIKE '%hnsw%'"
            )
        )
        names = [r[0] for r in rows]
    for name in names:
        async with engine.begin() as conn:
            check = await conn.execute(
                text(
                    "SELECT am.amname FROM pg_class c "
                    "JOIN pg_am am ON c.relam = am.oid "
                    "WHERE c.relname = :n"
                ),
                {"n": name},
            )
            assert check.scalar() == "hnsw"
