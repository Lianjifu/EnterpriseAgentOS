"""Domain tests for knowledge entities + value objects."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest

from deos.modules.knowledge.domain.entities import (
    EMBEDDING_DIM,
    KnowledgeAsset,
    KnowledgeChunk,
    KnowledgePackage,
    chunk_overlap_default,
    chunk_size_default,
)
from deos.modules.knowledge.domain.errors import (
    KnowledgeAlreadyRevoked,
    KnowledgeValidationError,
)
from deos.modules.knowledge.domain.value_objects import (
    DEFAULT_CHUNK_OVERLAP,
    DEFAULT_CHUNK_SIZE,
    KnowledgeAssetKind,
    KnowledgeAssetStatus,
    KnowledgePackageStatus,
    RetrievalQuery,
)
from eos_schema.ids import (
    KnowledgeAssetId,
    KnowledgeChunkId,
    KnowledgePackageId,
    TenantId,
    UserId,
    WorkspaceId,
)


def _ids() -> tuple[TenantId, WorkspaceId, UserId]:
    return (
        TenantId(uuid4()),
        WorkspaceId(uuid4()),
        UserId(uuid4()),
    )


def test_embedding_dim_constant() -> None:
    assert EMBEDDING_DIM == 1536


def test_default_chunk_constants_are_positive() -> None:
    assert chunk_size_default() == DEFAULT_CHUNK_SIZE == 800
    assert chunk_overlap_default() == DEFAULT_CHUNK_OVERLAP == 80


# ── KnowledgePackage ─────────────────────────────────────────────────────


def test_package_create_assigns_uuid_when_id_missing() -> None:
    tid, wid, uid = _ids()
    pkg = KnowledgePackage.create(
        tenant_id=tid, workspace_id=wid, name="p", created_by=uid
    )
    assert isinstance(UUID(str(pkg.id)), UUID)
    assert pkg.status == KnowledgePackageStatus.ACTIVE
    assert pkg.asset_count == 0


def test_package_create_uses_caller_id_when_provided() -> None:
    tid, wid, _ = _ids()
    fixed = KnowledgePackageId(uuid4())
    pkg = KnowledgePackage.create(
        tenant_id=tid, workspace_id=wid, name="p", id=fixed
    )
    assert pkg.id == fixed


def test_package_create_rejects_empty_name() -> None:
    tid, wid, _ = _ids()
    with pytest.raises(KnowledgeValidationError):
        KnowledgePackage.create(tenant_id=tid, workspace_id=wid, name="")


def test_package_create_rejects_whitespace_name() -> None:
    tid, wid, _ = _ids()
    with pytest.raises(KnowledgeValidationError):
        KnowledgePackage.create(tenant_id=tid, workspace_id=wid, name="   ")


def test_package_create_rejects_oversized_name() -> None:
    tid, wid, _ = _ids()
    with pytest.raises(KnowledgeValidationError):
        KnowledgePackage.create(tenant_id=tid, workspace_id=wid, name="x" * 129)


def test_package_with_asset_count_increments() -> None:
    tid, wid, _ = _ids()
    pkg = KnowledgePackage.create(tenant_id=tid, workspace_id=wid, name="p")
    updated = pkg.with_asset_count(asset_count=3)
    assert updated.asset_count == 3
    assert pkg.asset_count == 0  # frozen


def test_package_with_asset_count_rejects_negative() -> None:
    tid, wid, _ = _ids()
    pkg = KnowledgePackage.create(tenant_id=tid, workspace_id=wid, name="p")
    with pytest.raises(KnowledgeValidationError):
        pkg.with_asset_count(asset_count=-1)


def test_package_with_status_flips_state() -> None:
    tid, wid, _ = _ids()
    pkg = KnowledgePackage.create(tenant_id=tid, workspace_id=wid, name="p")
    revoked = pkg.with_status(status=KnowledgePackageStatus.REVOKED)
    assert revoked.status == KnowledgePackageStatus.REVOKED
    assert pkg.status == KnowledgePackageStatus.ACTIVE


# ── KnowledgeAsset ───────────────────────────────────────────────────────


def test_asset_create_assigns_uuid_when_id_missing() -> None:
    tid, wid, _ = _ids()
    asset = KnowledgeAsset.create(
        tenant_id=tid,
        workspace_id=wid,
        package_id=KnowledgePackageId(uuid4()),
        kind=KnowledgeAssetKind.TEXT,
        name="faq.txt",
        mime_type="text/plain",
        byte_size=100,
        storage_uri="knowledge-asset://x/y",
    )
    assert isinstance(UUID(str(asset.id)), UUID)
    assert asset.status == KnowledgeAssetStatus.PENDING
    assert asset.chunk_count == 0


def test_asset_create_rejects_empty_name() -> None:
    tid, wid, _ = _ids()
    with pytest.raises(KnowledgeValidationError):
        KnowledgeAsset.create(
            tenant_id=tid,
            workspace_id=wid,
            package_id=KnowledgePackageId(uuid4()),
            kind=KnowledgeAssetKind.TEXT,
            name="",
            mime_type="text/plain",
            byte_size=1,
            storage_uri="u",
        )


def test_asset_create_rejects_negative_byte_size() -> None:
    tid, wid, _ = _ids()
    with pytest.raises(KnowledgeValidationError):
        KnowledgeAsset.create(
            tenant_id=tid,
            workspace_id=wid,
            package_id=KnowledgePackageId(uuid4()),
            kind=KnowledgeAssetKind.TEXT,
            name="x",
            mime_type="text/plain",
            byte_size=-1,
            storage_uri="u",
        )


def test_asset_create_rejects_empty_uri() -> None:
    tid, wid, _ = _ids()
    with pytest.raises(KnowledgeValidationError):
        KnowledgeAsset.create(
            tenant_id=tid,
            workspace_id=wid,
            package_id=KnowledgePackageId(uuid4()),
            kind=KnowledgeAssetKind.TEXT,
            name="x",
            mime_type="text/plain",
            byte_size=1,
            storage_uri="",
        )


def test_asset_kind_accepts_str_input() -> None:
    tid, wid, _ = _ids()
    asset = KnowledgeAsset.create(
        tenant_id=tid,
        workspace_id=wid,
        package_id=KnowledgePackageId(uuid4()),
        kind="text",
        name="x",
        mime_type="text/plain",
        byte_size=1,
        storage_uri="u",
    )
    assert asset.kind == KnowledgeAssetKind.TEXT


def test_asset_with_status_records_error_message() -> None:
    tid, wid, _ = _ids()
    asset = KnowledgeAsset.create(
        tenant_id=tid,
        workspace_id=wid,
        package_id=KnowledgePackageId(uuid4()),
        kind=KnowledgeAssetKind.TEXT,
        name="x",
        mime_type="text/plain",
        byte_size=1,
        storage_uri="u",
    )
    failed = asset.with_status(
        status=KnowledgeAssetStatus.FAILED, error_message="boom"
    )
    assert failed.status == KnowledgeAssetStatus.FAILED
    assert failed.error_message == "boom"


def test_asset_with_chunk_count_rejects_negative() -> None:
    tid, wid, _ = _ids()
    asset = KnowledgeAsset.create(
        tenant_id=tid,
        workspace_id=wid,
        package_id=KnowledgePackageId(uuid4()),
        kind=KnowledgeAssetKind.TEXT,
        name="x",
        mime_type="text/plain",
        byte_size=1,
        storage_uri="u",
    )
    with pytest.raises(KnowledgeValidationError):
        asset.with_chunk_count(chunk_count=-2)


def test_asset_is_visible_only_when_ready() -> None:
    tid, wid, _ = _ids()
    asset = KnowledgeAsset.create(
        tenant_id=tid,
        workspace_id=wid,
        package_id=KnowledgePackageId(uuid4()),
        kind=KnowledgeAssetKind.TEXT,
        name="x",
        mime_type="text/plain",
        byte_size=1,
        storage_uri="u",
    )
    assert not asset.is_visible()
    ready = asset.with_status(status=KnowledgeAssetStatus.READY)
    assert ready.is_visible()
    assert not ready.with_status(status=KnowledgeAssetStatus.REVOKED).is_visible()


def test_asset_assert_visible_raises_when_not_ready() -> None:
    tid, wid, _ = _ids()
    asset = KnowledgeAsset.create(
        tenant_id=tid,
        workspace_id=wid,
        package_id=KnowledgePackageId(uuid4()),
        kind=KnowledgeAssetKind.TEXT,
        name="x",
        mime_type="text/plain",
        byte_size=1,
        storage_uri="u",
    )
    with pytest.raises(Exception):
        asset.assert_visible()


# ── KnowledgeChunk ───────────────────────────────────────────────────────


def test_chunk_from_text_assigns_uuid_when_id_missing() -> None:
    tid, wid, _ = _ids()
    chunk = KnowledgeChunk.from_text(
        id=None,
        tenant_id=tid,
        workspace_id=wid,
        package_id=KnowledgePackageId(uuid4()),
        asset_id=KnowledgeAssetId(uuid4()),
        ordinal=0,
        text="hello world",
        char_start=0,
        char_end=11,
    )
    assert isinstance(UUID(str(chunk.id)), UUID)
    assert chunk.ordinal == 0


def test_chunk_from_text_rejects_empty_text() -> None:
    tid, wid, _ = _ids()
    with pytest.raises(KnowledgeValidationError):
        KnowledgeChunk.from_text(
            id=None,
            tenant_id=tid,
            workspace_id=wid,
            package_id=KnowledgePackageId(uuid4()),
            asset_id=KnowledgeAssetId(uuid4()),
            ordinal=0,
            text="",
            char_start=0,
            char_end=0,
        )


def test_chunk_from_text_rejects_inverted_range() -> None:
    tid, wid, _ = _ids()
    with pytest.raises(KnowledgeValidationError):
        KnowledgeChunk.from_text(
            id=None,
            tenant_id=tid,
            workspace_id=wid,
            package_id=KnowledgePackageId(uuid4()),
            asset_id=KnowledgeAssetId(uuid4()),
            ordinal=0,
            text="x",
            char_start=5,
            char_end=2,
        )


def test_chunk_from_text_rejects_negative_ordinal() -> None:
    tid, wid, _ = _ids()
    with pytest.raises(KnowledgeValidationError):
        KnowledgeChunk.from_text(
            id=None,
            tenant_id=tid,
            workspace_id=wid,
            package_id=KnowledgePackageId(uuid4()),
            asset_id=KnowledgeAssetId(uuid4()),
            ordinal=-1,
            text="x",
            char_start=0,
            char_end=1,
        )


def test_chunk_uses_supplied_now() -> None:
    tid, wid, _ = _ids()
    when = datetime.now(UTC) + timedelta(days=1)
    chunk = KnowledgeChunk.from_text(
        id=None,
        tenant_id=tid,
        workspace_id=wid,
        package_id=KnowledgePackageId(uuid4()),
        asset_id=KnowledgeAssetId(uuid4()),
        ordinal=0,
        text="x",
        char_start=0,
        char_end=1,
        now=when,
    )
    assert chunk.created_at == when


# ── RetrievalQuery ───────────────────────────────────────────────────────


def test_retrieval_query_defaults_top_k_to_10() -> None:
    q = RetrievalQuery(query="x")
    assert q.top_k == 10


def test_retrieval_query_rejects_empty_query() -> None:
    with pytest.raises(ValueError):
        RetrievalQuery(query="")


def test_retrieval_query_rejects_top_k_zero() -> None:
    with pytest.raises(ValueError):
        RetrievalQuery(query="x", top_k=0)


def test_retrieval_query_rejects_top_k_over_max() -> None:
    with pytest.raises(ValueError):
        RetrievalQuery(query="x", top_k=51)


def test_retrieval_query_accepts_asset_kind_filter() -> None:
    q = RetrievalQuery(query="x", asset_kind_filter=KnowledgeAssetKind.DOCUMENT)
    assert q.asset_kind_filter == KnowledgeAssetKind.DOCUMENT


def test_retrieval_query_accepts_package_ids() -> None:
    q = RetrievalQuery(query="x", package_ids=("a", "b"))
    assert q.package_ids == ("a", "b")


# ── KnowledgeAlreadyRevoked sanity ───────────────────────────────────────


def test_knowledge_already_revoked_error_subclasses_conflict() -> None:
    err = KnowledgeAlreadyRevoked("dup")
    assert err.code == "KNOWLEDGE_ALREADY_REVOKED"
    assert err.status == 409
