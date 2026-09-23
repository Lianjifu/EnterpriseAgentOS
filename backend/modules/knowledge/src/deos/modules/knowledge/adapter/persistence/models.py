"""SQLAlchemy ORM models for the knowledge module.

Three core tables plus one vector mirror:

- ``knowledge_packages`` — curated collection (one row per package)
- ``knowledge_assets``   — uploaded artifact attached to a package
- ``knowledge_chunks``    — text slice of an asset, holds the 1536-dim
                            pgvector column.  HNSW cosine index lives here
                            for the SQL-side recall path.
- ``knowledge_chunks_vec`` — mirror managed by ``eos_vector.PgVectorStore``
                            for payload-filtered retrieval (the
                            ``VectorSearchPort`` adapter).

soft-delete (revoked) is enforced via filters on read; rows stay around
for audit / replay.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from eos_persistence.base import Base, TenantScopedMixin, make_composite_index
from eos_persistence.pgvector import register_pgvector
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column


class KnowledgePackageORM(TenantScopedMixin, Base):
    __tablename__ = "knowledge_packages"

    workspace_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("''")
    )
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        server_default=text("'active'"),
    )
    asset_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )
    created_by: Mapped[UUID | None] = mapped_column(PgUUID(as_uuid=True), nullable=True)
    # Tier B signing triple — mirrors ``skill_packages.signature``.
    # NOT NULL DEFAULT '' so existing rows satisfy the constraint;
    # partial-triple invariant is enforced in ``KnowledgePackage.create()``.
    signature: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=text("''")
    )
    signer_key_id: Mapped[str] = mapped_column(
        String(64), nullable=False, default="", server_default=text("''")
    )
    image_digest: Mapped[str] = mapped_column(
        String(128), nullable=False, default="", server_default=text("''")
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('active','archived','revoked')",
            name="knowledge_packages_status_enum",
        ),
        make_composite_index("workspace_id", "status"),
        # UQ (tenant_id, name) — enforced by raw SQL in migration
    )


class KnowledgeAssetORM(TenantScopedMixin, Base):
    __tablename__ = "knowledge_assets"

    workspace_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), nullable=False, index=True
    )
    package_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("knowledge_packages.id", ondelete="CASCADE"),
        nullable=False,
    )
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    mime_type: Mapped[str] = mapped_column(
        String(128), nullable=False, server_default=text("'application/octet-stream'")
    )
    byte_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    storage_uri: Mapped[str] = mapped_column(String(512), nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default=text("'pending'")
    )
    chunk_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )

    __table_args__ = (
        CheckConstraint(
            "kind IN ('text','document','webpage')",
            name="knowledge_assets_kind_enum",
        ),
        CheckConstraint(
            "status IN ('pending','processing','ready','failed','revoked')",
            name="knowledge_assets_status_enum",
        ),
        make_composite_index("workspace_id", "package_id", "status"),
    )


# Eagerly register pgvector so the Vector() type resolves.
register_pgvector()
from pgvector.sqlalchemy import Vector


class KnowledgeChunkORM(TenantScopedMixin, Base):
    __tablename__ = "knowledge_chunks"

    workspace_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), nullable=False, index=True
    )
    package_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("knowledge_packages.id", ondelete="CASCADE"),
        nullable=False,
    )
    asset_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("knowledge_assets.id", ondelete="CASCADE"),
        nullable=False,
    )
    ordinal: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    char_start: Mapped[int] = mapped_column(Integer, nullable=False)
    char_end: Mapped[int] = mapped_column(Integer, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(1536), nullable=False)

    __table_args__ = (
        make_composite_index("workspace_id", "asset_id", "ordinal"),
        make_composite_index("workspace_id", "package_id"),
    )


__all__ = [
    "KnowledgeAssetORM",
    "KnowledgeChunkORM",
    "KnowledgePackageORM",
]
