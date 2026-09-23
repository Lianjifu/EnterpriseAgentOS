"""observability module — 0013 migration.

Adds two tables:

- ``run_records``  — single observed business action (turn / tool call /
                     skill invocation / memory write / etc.).  Sourced
                     from event-bus subscriptions.
- ``cost_records`` — money line attached to a ``run_records`` row.
                     ``amount_usd`` is NUMERIC(12, 6) — first Decimal
                     column in the project.

Indexes / constraints:

- ix (tenant_id, workspace_id, run_type, completed_at DESC) on
  ``run_records`` — primary list path
- ix (tenant_id, source_id) on ``run_records`` — cross-reference lookup
- ix (tenant_id, workspace_id, created_at DESC) on ``cost_records`` —
  cost list + window aggregation
- ix (tenant_id, run_id) on ``cost_records`` — per-run breakdown
- CK status enum on ``run_records``
- CK cost_type enum on ``cost_records``
- CK amount_usd >= 0 on ``cost_records``

Cascade rules:

- ``cost_records`` → ``run_records`` (RESTRICT) — cost rows are
  forensic; we keep them after a run is purged (run purge is not
  implemented in P9).

``source_id`` is intentionally NOT a FK: it spans modules (turn_id,
tool_call_id, skill_invocation_id, ...) and P9 keeps it as a weak
reference to enable cross-module auditing.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0013_observability"
down_revision: str | Sequence[str] | None = "0012_evaluation"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── run_records ──────────────────────────────────────────────────────
    op.create_table(
        "run_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("run_type", sa.String(16), nullable=False),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("latency_ms", sa.Integer, nullable=True),
        sa.Column(
            "status",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'succeeded'"),
        ),
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
        sa.CheckConstraint(
            "run_type IN ('llm','tool','skill','memory','knowledge',"
            "'workflow','channel','eval','governance')",
            name="ck_run_records_run_type_enum",
        ),
        sa.CheckConstraint(
            "status IN ('succeeded','failed','running')",
            name="ck_run_records_status_enum",
        ),
        sa.CheckConstraint(
            "latency_ms IS NULL OR latency_ms >= 0",
            name="ck_run_records_latency_nonneg",
        ),
    )
    op.create_index("ix_run_records_tenant_id", "run_records", ["tenant_id"])
    op.create_index(
        "ix_run_records_tenant_id_workspace_id_run_type_completed_at",
        "run_records",
        ["tenant_id", "workspace_id", "run_type", "completed_at"],
    )
    op.create_index(
        "ix_run_records_tenant_id_source_id",
        "run_records",
        ["tenant_id", "source_id"],
        postgresql_where=sa.text("source_id IS NOT NULL"),
    )

    # ── cost_records ─────────────────────────────────────────────────────
    op.create_table(
        "cost_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "run_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("run_records.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("cost_type", sa.String(16), nullable=False),
        sa.Column("amount_usd", sa.Numeric(12, 6), nullable=False),
        sa.Column("quantity", sa.Integer, nullable=True),
        sa.Column(
            "unit",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'call'"),
        ),
        sa.Column(
            "currency",
            sa.String(8),
            nullable=False,
            server_default=sa.text("'USD'"),
        ),
        sa.Column("model_id", sa.String(128), nullable=True),
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
        sa.CheckConstraint(
            "cost_type IN ('llm_input','llm_output','tool','skill','memory',"
            "'knowledge','channel')",
            name="ck_cost_records_cost_type_enum",
        ),
        sa.CheckConstraint(
            "amount_usd >= 0",
            name="ck_cost_records_amount_nonneg",
        ),
        sa.CheckConstraint(
            "currency = 'USD'",
            name="ck_cost_records_currency_usd",
        ),
        sa.CheckConstraint(
            "length(unit) BETWEEN 1 AND 16",
            name="ck_cost_records_unit_length",
        ),
        sa.CheckConstraint(
            "quantity IS NULL OR quantity >= 0",
            name="ck_cost_records_quantity_nonneg",
        ),
    )
    op.create_index("ix_cost_records_tenant_id", "cost_records", ["tenant_id"])
    op.create_index(
        "ix_cost_records_tenant_id_workspace_id_created_at",
        "cost_records",
        ["tenant_id", "workspace_id", "created_at"],
    )
    op.create_index(
        "ix_cost_records_tenant_id_run_id",
        "cost_records",
        ["tenant_id", "run_id"],
    )
    op.create_index(
        "ix_cost_records_tenant_id_cost_type_created_at",
        "cost_records",
        ["tenant_id", "cost_type", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_cost_records_tenant_id_cost_type_created_at",
        table_name="cost_records",
    )
    op.drop_index(
        "ix_cost_records_tenant_id_run_id",
        table_name="cost_records",
    )
    op.drop_index(
        "ix_cost_records_tenant_id_workspace_id_created_at",
        table_name="cost_records",
    )
    op.drop_index("ix_cost_records_tenant_id", table_name="cost_records")
    op.drop_table("cost_records")

    op.drop_index(
        "ix_run_records_tenant_id_source_id",
        table_name="run_records",
    )
    op.drop_index(
        "ix_run_records_tenant_id_workspace_id_run_type_completed_at",
        table_name="run_records",
    )
    op.drop_index("ix_run_records_tenant_id", table_name="run_records")
    op.drop_table("run_records")


__all__ = ["downgrade", "upgrade"]