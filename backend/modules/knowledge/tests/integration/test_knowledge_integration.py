"""Integration tests for the knowledge module against a real PostgreSQL +
pgvector instance.

Run with: ``uv run pytest modules/knowledge/tests/integration/ -m integration``.

Requires ``EOS_DATABASE_URL`` (default
``postgresql+asyncpg://postgres:postgres@localhost:5499/eos_dev``) and
the ``vector`` extension enabled.

Tests cover:
  1. Migration creates the four knowledge tables (incl. vector mirror).
  2. Create + ingest + HNSW-backed search returns the right chunk.
  3. Cross-tenant isolation.
  4. Workspace_id filter in vector payload.
  5. asset_kind filter restricts results.
  6. Revoke cascades to chunks + vector rows.
"""

from __future__ import annotations

import os
from uuid import UUID, uuid4

import pytest
from eos_persistence.pgvector import register_pgvector
from eos_schema.ids import (
    KnowledgeAssetId,
    KnowledgePackageId,
    TenantId,
    UserId,
    WorkspaceId,
)
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    create_async_engine,
)

# pgvector type MUST be registered before importing ORM models
register_pgvector()

from eos_vector.pg_vector import PgVectorStore

from deos.modules.knowledge.adapter.persistence.repositories import (
    SqlKnowledgeRepository,
)
from deos.modules.knowledge.adapter.persistence.vector_adapter import (
    PgKnowledgeVectorAdapter,
)
from deos.modules.knowledge.domain.entities import (
    EMBEDDING_DIM,
    KnowledgeAsset,
    KnowledgePackage,
)
from deos.modules.knowledge.domain.value_objects import (
    KnowledgeAssetKind,
    KnowledgeAssetStatus,
    KnowledgePackageStatus,
)

pytestmark = pytest.mark.integration


DEFAULT_URL = "postgresql+asyncpg://postgres:postgres@localhost:5499/eos_dev"


def _url() -> str:
    return os.environ.get("EOS_DATABASE_URL", DEFAULT_URL)


def _embedding(seed: str) -> list[float]:
    """Deterministic 1536-dim embedding keyed by ``seed``."""
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
    async with eng.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    yield eng
    await eng.dispose()


@pytest.fixture
async def repo_and_vs(engine: AsyncEngine):
    async with engine.connect() as conn:
        trans = await conn.begin()
        try:
            session = AsyncSession(bind=conn)
            repo = SqlKnowledgeRepository(session=session)
            store = PgVectorStore(
                engine=engine,
                table="knowledge_chunks_vec",
                dim=EMBEDDING_DIM,
            )
            vs = PgKnowledgeVectorAdapter(store=store, engine=engine)
            yield repo, vs
            await session.flush()
            await trans.commit()
        except Exception:
            await trans.rollback()
            raise


async def _make_package(
    repo: SqlKnowledgeRepository, *, tenant, ws
) -> KnowledgePackage:
    pkg = KnowledgePackage.create(
        tenant_id=tenant,
        workspace_id=ws,
        name=f"pkg-{uuid4().hex[:8]}",
        created_by=UserId(uuid4()),
    )
    return await repo.add_package(pkg)


async def _make_asset(
    repo: SqlKnowledgeRepository, *, tenant, ws, pkg
) -> KnowledgeAsset:
    asset = KnowledgeAsset.create(
        tenant_id=tenant,
        workspace_id=ws,
        package_id=pkg.id,
        kind=KnowledgeAssetKind.TEXT,
        name="a.txt",
        mime_type="text/plain",
        byte_size=42,
        storage_uri=f"knowledge-asset://{tenant}/deadbeef",
    )
    return await repo.add_asset(asset)


async def _commit(repo: SqlKnowledgeRepository) -> None:
    sess = repo._session  # type: ignore[attr-defined]
    await sess.commit()


async def test_migration_creates_four_tables(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        rows = await conn.execute(
            text(
                "SELECT to_regclass('public.knowledge_packages'), "
                "to_regclass('public.knowledge_assets'), "
                "to_regclass('public.knowledge_chunks'), "
                "to_regclass('public.knowledge_chunks_vec')"
            )
        )
        row = rows.first()
        assert row is not None
        assert all(r is not None for r in row)


async def test_create_ingest_and_search_top_k(repo_and_vs) -> None:
    repo, vs = repo_and_vs
    tenant = TenantId(uuid4())
    ws = WorkspaceId(uuid4())
    pkg = await _make_package(repo, tenant=tenant, ws=ws)
    asset = await _make_asset(repo, tenant=tenant, ws=ws, pkg=pkg)

    # Write chunks directly to the repo + vector adapter (no real ingest
    # pipeline here; that has its own unit test).
    from eos_schema.ids import KnowledgeChunkId

    from deos.modules.knowledge.domain.entities import KnowledgeChunk

    target_chunk = KnowledgeChunk.from_text(
        id=None,
        tenant_id=tenant,
        workspace_id=ws,
        package_id=pkg.id,
        asset_id=asset.id,
        ordinal=0,
        text="reset password instructions",
        char_start=0,
        char_end=27,
    )
    other_chunk = KnowledgeChunk.from_text(
        id=None,
        tenant_id=tenant,
        workspace_id=ws,
        package_id=pkg.id,
        asset_id=asset.id,
        ordinal=1,
        text="unrelated content about pricing",
        char_start=27,
        char_end=58,
    )
    target_emb = tuple(_embedding("reset password"))
    other_emb = tuple(_embedding("unrelated"))
    await repo.add_chunks(
        chunks=[target_chunk, other_chunk],
        embeddings=[target_emb, other_emb],
    )
    # The target chunk doesn't carry an `_embedding` attribute; use a
    # handcrafted embedding for the vector path.
    await vs.upsert(
        tenant_id=tenant,
        workspace_id=ws,
        chunk_id=KnowledgeChunkId(target_chunk.id),
        embedding=target_emb,
        payload={
            "package_id": str(pkg.id),
            "asset_id": str(asset.id),
            "workspace_id": str(ws),
            "asset_kind": KnowledgeAssetKind.TEXT.value,
        },
    )
    await vs.upsert(
        tenant_id=tenant,
        workspace_id=ws,
        chunk_id=KnowledgeChunkId(other_chunk.id),
        embedding=other_emb,
        payload={
            "package_id": str(pkg.id),
            "asset_id": str(asset.id),
            "workspace_id": str(ws),
            "asset_kind": KnowledgeAssetKind.TEXT.value,
        },
    )
    # Flip asset to READY so the search use case keeps it.
    await repo.update_asset(
        asset.with_status(status=KnowledgeAssetStatus.READY).with_chunk_count(
            chunk_count=2
        )
    )
    await _commit(repo)

    qvec = tuple(_embedding("reset password"))
    hits = await vs.search(
        tenant_id=tenant,
        workspace_id=ws,
        query_embedding=qvec,
        top_k=5,
    )
    assert hits, "expected at least one vector hit"
    assert hits[0].chunk_id == KnowledgeChunkId(target_chunk.id)


async def test_cross_tenant_isolation(repo_and_vs) -> None:
    repo, vs = repo_and_vs
    tenant_a = TenantId(uuid4())
    tenant_b = TenantId(uuid4())
    ws = WorkspaceId(uuid4())
    pkg_a = await _make_package(repo, tenant=tenant_a, ws=ws)
    pkg_b = await _make_package(repo, tenant=tenant_b, ws=ws)
    asset_a = await _make_asset(repo, tenant=tenant_a, ws=ws, pkg=pkg_a)
    asset_b = await _make_asset(repo, tenant=tenant_b, ws=ws, pkg=pkg_b)

    from eos_schema.ids import KnowledgeChunkId

    from deos.modules.knowledge.domain.entities import KnowledgeChunk

    c_a = KnowledgeChunk.from_text(
        id=None,
        tenant_id=tenant_a,
        workspace_id=ws,
        package_id=pkg_a.id,
        asset_id=asset_a.id,
        ordinal=0,
        text="reset password",
        char_start=0,
        char_end=14,
    )
    c_b = KnowledgeChunk.from_text(
        id=None,
        tenant_id=tenant_b,
        workspace_id=ws,
        package_id=pkg_b.id,
        asset_id=asset_b.id,
        ordinal=0,
        text="reset password",
        char_start=0,
        char_end=14,
    )
    emb = tuple(_embedding("reset password"))
    await repo.add_chunks(
        chunks=[c_a, c_b],
        embeddings=[emb, emb],
    )
    for tid, pkg_id, asset_id, cid in (
        (tenant_a, pkg_a.id, asset_a.id, c_a.id),
        (tenant_b, pkg_b.id, asset_b.id, c_b.id),
    ):
        await vs.upsert(
            tenant_id=tid,
            workspace_id=ws,
            chunk_id=KnowledgeChunkId(cid),
            embedding=emb,
            payload={
                "package_id": str(pkg_id),
                "asset_id": str(asset_id),
                "workspace_id": str(ws),
            },
        )
    await _commit(repo)

    hits_a = await vs.search(
        tenant_id=tenant_a, workspace_id=ws, query_embedding=emb, top_k=10
    )
    hits_b = await vs.search(
        tenant_id=tenant_b, workspace_id=ws, query_embedding=emb, top_k=10
    )
    ids_a = {h.chunk_id for h in hits_a}
    ids_b = {h.chunk_id for h in hits_b}
    assert ids_a.isdisjoint(ids_b)
    assert KnowledgeChunkId(c_a.id) in ids_a
    assert KnowledgeChunkId(c_b.id) in ids_b


async def test_workspace_filter_in_vector_payload(repo_and_vs) -> None:
    repo, vs = repo_and_vs
    tenant = TenantId(uuid4())
    ws_a = WorkspaceId(uuid4())
    ws_b = WorkspaceId(uuid4())
    pkg_a = await _make_package(repo, tenant=tenant, ws=ws_a)
    pkg_b = await _make_package(repo, tenant=tenant, ws=ws_b)
    asset_a = await _make_asset(repo, tenant=tenant, ws=ws_a, pkg=pkg_a)
    asset_b = await _make_asset(repo, tenant=tenant, ws=ws_b, pkg=pkg_b)

    from eos_schema.ids import KnowledgeChunkId

    from deos.modules.knowledge.domain.entities import KnowledgeChunk

    emb = tuple(_embedding("hello"))
    c_a = KnowledgeChunk.from_text(
        id=None,
        tenant_id=tenant,
        workspace_id=ws_a,
        package_id=pkg_a.id,
        asset_id=asset_a.id,
        ordinal=0,
        text="hello",
        char_start=0,
        char_end=5,
    )
    c_b = KnowledgeChunk.from_text(
        id=None,
        tenant_id=tenant,
        workspace_id=ws_b,
        package_id=pkg_b.id,
        asset_id=asset_b.id,
        ordinal=0,
        text="hello",
        char_start=0,
        char_end=5,
    )
    await repo.add_chunks(
        chunks=[c_a, c_b],
        embeddings=[emb, emb],
    )
    for tid, ws_id, pkg_id, asset_id, cid in (
        (tenant, ws_a, pkg_a.id, asset_a.id, c_a.id),
        (tenant, ws_b, pkg_b.id, asset_b.id, c_b.id),
    ):
        await vs.upsert(
            tenant_id=tid,
            workspace_id=ws_id,
            chunk_id=KnowledgeChunkId(cid),
            embedding=emb,
            payload={
                "package_id": str(pkg_id),
                "asset_id": str(asset_id),
                "workspace_id": str(ws_id),
            },
        )
    await _commit(repo)

    hits_a = await vs.search(
        tenant_id=tenant, workspace_id=ws_a, query_embedding=emb, top_k=10
    )
    hits_b = await vs.search(
        tenant_id=tenant, workspace_id=ws_b, query_embedding=emb, top_k=10
    )
    assert {h.chunk_id for h in hits_a} == {KnowledgeChunkId(c_a.id)}
    assert {h.chunk_id for h in hits_b} == {KnowledgeChunkId(c_b.id)}


async def test_asset_kind_filter_restricts_results(repo_and_vs) -> None:
    repo, vs = repo_and_vs
    tenant = TenantId(uuid4())
    ws = WorkspaceId(uuid4())
    pkg = await _make_package(repo, tenant=tenant, ws=ws)

    from eos_schema.ids import KnowledgeChunkId

    from deos.modules.knowledge.domain.entities import KnowledgeAsset, KnowledgeChunk

    asset_text = KnowledgeAsset.create(
        tenant_id=tenant,
        workspace_id=ws,
        package_id=pkg.id,
        kind=KnowledgeAssetKind.TEXT,
        name="a.txt",
        mime_type="text/plain",
        byte_size=5,
        storage_uri=f"knowledge-asset://{tenant}/txt",
    )
    asset_doc = KnowledgeAsset.create(
        tenant_id=tenant,
        workspace_id=ws,
        package_id=pkg.id,
        kind=KnowledgeAssetKind.DOCUMENT,
        name="a.pdf",
        mime_type="application/pdf",
        byte_size=5,
        storage_uri=f"knowledge-asset://{tenant}/pdf",
    )
    a_text = await repo.add_asset(asset_text)
    a_doc = await repo.add_asset(asset_doc)
    emb = tuple(_embedding("reset password"))

    c_t = KnowledgeChunk.from_text(
        id=None,
        tenant_id=tenant,
        workspace_id=ws,
        package_id=pkg.id,
        asset_id=a_text.id,
        ordinal=0,
        text="reset password",
        char_start=0,
        char_end=14,
    )
    c_d = KnowledgeChunk.from_text(
        id=None,
        tenant_id=tenant,
        workspace_id=ws,
        package_id=pkg.id,
        asset_id=a_doc.id,
        ordinal=0,
        text="reset password appendix",
        char_start=0,
        char_end=23,
    )
    await repo.add_chunks(
        chunks=[c_t, c_d],
        embeddings=[emb, emb],
    )
    await vs.upsert(
        tenant_id=tenant,
        workspace_id=ws,
        chunk_id=KnowledgeChunkId(c_t.id),
        embedding=emb,
        payload={
            "package_id": str(pkg.id),
            "asset_id": str(a_text.id),
            "workspace_id": str(ws),
            "asset_kind": KnowledgeAssetKind.TEXT.value,
        },
    )
    await vs.upsert(
        tenant_id=tenant,
        workspace_id=ws,
        chunk_id=KnowledgeChunkId(c_d.id),
        embedding=emb,
        payload={
            "package_id": str(pkg.id),
            "asset_id": str(a_doc.id),
            "workspace_id": str(ws),
            "asset_kind": KnowledgeAssetKind.DOCUMENT.value,
        },
    )
    await _commit(repo)

    text_only = await vs.search(
        tenant_id=tenant,
        workspace_id=ws,
        query_embedding=emb,
        top_k=10,
        asset_kind_filter=KnowledgeAssetKind.TEXT,
    )
    assert {h.chunk_id for h in text_only} == {KnowledgeChunkId(c_t.id)}


async def test_delete_for_asset_removes_only_matching_rows(repo_and_vs) -> None:
    repo, vs = repo_and_vs
    tenant = TenantId(uuid4())
    ws = WorkspaceId(uuid4())
    pkg = await _make_package(repo, tenant=tenant, ws=ws)
    a_keep = await _make_asset(repo, tenant=tenant, ws=ws, pkg=pkg)
    a_drop = await _make_asset(repo, tenant=tenant, ws=ws, pkg=pkg)

    from eos_schema.ids import KnowledgeChunkId

    from deos.modules.knowledge.domain.entities import KnowledgeChunk

    emb = tuple(_embedding("x"))
    c_keep = KnowledgeChunk.from_text(
        id=None,
        tenant_id=tenant,
        workspace_id=ws,
        package_id=pkg.id,
        asset_id=a_keep.id,
        ordinal=0,
        text="keep",
        char_start=0,
        char_end=4,
    )
    c_drop = KnowledgeChunk.from_text(
        id=None,
        tenant_id=tenant,
        workspace_id=ws,
        package_id=pkg.id,
        asset_id=a_drop.id,
        ordinal=0,
        text="drop",
        char_start=0,
        char_end=4,
    )
    await repo.add_chunks(
        chunks=[c_keep, c_drop],
        embeddings=[emb, emb],
    )
    for cid, aid in ((c_keep.id, a_keep.id), (c_drop.id, a_drop.id)):
        await vs.upsert(
            tenant_id=tenant,
            workspace_id=ws,
            chunk_id=KnowledgeChunkId(cid),
            embedding=emb,
            payload={
                "package_id": str(pkg.id),
                "asset_id": str(aid),
                "workspace_id": str(ws),
            },
        )
    await _commit(repo)

    removed = await vs.delete_for_asset(
        tenant_id=tenant, asset_id=KnowledgeAssetId(a_drop.id)
    )
    assert removed == 1
    # Verify by re-running search — keep chunk should still be there.
    hits = await vs.search(
        tenant_id=tenant, workspace_id=ws, query_embedding=emb, top_k=10
    )
    assert {h.chunk_id for h in hits} == {KnowledgeChunkId(c_keep.id)}


async def test_delete_for_package_removes_all_assets_rows(repo_and_vs) -> None:
    repo, vs = repo_and_vs
    tenant = TenantId(uuid4())
    ws = WorkspaceId(uuid4())
    pkg_keep = await _make_package(repo, tenant=tenant, ws=ws)
    pkg_drop = await _make_package(repo, tenant=tenant, ws=ws)

    a_keep = await _make_asset(repo, tenant=tenant, ws=ws, pkg=pkg_keep)
    a_drop_a = await _make_asset(repo, tenant=tenant, ws=ws, pkg=pkg_drop)
    a_drop_b = await _make_asset(repo, tenant=tenant, ws=ws, pkg=pkg_drop)

    from eos_schema.ids import KnowledgeChunkId

    from deos.modules.knowledge.domain.entities import KnowledgeChunk

    emb = tuple(_embedding("y"))
    c_keep = KnowledgeChunk.from_text(
        id=None,
        tenant_id=tenant,
        workspace_id=ws,
        package_id=pkg_keep.id,
        asset_id=a_keep.id,
        ordinal=0,
        text="keep",
        char_start=0,
        char_end=4,
    )
    c_drop_a = KnowledgeChunk.from_text(
        id=None,
        tenant_id=tenant,
        workspace_id=ws,
        package_id=pkg_drop.id,
        asset_id=a_drop_a.id,
        ordinal=0,
        text="a",
        char_start=0,
        char_end=1,
    )
    c_drop_b = KnowledgeChunk.from_text(
        id=None,
        tenant_id=tenant,
        workspace_id=ws,
        package_id=pkg_drop.id,
        asset_id=a_drop_b.id,
        ordinal=0,
        text="b",
        char_start=0,
        char_end=1,
    )
    await repo.add_chunks(
        chunks=[c_keep, c_drop_a, c_drop_b],
        embeddings=[emb, emb, emb],
    )
    for cid, pkg_id, aid in (
        (c_keep.id, pkg_keep.id, a_keep.id),
        (c_drop_a.id, pkg_drop.id, a_drop_a.id),
        (c_drop_b.id, pkg_drop.id, a_drop_b.id),
    ):
        await vs.upsert(
            tenant_id=tenant,
            workspace_id=ws,
            chunk_id=KnowledgeChunkId(cid),
            embedding=emb,
            payload={
                "package_id": str(pkg_id),
                "asset_id": str(aid),
                "workspace_id": str(ws),
            },
        )
    await _commit(repo)

    removed = await vs.delete_for_package(
        tenant_id=tenant, package_id=KnowledgePackageId(pkg_drop.id)
    )
    assert removed == 2
    hits = await vs.search(
        tenant_id=tenant, workspace_id=ws, query_embedding=emb, top_k=10
    )
    assert {h.chunk_id for h in hits} == {KnowledgeChunkId(c_keep.id)}


async def test_hnsw_index_exists_on_chunks_vec(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        rows = await conn.execute(
            text(
                "SELECT indexname FROM pg_indexes "
                "WHERE tablename = 'knowledge_chunks_vec' "
                "AND indexname LIKE '%hnsw%'"
            )
        )
        names = [r[0] for r in rows]
    assert names, "expected an hnsw index on knowledge_chunks_vec"
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


__all__: list[str] = []


# keep unused references quiet
_ = (UUID, KnowledgePackageStatus, KnowledgeAssetStatus)
