"""evaluation module — 0012 migration.

Adds three tables:

- ``eval_datasets`` — named tenant-scoped dataset bundle; mutable status
                      (active ↔ archived); 1:N to ``eval_cases``.
- ``eval_cases``     — single golden case: input + expected_keywords +
                      scoring thresholds; ordinal-sorted per dataset.
- ``eval_runs``      — execution record for an evaluation against a
                      ``(template_id, version_id)`` pair.  Immutable
                      once terminal.  Idempotency via partial UQ.

Indexes / constraints:

- UQ (tenant_id, name) on ``eval_datasets``
- CK on kind/status enums (datasets), status enum (runs), ratio/latency
  ranges (cases), score range (runs)
- partial UQ (tenant_id, idempotency_key) WHERE NOT NULL on ``eval_runs``
- ix (workspace_id, status) on datasets
- ix (dataset_id, ordinal) on cases
- ix (workspace_id, template_id, version_id) on runs
- ix (tenant_id) on cases for cross-tenant scan

Cascade rules:

- eval_cases → eval_datasets (ON DELETE CASCADE) — when a dataset is
  purged, its cases go with it; sets are not standalone audit artefacts.
- eval_runs has no FK to a dataset/template/version table because eval
  is the source-of-truth for the gate.  No cascades.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0012_evaluation"
down_revision: str | Sequence[str] | None = "0011_agent_factory"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── eval_datasets ──────────────────────────────────────────────────────
    op.create_table(
        "eval_datasets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column(
            "description",
            sa.Text,
            nullable=False,
            server_default=sa.text("''"),
        ),
        sa.Column(
            "kind",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'custom'"),
        ),
        sa.Column(
            "status",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'active'"),
        ),
        sa.Column(
            "case_count",
            sa.Integer,
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "metadata",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
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
        sa.CheckConstraint(
            "kind IN ('builtin','custom')",
            name="ck_eval_datasets_kind_enum",
        ),
        sa.CheckConstraint(
            "status IN ('active','archived')",
            name="ck_eval_datasets_status_enum",
        ),
        sa.CheckConstraint(
            "case_count >= 0",
            name="ck_eval_datasets_case_count_nonneg",
        ),
    )
    op.create_index("ix_eval_datasets_tenant_id", "eval_datasets", ["tenant_id"])
    op.create_index(
        "ix_eval_datasets_tenant_id_workspace_id_status",
        "eval_datasets",
        ["tenant_id", "workspace_id", "status"],
    )
    op.create_unique_constraint(
        "uq_eval_datasets_tenant_id_name",
        "eval_datasets",
        ["tenant_id", "name"],
    )

    # ── eval_cases ─────────────────────────────────────────────────────────
    op.create_table(
        "eval_cases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "dataset_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("eval_datasets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("ordinal", sa.Integer, nullable=False),
        sa.Column("input", sa.Text, nullable=False),
        sa.Column(
            "expected_keywords",
            postgresql.ARRAY(sa.String(128)),
            nullable=False,
            server_default=sa.text("'{}'::text[]"),
        ),
        sa.Column(
            "min_keywords_hit_ratio",
            sa.Numeric(4, 3),
            nullable=False,
            server_default=sa.text("0.600"),
        ),
        sa.Column(
            "max_latency_ms",
            sa.Integer,
            nullable=False,
            server_default=sa.text("30000"),
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
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "min_keywords_hit_ratio BETWEEN 0 AND 1",
            name="ck_eval_cases_min_hit_ratio_range",
        ),
        sa.CheckConstraint(
            "max_latency_ms BETWEEN 1 AND 600000",
            name="ck_eval_cases_max_latency_range",
        ),
    )
    op.create_index("ix_eval_cases_tenant_id", "eval_cases", ["tenant_id"])
    op.create_index(
        "ix_eval_cases_dataset_id_ordinal",
        "eval_cases",
        ["dataset_id", "ordinal"],
    )

    # ── eval_runs ──────────────────────────────────────────────────────────
    op.create_table(
        "eval_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "dataset_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("eval_datasets.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "status",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'queued'"),
        ),
        sa.Column("mean_score", sa.Numeric(4, 3), nullable=True),
        sa.Column(
            "case_count",
            sa.Integer,
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "passed_count",
            sa.Integer,
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "failed_count",
            sa.Integer,
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "completed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("idempotency_key", sa.String(128), nullable=True),
        sa.Column("triggered_by", postgresql.UUID(as_uuid=True), nullable=True),
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
        sa.CheckConstraint(
            "status IN ('queued','running','passed','failed','errored')",
            name="ck_eval_runs_status_enum",
        ),
        sa.CheckConstraint(
            "mean_score IS NULL OR mean_score BETWEEN 0 AND 1",
            name="ck_eval_runs_mean_score_range",
        ),
        sa.CheckConstraint(
            "case_count >= 0 AND passed_count >= 0 AND failed_count >= 0",
            name="ck_eval_runs_counts_nonneg",
        ),
    )
    op.create_index("ix_eval_runs_tenant_id", "eval_runs", ["tenant_id"])
    op.create_index(
        "ix_eval_runs_tenant_id_workspace_id_template_id_version_id",
        "eval_runs",
        ["tenant_id", "workspace_id", "template_id", "version_id"],
    )
    op.create_index(
        "uq_eval_runs_idempotency",
        "eval_runs",
        ["tenant_id", "idempotency_key"],
        unique=True,
        postgresql_where=sa.text("idempotency_key IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_eval_runs_idempotency", table_name="eval_runs")
    op.drop_index(
        "ix_eval_runs_tenant_id_workspace_id_template_id_version_id",
        table_name="eval_runs",
    )
    op.drop_index("ix_eval_runs_tenant_id", table_name="eval_runs")
    op.drop_table("eval_runs")

    op.drop_index("ix_eval_cases_dataset_id_ordinal", table_name="eval_cases")
    op.drop_index("ix_eval_cases_tenant_id", table_name="eval_cases")
    op.drop_table("eval_cases")

    op.drop_constraint(
        "uq_eval_datasets_tenant_id_name",
        "eval_datasets",
        type_="unique",
    )
    op.drop_index(
        "ix_eval_datasets_tenant_id_workspace_id_status",
        table_name="eval_datasets",
    )
    op.drop_index("ix_eval_datasets_tenant_id", table_name="eval_datasets")
    op.drop_table("eval_datasets")