"""Knowledge domain entities.

Three aggregate roots: ``KnowledgePackage`` (a curated collection),
``KnowledgeAsset`` (one uploaded artifact — text, document, or webpage),
and ``KnowledgeChunk`` (one embedding-indexed slice of an asset's text).

All entities are frozen dataclasses with `slots=True`. Mutating
operations return new instances (`with_status`, `with_chunk_count`).

Embedding dimension matches ``eos_llm.llm_embedding_dim`` (1536 for the
default ``text-embedding-3-small``).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from eos_schema.ids import (
    KnowledgeAssetId,
    KnowledgeChunkId,
    KnowledgePackageId,
    TenantId,
    UserId,
    WorkspaceId,
)

from deos.modules.knowledge.domain.errors import (
    KnowledgeAssetNotFound,
    KnowledgeValidationError,
)
from deos.modules.knowledge.domain.value_objects import (
    DEFAULT_CHUNK_OVERLAP,
    DEFAULT_CHUNK_SIZE,
    KnowledgeAssetKind,
    KnowledgeAssetStatus,
    KnowledgePackageStatus,
)

EMBEDDING_DIM = 1536


def _utcnow() -> datetime:
    return datetime.now(UTC)


@dataclass(slots=True, frozen=True)
class KnowledgeChunk:
    """One embedding-indexed slice of an asset's text."""

    id: KnowledgeChunkId
    tenant_id: TenantId
    workspace_id: WorkspaceId
    package_id: KnowledgePackageId
    asset_id: KnowledgeAssetId
    ordinal: int
    content: str
    char_start: int
    char_end: int
    created_at: datetime = field(default_factory=_utcnow)

    @classmethod
    def from_text(
        cls,
        *,
        id: KnowledgeChunkId | None,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        package_id: KnowledgePackageId,
        asset_id: KnowledgeAssetId,
        ordinal: int,
        text: str,
        char_start: int,
        char_end: int,
        now: datetime | None = None,
    ) -> KnowledgeChunk:
        if ordinal < 0:
            raise KnowledgeValidationError(
                f"ordinal must be >= 0, got {ordinal}", code="INVALID_KNOWLEDGE_SPEC"
            )
        if not text:
            raise KnowledgeValidationError(
                "chunk content must be non-empty", code="INVALID_KNOWLEDGE_SPEC"
            )
        if char_end <= char_start:
            raise KnowledgeValidationError(
                f"char_end ({char_end}) must be > char_start ({char_start})",
                code="INVALID_KNOWLEDGE_SPEC",
            )
        chunk_id = id if id is not None else KnowledgeChunkId(uuid4())
        return cls(
            id=chunk_id,
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            package_id=package_id,
            asset_id=asset_id,
            ordinal=ordinal,
            content=text,
            char_start=char_start,
            char_end=char_end,
            created_at=now or _utcnow(),
        )


@dataclass(slots=True, frozen=True)
class KnowledgeAsset:
    """One uploaded artifact attached to a knowledge package."""

    id: KnowledgeAssetId
    tenant_id: TenantId
    workspace_id: WorkspaceId
    package_id: KnowledgePackageId
    kind: KnowledgeAssetKind
    name: str
    mime_type: str
    byte_size: int
    storage_uri: str
    status: KnowledgeAssetStatus = KnowledgeAssetStatus.PENDING
    chunk_count: int = 0
    error_message: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)

    @classmethod
    def create(
        cls,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        package_id: KnowledgePackageId,
        kind: KnowledgeAssetKind | str,
        name: str,
        mime_type: str,
        byte_size: int,
        storage_uri: str,
        metadata: dict[str, Any] | None = None,
        id: KnowledgeAssetId | None = None,
        now: datetime | None = None,
    ) -> KnowledgeAsset:
        if not name or not name.strip():
            raise KnowledgeValidationError(
                "asset name must be non-empty", code="INVALID_KNOWLEDGE_SPEC"
            )
        if byte_size < 0:
            raise KnowledgeValidationError(
                f"byte_size must be >= 0, got {byte_size}",
                code="INVALID_KNOWLEDGE_SPEC",
            )
        if not storage_uri:
            raise KnowledgeValidationError(
                "storage_uri must be non-empty", code="INVALID_KNOWLEDGE_SPEC"
            )
        kind_enum = (
            kind if isinstance(kind, KnowledgeAssetKind) else KnowledgeAssetKind(kind)
        )
        ts = now or _utcnow()
        return cls(
            id=id if id is not None else KnowledgeAssetId(uuid4()),
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            package_id=package_id,
            kind=kind_enum,
            name=name,
            mime_type=mime_type or "application/octet-stream",
            byte_size=byte_size,
            storage_uri=storage_uri,
            status=KnowledgeAssetStatus.PENDING,
            chunk_count=0,
            error_message=None,
            metadata=dict(metadata or {}),
            created_at=ts,
            updated_at=ts,
        )

    def with_status(
        self,
        *,
        status: KnowledgeAssetStatus,
        error_message: str | None = None,
        now: datetime | None = None,
    ) -> KnowledgeAsset:
        ts = now or _utcnow()
        return KnowledgeAsset(
            id=self.id,
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            package_id=self.package_id,
            kind=self.kind,
            name=self.name,
            mime_type=self.mime_type,
            byte_size=self.byte_size,
            storage_uri=self.storage_uri,
            status=status,
            chunk_count=self.chunk_count,
            error_message=error_message,
            metadata=dict(self.metadata),
            created_at=self.created_at,
            updated_at=ts,
        )

    def with_chunk_count(
        self, *, chunk_count: int, now: datetime | None = None
    ) -> KnowledgeAsset:
        if chunk_count < 0:
            raise KnowledgeValidationError(
                f"chunk_count must be >= 0, got {chunk_count}",
                code="INVALID_KNOWLEDGE_SPEC",
            )
        ts = now or _utcnow()
        return KnowledgeAsset(
            id=self.id,
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            package_id=self.package_id,
            kind=self.kind,
            name=self.name,
            mime_type=self.mime_type,
            byte_size=self.byte_size,
            storage_uri=self.storage_uri,
            status=self.status,
            chunk_count=chunk_count,
            error_message=self.error_message,
            metadata=dict(self.metadata),
            created_at=self.created_at,
            updated_at=ts,
        )

    def is_visible(self) -> bool:
        """Whether the asset is ready to be searched.

        Chunks are only emitted into the vector index once the asset
        reaches ``READY``; intermediate / failed / revoked assets are
        hidden from search.
        """
        return self.status == KnowledgeAssetStatus.READY

    def assert_visible(self) -> None:
        if not self.is_visible():
            raise KnowledgeAssetNotFound(
                f"asset {self.id} not visible (status={self.status.value})",
                code="KNOWLEDGE_ASSET_NOT_READY",
            )


@dataclass(slots=True, frozen=True)
class KnowledgePackage:
    """A curated collection of knowledge assets."""

    id: KnowledgePackageId
    tenant_id: TenantId
    workspace_id: WorkspaceId
    name: str
    description: str
    status: KnowledgePackageStatus = KnowledgePackageStatus.ACTIVE
    asset_count: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)
    created_by: UserId | None = None
    # Tier B signing triple — same shape as SkillPackage.signature etc.
    # Defaults are "" so existing seeds / tests keep constructing
    # without explicit signing; the vetter enforces "all three set or all
    # empty" once ``EOS_KNOWLEDGE_SIGNING_MODE != "disabled"``.
    signature: str = ""
    signer_key_id: str = ""
    image_digest: str = ""
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)

    @classmethod
    def create(
        cls,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        name: str,
        description: str = "",
        metadata: dict[str, Any] | None = None,
        created_by: UserId | None = None,
        id: KnowledgePackageId | None = None,
        now: datetime | None = None,
        signature: str = "",
        signer_key_id: str = "",
        image_digest: str = "",
    ) -> KnowledgePackage:
        if not name or not name.strip():
            raise KnowledgeValidationError(
                "package name must be non-empty", code="INVALID_KNOWLEDGE_SPEC"
            )
        if len(name) > 128:
            raise KnowledgeValidationError(
                f"package name too long ({len(name)} > 128)",
                code="INVALID_KNOWLEDGE_SPEC",
            )
        signing_fields = (bool(signature), bool(signer_key_id), bool(image_digest))
        if any(signing_fields) and not all(signing_fields):
            raise KnowledgeValidationError(
                "signature / signer_key_id / image_digest must all be set together",
                code="INVALID_KNOWLEDGE_SPEC",
            )
        ts = now or _utcnow()
        return cls(
            id=id if id is not None else KnowledgePackageId(uuid4()),
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            name=name,
            description=description or "",
            status=KnowledgePackageStatus.ACTIVE,
            asset_count=0,
            metadata=dict(metadata or {}),
            created_by=created_by,
            signature=signature,
            signer_key_id=signer_key_id,
            image_digest=image_digest,
            created_at=ts,
            updated_at=ts,
        )

    def with_status(
        self,
        *,
        status: KnowledgePackageStatus,
        now: datetime | None = None,
    ) -> KnowledgePackage:
        ts = now or _utcnow()
        return KnowledgePackage(
            id=self.id,
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            name=self.name,
            description=self.description,
            status=status,
            asset_count=self.asset_count,
            metadata=dict(self.metadata),
            created_by=self.created_by,
            signature=self.signature,
            signer_key_id=self.signer_key_id,
            image_digest=self.image_digest,
            created_at=self.created_at,
            updated_at=ts,
        )

    def with_asset_count(
        self, *, asset_count: int, now: datetime | None = None
    ) -> KnowledgePackage:
        if asset_count < 0:
            raise KnowledgeValidationError(
                f"asset_count must be >= 0, got {asset_count}",
                code="INVALID_KNOWLEDGE_SPEC",
            )
        ts = now or _utcnow()
        return KnowledgePackage(
            id=self.id,
            tenant_id=self.tenant_id,
            workspace_id=self.workspace_id,
            name=self.name,
            description=self.description,
            status=self.status,
            asset_count=asset_count,
            metadata=dict(self.metadata),
            created_by=self.created_by,
            signature=self.signature,
            signer_key_id=self.signer_key_id,
            image_digest=self.image_digest,
            created_at=self.created_at,
            updated_at=ts,
        )


def chunk_size_default() -> int:
    return DEFAULT_CHUNK_SIZE


def chunk_overlap_default() -> int:
    return DEFAULT_CHUNK_OVERLAP


__all__ = [
    "DEFAULT_CHUNK_OVERLAP",
    "DEFAULT_CHUNK_SIZE",
    "EMBEDDING_DIM",
    "KnowledgeAsset",
    "KnowledgeChunk",
    "KnowledgePackage",
]


# Convenience re-export of errors so consumers can `from deos.modules.knowledge.domain.entities import KnowledgePackageNotFound`.
_KNOWLEDGE_ENTITY_REEXPORTS = (
    "KnowledgeAssetNotFound",
    "KnowledgeChunkNotFound",
    "KnowledgePackageNotFound",
    "KnowledgeValidationError",
)
__all__ += list(_KNOWLEDGE_ENTITY_REEXPORTS)  # type: ignore[arg-type]
