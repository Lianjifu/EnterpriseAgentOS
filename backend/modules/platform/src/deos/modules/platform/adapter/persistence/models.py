"""SQLAlchemy ORM models for the platform module.

Three tables:

- ``plans`` — global catalog row.  NO :class:`TenantScopedMixin` —
  plans are shared across the platform.
- ``subscriptions`` — per-tenant assignment to a plan.  Inherits
  :class:`TenantScopedMixin` and overrides ``id`` / ``created_at`` to
  align with ``plans.id`` FK target (UUID PK).
- ``tenant_settings`` — per-tenant key/value override.
  :class:`TenantScopedMixin`.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from eos_persistence.base import Base, TenantScopedMixin
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column


class PlanORM(Base):
    """Global catalog row — one per ``code``."""

    __tablename__ = "plans"

    id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), primary_key=True
    )
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    display_name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("''")
    )
    limits: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    features: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    price_monthly_usd: Mapped[Any] = mapped_column(
        Numeric(10, 2), nullable=False, server_default=text("0")
    )
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default=text("'active'")
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint("code", name="uq_plans_code"),
        CheckConstraint(
            "status IN ('active','hidden','retired')",
            name="plans_status_enum",
        ),
        CheckConstraint(
            "price_monthly_usd >= 0", name="plans_price_nonneg"
        ),
    )


class SubscriptionORM(TenantScopedMixin, Base):
    __tablename__ = "subscriptions"

    workspace_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), nullable=False, index=True
    )
    plan_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("plans.id", ondelete="RESTRICT"),
        nullable=False,
    )
    plan_code: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default=text("'active'")
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    ends_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    auto_renew: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )
    updated_by: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True), nullable=True
    )
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )

    __table_args__ = (
        UniqueConstraint("tenant_id", name="uq_subscriptions_tenant_id"),
        CheckConstraint(
            "status IN ('active','suspended','cancelled')",
            name="subscriptions_status_enum",
        ),
    )


class TenantSettingORM(TenantScopedMixin, Base):
    __tablename__ = "tenant_settings"

    workspace_id: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True), nullable=True
    )
    key: Mapped[str] = mapped_column(String(128), nullable=False)
    value: Mapped[Any] = mapped_column(JSONB, nullable=False)
    updated_by: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True), nullable=True
    )

    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "key", name="uq_tenant_settings_tenant_id_key"
        ),
        CheckConstraint(
            "length(key) BETWEEN 1 AND 128",
            name="tenant_settings_key_length",
        ),
    )


__all__ = ["PlanORM", "SubscriptionORM", "TenantSettingORM"]