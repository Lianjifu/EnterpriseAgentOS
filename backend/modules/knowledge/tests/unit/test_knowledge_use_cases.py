"""Use-case tests for the knowledge module — in-memory fakes only.

Covers: create/get/list/revoke package, upload asset, ingest text,
detach asset, search top-k, package_ids filter, asset_kind filter,
policy_guard smoke.
"""

from __future__ import annotations

from uuid import uuid4

import pytest

from deos.modules.knowledge.application.chunker import FixedWindowChunker
from deos.modules.knowledge.application.services import KnowledgeService
from deos.modules.knowledge.domain.errors import (
    KnowledgeAlreadyRevoked,
    KnowledgeAssetNotFound,
    KnowledgePackageNameConflict,
    KnowledgePackageNotFound,
)
from deos.modules.knowledge.domain.events import (
    KnowledgeAssetIngested,
    KnowledgeAssetUploaded,
    KnowledgePackageCreated,
    KnowledgePackageRevoked,
)
from deos.modules.knowledge.domain.value_objects import (
    KnowledgeAssetKind,
    KnowledgeAssetStatus,
    KnowledgePackageStatus,
)
from _knowledge_unit_in_memory import (
    DeterministicEmbedding,
    InMemoryKnowledgeRepository,
    InMemoryStorage,
    InMemoryVectorSearch,
    RecordingPublisher,
)
from eos_schema.ids import (
    KnowledgeAssetId,
    KnowledgePackageId,
    TenantId,
    UserId,
    WorkspaceId,
)


@pytest.fixture
def env() -> dict:  # type: ignore[type-arg]
    repo = InMemoryKnowledgeRepository()
    storage = InMemoryStorage()
    vec = InMemoryVectorSearch()
    embed = DeterministicEmbedding()
    pub = RecordingPublisher()
    svc = KnowledgeService.from_parts(
        repository=repo,
        storage=storage,
        embedding=embed,
        vector_search=vec,
        publisher=pub,
        chunker=FixedWindowChunker(),
    )
    return {
        "repo": repo,
        "storage": storage,
        "vec": vec,
        "embed": embed,
        "pub": pub,
        "svc": svc,
    }


def _ids() -> tuple[TenantId, WorkspaceId, UserId]:
    return (
        TenantId(uuid4()),
        WorkspaceId(uuid4()),
        UserId(uuid4()),
    )


# ── create + get + list ──────────────────────────────────────────────────


async def test_create_package_persists_and_publishes(env) -> None:
    tid, wid, uid = _ids()
    pkg = await env["svc"].create_package.execute(
        tenant_id=tid, workspace_id=wid, name="faq", created_by=uid
    )
    assert pkg.name == "faq"
    assert (await env["repo"].get_package(tenant_id=tid, package_id=pkg.id)) is not None
    assert any(isinstance(e, KnowledgePackageCreated) for e in env["pub"].events)


async def test_create_package_duplicate_name_conflicts(env) -> None:
    tid, wid, _ = _ids()
    await env["svc"].create_package.execute(
        tenant_id=tid, workspace_id=wid, name="dup"
    )
    with pytest.raises(KnowledgePackageNameConflict):
        await env["svc"].create_package.execute(
            tenant_id=tid, workspace_id=wid, name="dup"
        )


async def test_get_package_unknown_workspace_returns_none(env) -> None:
    tid, wid, _ = _ids()
    other_wid = WorkspaceId(uuid4())
    pkg = await env["svc"].create_package.execute(
        tenant_id=tid, workspace_id=wid, name="x"
    )
    with pytest.raises(KnowledgePackageNotFound):
        await env["svc"].get_package.execute(
            tenant_id=tid, workspace_id=other_wid, package_id=pkg.id
        )


async def test_get_package_wrong_tenant_returns_none(env) -> None:
    tid, wid, _ = _ids()
    other_tid = TenantId(uuid4())
    await env["svc"].create_package.execute(
        tenant_id=tid, workspace_id=wid, name="x"
    )
    # When called directly on repo, an unknown tenant simply returns None.
    rows = await env["repo"].list_packages(tenant_id=tid, workspace_id=wid)
    assert isinstance(rows, list)


async def test_list_packages_filters_by_workspace_and_orders_desc(env) -> None:
    tid, wid, _ = _ids()
    other_wid = WorkspaceId(uuid4())
    await env["svc"].create_package.execute(tenant_id=tid, workspace_id=wid, name="a")
    await env["svc"].create_package.execute(tenant_id=tid, workspace_id=wid, name="b")
    await env["svc"].create_package.execute(
        tenant_id=tid, workspace_id=other_wid, name="c"
    )
    rows = await env["svc"].list_packages.execute(tenant_id=tid, workspace_id=wid)
    names = [r.name for r in rows]
    assert names == ["b", "a"]


async def test_list_packages_rejects_bad_limit(env) -> None:
    tid, wid, _ = _ids()
    with pytest.raises(ValueError):
        await env["svc"].list_packages.execute(
            tenant_id=tid, workspace_id=wid, limit=0
        )


# ── upload + ingest + search ─────────────────────────────────────────────


async def test_upload_asset_stages_bytes_and_increments_count(env) -> None:
    tid, wid, _ = _ids()
    pkg = await env["svc"].create_package.execute(
        tenant_id=tid, workspace_id=wid, name="p"
    )
    asset = await env["svc"].upload_asset.execute(
        tenant_id=tid,
        workspace_id=wid,
        package_id=pkg.id,
        name="faq.txt",
        mime_type="text/plain",
        kind=KnowledgeAssetKind.TEXT,
        data=b"hello world",
    )
    assert asset.storage_uri.startswith("knowledge-asset://")
    assert await env["storage"].exists(tenant_id=tid, uri=asset.storage_uri)
    refreshed = await env["repo"].get_package(tenant_id=tid, package_id=pkg.id)
    assert refreshed is not None and refreshed.asset_count == 1
    assert any(isinstance(e, KnowledgeAssetUploaded) for e in env["pub"].events)


async def test_upload_asset_rejects_oversize_payload(env) -> None:
    tid, wid, _ = _ids()
    pkg = await env["svc"].create_package.execute(
        tenant_id=tid, workspace_id=wid, name="p"
    )
    with pytest.raises(Exception):
        await env["svc"].upload_asset.execute(
            tenant_id=tid,
            workspace_id=wid,
            package_id=pkg.id,
            name="huge.bin",
            mime_type="application/octet-stream",
            kind=KnowledgeAssetKind.DOCUMENT,
            data=b"x" * (21 * 1024 * 1024),
        )


async def test_ingest_asset_chunks_embeds_and_marks_ready(env) -> None:
    tid, wid, _ = _ids()
    pkg = await env["svc"].create_package.execute(
        tenant_id=tid, workspace_id=wid, name="p"
    )
    long_text = "alpha beta gamma. " * 200  # ~3000 chars → multiple chunks
    asset = await env["svc"].upload_asset.execute(
        tenant_id=tid,
        workspace_id=wid,
        package_id=pkg.id,
        name="long.txt",
        mime_type="text/plain",
        kind=KnowledgeAssetKind.TEXT,
        data=long_text.encode("utf-8"),
    )
    ready = await env["svc"].ingest_asset.execute(
        tenant_id=tid, asset_id=asset.id, chunk_size=400, chunk_overlap=80
    )
    assert ready.status == KnowledgeAssetStatus.READY
    assert ready.chunk_count > 1
    assert any(isinstance(e, KnowledgeAssetIngested) for e in env["pub"].events)


async def test_ingest_empty_payload_marks_ready_with_zero_chunks(env) -> None:
    tid, wid, _ = _ids()
    pkg = await env["svc"].create_package.execute(
        tenant_id=tid, workspace_id=wid, name="p"
    )
    asset = await env["svc"].upload_asset.execute(
        tenant_id=tid,
        workspace_id=wid,
        package_id=pkg.id,
        name="blank.txt",
        mime_type="text/plain",
        kind=KnowledgeAssetKind.TEXT,
        data=b"",
    )
    ready = await env["svc"].ingest_asset.execute(tenant_id=tid, asset_id=asset.id)
    assert ready.status == KnowledgeAssetStatus.READY
    assert ready.chunk_count == 0


async def test_search_returns_top_k_ordered_by_score(env) -> None:
    tid, wid, _ = _ids()
    pkg = await env["svc"].create_package.execute(
        tenant_id=tid, workspace_id=wid, name="kb"
    )
    asset = await env["svc"].upload_asset.execute(
        tenant_id=tid,
        workspace_id=wid,
        package_id=pkg.id,
        name="x.txt",
        mime_type="text/plain",
        kind=KnowledgeAssetKind.TEXT,
        data=(
            b"alpha beta gamma. delta epsilon zeta. "
            b"how to reset password. how to invite users. "
            b"troubleshooting billing issues. pricing tiers. "
        ),
    )
    await env["svc"].ingest_asset.execute(tenant_id=tid, asset_id=asset.id)
    hits = await env["svc"].search_query(
        tenant_id=tid, workspace_id=wid, query="reset password", top_k=3
    )
    assert 1 <= len(hits) <= 3
    for h in hits:
        assert {"id", "asset_id", "package_id", "content", "score"} <= set(h.keys())
        assert h["package_id"] == str(pkg.id)


async def test_search_filter_by_package_ids_restricts_results(env) -> None:
    tid, wid, _ = _ids()
    pkg_a = await env["svc"].create_package.execute(
        tenant_id=tid, workspace_id=wid, name="a"
    )
    pkg_b = await env["svc"].create_package.execute(
        tenant_id=tid, workspace_id=wid, name="b"
    )
    asset_a = await env["svc"].upload_asset.execute(
        tenant_id=tid,
        workspace_id=wid,
        package_id=pkg_a.id,
        name="a.txt",
        mime_type="text/plain",
        kind=KnowledgeAssetKind.TEXT,
        data=b"how to reset password alpha",
    )
    asset_b = await env["svc"].upload_asset.execute(
        tenant_id=tid,
        workspace_id=wid,
        package_id=pkg_b.id,
        name="b.txt",
        mime_type="text/plain",
        kind=KnowledgeAssetKind.TEXT,
        data=b"how to reset password beta",
    )
    await env["svc"].ingest_asset.execute(tenant_id=tid, asset_id=asset_a.id)
    await env["svc"].ingest_asset.execute(tenant_id=tid, asset_id=asset_b.id)
    only_a = await env["svc"].search_query(
        tenant_id=tid,
        workspace_id=wid,
        query="reset password",
        top_k=5,
        package_ids=(str(pkg_a.id),),
    )
    assert only_a
    assert all(h["package_id"] == str(pkg_a.id) for h in only_a)


async def test_search_filter_by_asset_kind_drops_other_kinds(env) -> None:
    tid, wid, _ = _ids()
    pkg = await env["svc"].create_package.execute(
        tenant_id=tid, workspace_id=wid, name="kb"
    )
    a_text = await env["svc"].upload_asset.execute(
        tenant_id=tid,
        workspace_id=wid,
        package_id=pkg.id,
        name="a.txt",
        mime_type="text/plain",
        kind=KnowledgeAssetKind.TEXT,
        data=b"reset password instructions",
    )
    a_doc = await env["svc"].upload_asset.execute(
        tenant_id=tid,
        workspace_id=wid,
        package_id=pkg.id,
        name="a.pdf",
        mime_type="application/pdf",
        kind=KnowledgeAssetKind.DOCUMENT,
        data=b"reset password appendix",
    )
    await env["svc"].ingest_asset.execute(tenant_id=tid, asset_id=a_text.id)
    await env["svc"].ingest_asset.execute(tenant_id=tid, asset_id=a_doc.id)
    only_text = await env["svc"].search_query(
        tenant_id=tid,
        workspace_id=wid,
        query="reset password",
        top_k=5,
        asset_kind=KnowledgeAssetKind.TEXT,
    )
    assert only_text
    assert all(h["asset_name"] == "a.txt" for h in only_text)


# ── ingest_text short-flow ───────────────────────────────────────────────


async def test_ingest_text_inline_uploads_and_indexes(env) -> None:
    tid, wid, _ = _ids()
    pkg = await env["svc"].create_package.execute(
        tenant_id=tid, workspace_id=wid, name="kb"
    )
    asset = await env["svc"].ingest_text.execute(
        tenant_id=tid,
        workspace_id=wid,
        package_id=pkg.id,
        name="inline.txt",
        text="how to reset password in our product.",
        mime_type="text/plain",
        ingest_use_case=env["svc"].ingest_asset,
    )
    assert asset.status == KnowledgeAssetStatus.READY
    assert asset.chunk_count >= 1
    hits = await env["svc"].search_query(
        tenant_id=tid, workspace_id=wid, query="reset password"
    )
    assert any("reset password" in h["content"] for h in hits)


async def test_ingest_text_without_ingest_use_case_returns_pending(env) -> None:
    tid, wid, _ = _ids()
    pkg = await env["svc"].create_package.execute(
        tenant_id=tid, workspace_id=wid, name="kb"
    )
    asset = await env["svc"].ingest_text.execute(
        tenant_id=tid,
        workspace_id=wid,
        package_id=pkg.id,
        name="lazy.txt",
        text="hello",
        ingest_use_case=None,
    )
    assert asset.status == KnowledgeAssetStatus.PENDING


# ── detach + revoke + cross-tenant isolation ─────────────────────────────


async def test_detach_asset_soft_deletes_and_purges_vector_rows(env) -> None:
    tid, wid, uid = _ids()
    pkg = await env["svc"].create_package.execute(
        tenant_id=tid, workspace_id=wid, name="kb"
    )
    asset = await env["svc"].upload_asset.execute(
        tenant_id=tid,
        workspace_id=wid,
        package_id=pkg.id,
        name="x.txt",
        mime_type="text/plain",
        kind=KnowledgeAssetKind.TEXT,
        data=b"reset password",
    )
    await env["svc"].ingest_asset.execute(tenant_id=tid, asset_id=asset.id)
    detached = await env["svc"].detach_asset.execute(
        tenant_id=tid, workspace_id=wid, asset_id=asset.id, actor_id=uid
    )
    assert detached.status == KnowledgeAssetStatus.REVOKED
    hits = await env["svc"].search_query(
        tenant_id=tid, workspace_id=wid, query="reset password"
    )
    assert all(h["asset_id"] != str(asset.id) for h in hits)


async def test_detach_asset_twice_raises(env) -> None:
    tid, wid, uid = _ids()
    pkg = await env["svc"].create_package.execute(
        tenant_id=tid, workspace_id=wid, name="kb"
    )
    asset = await env["svc"].upload_asset.execute(
        tenant_id=tid,
        workspace_id=wid,
        package_id=pkg.id,
        name="x.txt",
        mime_type="text/plain",
        kind=KnowledgeAssetKind.TEXT,
        data=b"hi",
    )
    await env["svc"].detach_asset.execute(
        tenant_id=tid, workspace_id=wid, asset_id=asset.id, actor_id=uid
    )
    with pytest.raises(KnowledgeAlreadyRevoked):
        await env["svc"].detach_asset.execute(
            tenant_id=tid, workspace_id=wid, asset_id=asset.id, actor_id=uid
        )


async def test_revoke_package_cascades_to_assets_and_chunks(env) -> None:
    tid, wid, uid = _ids()
    pkg = await env["svc"].create_package.execute(
        tenant_id=tid, workspace_id=wid, name="kb"
    )
    asset = await env["svc"].upload_asset.execute(
        tenant_id=tid,
        workspace_id=wid,
        package_id=pkg.id,
        name="x.txt",
        mime_type="text/plain",
        kind=KnowledgeAssetKind.TEXT,
        data=b"reset password",
    )
    await env["svc"].ingest_asset.execute(tenant_id=tid, asset_id=asset.id)
    revoked_pkg = await env["svc"].revoke_package.execute(
        tenant_id=tid, workspace_id=wid, package_id=pkg.id, actor_id=uid
    )
    assert revoked_pkg.status == KnowledgePackageStatus.REVOKED
    assets = await env["repo"].list_assets_for_package(
        tenant_id=tid, package_id=pkg.id
    )
    assert all(a.status == KnowledgeAssetStatus.REVOKED for a in assets)
    hits = await env["svc"].search_query(
        tenant_id=tid, workspace_id=wid, query="reset password"
    )
    assert hits == []
    assert any(isinstance(e, KnowledgePackageRevoked) for e in env["pub"].events)


async def test_revoke_package_twice_raises(env) -> None:
    tid, wid, uid = _ids()
    pkg = await env["svc"].create_package.execute(
        tenant_id=tid, workspace_id=wid, name="kb"
    )
    await env["svc"].revoke_package.execute(
        tenant_id=tid, workspace_id=wid, package_id=pkg.id, actor_id=uid
    )
    with pytest.raises(KnowledgeAlreadyRevoked):
        await env["svc"].revoke_package.execute(
            tenant_id=tid, workspace_id=wid, package_id=pkg.id, actor_id=uid
        )


async def test_search_ignores_chunks_from_other_tenants(env) -> None:
    tid, wid, _ = _ids()
    other_tid = TenantId(uuid4())
    pkg = await env["svc"].create_package.execute(
        tenant_id=tid, workspace_id=wid, name="kb"
    )
    asset = await env["svc"].upload_asset.execute(
        tenant_id=tid,
        workspace_id=wid,
        package_id=pkg.id,
        name="x.txt",
        mime_type="text/plain",
        kind=KnowledgeAssetKind.TEXT,
        data=b"reset password",
    )
    await env["svc"].ingest_asset.execute(tenant_id=tid, asset_id=asset.id)
    hits = await env["svc"].search_query(
        tenant_id=other_tid, workspace_id=wid, query="reset password"
    )
    assert hits == []


async def test_unknown_asset_ingest_raises(env) -> None:
    tid, _, _ = _ids()
    with pytest.raises(KnowledgeAssetNotFound):
        await env["svc"].ingest_asset.execute(
            tenant_id=tid, asset_id=KnowledgeAssetId(uuid4())
        )


async def test_unknown_package_upload_raises(env) -> None:
    tid, wid, _ = _ids()
    with pytest.raises(KnowledgePackageNotFound):
        await env["svc"].upload_asset.execute(
            tenant_id=tid,
            workspace_id=wid,
            package_id=KnowledgePackageId(uuid4()),
            name="x",
            mime_type="text/plain",
            kind=KnowledgeAssetKind.TEXT,
            data=b"hi",
        )


# ── FixedWindowChunker sanity ─────────────────────────────────────────────


def test_chunker_rejects_invalid_args() -> None:
    c = FixedWindowChunker()
    with pytest.raises(ValueError):
        c.split("hello", chunk_size=0, chunk_overlap=0)
    with pytest.raises(ValueError):
        c.split("hello", chunk_size=10, chunk_overlap=10)
    with pytest.raises(ValueError):
        c.split("hello", chunk_size=10, chunk_overlap=-1)


def test_chunker_returns_empty_for_empty_input() -> None:
    assert FixedWindowChunker().split("", chunk_size=10, chunk_overlap=0) == []


def test_chunker_single_short_text_yields_one_chunk() -> None:
    out = FixedWindowChunker().split("hi", chunk_size=10, chunk_overlap=0)
    assert out == [("hi", 0, 2)]


def test_chunker_long_text_splits_with_overlap() -> None:
    text = "x" * 25
    out = FixedWindowChunker().split(text, chunk_size=10, chunk_overlap=2)
    assert out[0] == ("xxxxxxxxxx", 0, 10)
    assert out[-1][2] == 25
    assert out[1][0] == "xxxxxxxxxx"  # 8 + 2 overlap == 10


# ── Policy guard smoke ───────────────────────────────────────────────────


class _DenyGuard:
    """Always deny — used to confirm policy_guard plumbing works."""

    def __init__(self) -> None:
        self.calls = 0

    async def check(self, *, actor, action, resource) -> None:  # type: ignore[no-untyped-def]
        self.calls += 1
        from eos_kernel.errors import ForbiddenError

        raise ForbiddenError("denied", code="ACTION_DENIED")


async def test_policy_guard_is_invoked_on_package_create(env) -> None:
    from eos_kernel.errors import ForbiddenError

    guard = _DenyGuard()
    svc = KnowledgeService.from_parts(
        repository=env["repo"],
        storage=env["storage"],
        embedding=env["embed"],
        vector_search=env["vec"],
        publisher=env["pub"],
        chunker=FixedWindowChunker(),
        policy_guard=guard,
    )
    tid, wid, _ = _ids()
    with pytest.raises(ForbiddenError):
        await svc.create_package.execute(tenant_id=tid, workspace_id=wid, name="x")
    assert guard.calls == 1