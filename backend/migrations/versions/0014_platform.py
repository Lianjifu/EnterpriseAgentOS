"""platform module — 0014 migration.

Adds three tables:

- ``plans`` — global catalog row (NO tenant scope).  Plans are shared
  across all tenants.  ``code`` is unique and immutable in practice.
- ``subscriptions`` — per-tenant assignment to a :class:`Plan`.  One
  subscription per tenant (UQ ``tenant_id``); switching plan = update.
- ``tenant_settings`` — per-tenant key/value overrides.  Free-form
  JSONB ``value``; ``key`` is unique per tenant.

Indexes / constraints:

- UQ ``code`` on ``plans``
- ix ``status`` on ``plans`` for catalog filtering
- UQ ``tenant_id`` on ``subscriptions``
- ix ``tenant_id, plan_id`` on ``subscriptions`` for cross-tenant
  plan rollup
- UQ ``tenant_id, key`` on ``tenant_settings``
- ix ``tenant_id`` on ``tenant_settings`` for list_for_tenant
- CK status enum on ``subscriptions``
- CK status enum on ``plans``
- CK price_monthly_usd >= 0 on ``plans``
- CK ``key`` length 1..128 on ``tenant_settings``
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0014_platform"
down_revision: str | Sequence[str] | None = "0013_observability"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── plans ────────────────────────────────────────────────────────────
    op.create_table(
        "plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(64), nullable=False),
        sa.Column("display_name", sa.String(256), nullable=False),
        sa.Column("description", sa.Text, nullable=False, server_default=sa.text("''")),
        sa.Column("limits", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("features", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("price_monthly_usd", sa.Numeric(10, 2), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "status",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'active'"),
        ),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("code", name="uq_plans_code"),
        sa.CheckConstraint(
            "status IN ('active','hidden','retired')",
            name="ck_plans_status_enum",
        ),
        sa.CheckConstraint(
            "price_monthly_usd >= 0",
            name="ck_plans_price_nonneg",
        ),
    )
    op.create_index("ix_plans_status", "plans", ["status"])
    op.create_index("ix_plans_sort_order", "plans", ["sort_order"])

    # ── subscriptions ────────────────────────────────────────────────────
    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "plan_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("plans.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("plan_code", sa.String(64), nullable=False),
        sa.Column(
            "status",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'active'"),
        ),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "auto_renew",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "metadata",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("tenant_id", name="uq_subscriptions_tenant_id"),
        sa.CheckConstraint(
            "status IN ('active','suspended','cancelled')",
            name="ck_subscriptions_status_enum",
        ),
    )
    op.create_index(
        "ix_subscriptions_tenant_id", "subscriptions", ["tenant_id"]
    )
    op.create_index(
        "ix_subscriptions_tenant_id_plan_id",
        "subscriptions",
        ["tenant_id", "plan_id"],
    )

    # ── tenant_settings ──────────────────────────────────────────────────
    op.create_table(
        "tenant_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("key", sa.String(128), nullable=False),
        sa.Column("value", postgresql.JSONB, nullable=False),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("tenant_id", "key", name="uq_tenant_settings_tenant_id_key"),
        sa.CheckConstraint(
            "length(key) BETWEEN 1 AND 128",
            name="ck_tenant_settings_key_length",
        ),
    )
    op.create_index(
        "ix_tenant_settings_tenant_id", "tenant_settings", ["tenant_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_tenant_settings_tenant_id", table_name="tenant_settings")
    op.drop_table("tenant_settings")

    op.drop_index(
        "ix_subscriptions_tenant_id_plan_id", table_name="subscriptions"
    )
    op.drop_index("ix_subscriptions_tenant_id", table_name="subscriptions")
    op.drop_table("subscriptions")

    op.drop_index("ix_plans_sort_order", table_name="plans")
    op.drop_index("ix_plans_status", table_name="plans")
    op.drop_table("plans")


__all__ = ["downgrade", "upgrade"]
