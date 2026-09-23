"""SQLAlchemy ORM models for the memory module.

Two tables:
  - ``memory_entry``: scalar columns + tenant/workspace scoping via mixin
  - ``memory_embedding``: separate table so vector is independent of the
    row; FK cascades on delete.  The HNSW index lives on this table.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from eos_persistence.base import Base, TenantScopedMixin, make_composite_index
from eos_persistence.pgvector import register_pgvector
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column


class MemoryEntryORM(TenantScopedMixin, Base):
    __tablename__ = "memory_entries"

    workspace_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), nullable=False, index=True
    )
    owner_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    scope: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata",  # keep Python attribute `metadata_` separate from SQLAlchemy reserved
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    revoked: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    version_lock: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=text("1")
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        CheckConstraint(
            "scope IN ('user','agent','workspace')", name="memory_scope_enum"
        ),
        make_composite_index("workspace_id", "revoked", "expires_at"),
        make_composite_index("workspace_id", "scope"),
    )


# Eagerly register pgvector on import so any test or composition root
# that pulls in the models gets ``Vector()`` resolvable in schema
# reflection AND in ``Mapped`` annotations.
register_pgvector()
from pgvector.sqlalchemy import Vector


class MemoryEmbeddingORM(Base):
    __tablename__ = "memory_embeddings"

    memory_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("memory_entries.id", ondelete="CASCADE"),
        primary_key=True,
    )
    embedding: Mapped[list[float]] = mapped_column(Vector(1536), nullable=False)

    __table_args__ = (
        # raw SQL index in 0006_memory.py uses USING hnsw; ORM does not
        # own the index definition.
    )


__all__ = ["MemoryEmbeddingORM", "MemoryEntryORM"]
