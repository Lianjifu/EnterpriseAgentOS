"""orchestration module — 0010 migration.

Adds three tables:

- ``orch_plans``          — persisted, named, version-pinned Plan DSL.
                          Owns its ``entry_dsl`` JSONB + max_total_steps.
                          (Renamed from ``plans`` in 2026-09 burn-in F1 fix
                          to avoid collision with the platform/billing
                          ``plans`` table added in 0014_platform.)
- ``workflow_runs``       — one execution of a plan.  Carries a snapshot
                          of the DSL so historical runs survive later
                          edits to the plan.
- ``workflow_step_runs``  — one row per executed step within a run.

Indexes / constraints:

- UQ (tenant_id, name) on ``orch_plans`` — name uniqueness within tenant
- partial UQ (tenant_id, idempotency_key) on ``workflow_runs`` —
  enforced only when ``idempotency_key IS NOT NULL`` so anonymous
  runs (no key) do not collide
- CK on status enums
- workflow_runs.idx (tenant_id, workspace_id, plan_id, status)
- workflow_runs.idx (tenant_id, started_at DESC)
- workflow_step_runs.idx (run_id, step_id)
- workflow_step_runs.idx (tenant_id)

Tenant scoping is via the application layer (``tenant_id`` column on
every table).  Cascade rules:

- workflow_step_runs → workflow_runs (ON DELETE CASCADE)
- workflow_runs → plans (ON DELETE RESTRICT) — historical runs must
  survive plan deletion, so RESTRICT and require explicit archival.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0010_orchestration"
down_revision: str | Sequence[str] | None = "0009_knowledge"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── orch_plans ────────────────────────────────────────────────────────
    # NOTE: table named ``orch_plans`` to avoid collision with the
    # platform/billing ``plans`` table added later in 0014_platform
    # (burn-in F1 fix 2026-09).
    op.create_table(
        "orch_plans",
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
            "entry_dsl",
            postgresql.JSONB,
            nullable=False,
        ),
        sa.Column(
            "max_total_steps",
            sa.Integer,
            nullable=False,
            server_default=sa.text("64"),
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
            "max_total_steps BETWEEN 1 AND 256",
            name="ck_orch_plans_max_total_steps_range",
        ),
    )
    op.create_index(
        "ix_orch_plans_tenant_id",
        "orch_plans",
        ["tenant_id"],
    )
    op.create_index(
        "ix_orch_plans_tenant_id_workspace_id_created_at",
        "orch_plans",
        ["tenant_id", "workspace_id", "created_at"],
    )
    op.create_unique_constraint(
        "uq_orch_plans_tenant_id_name",
        "orch_plans",
        ["tenant_id", "name"],
    )

    # ── workflow_runs ─────────────────────────────────────────────────────
    op.create_table(
        "workflow_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "plan_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("orch_plans.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "plan_dsl_snapshot",
            postgresql.JSONB,
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column(
            "variables",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "input",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "final_output",
            postgresql.JSONB,
            nullable=True,
        ),
        sa.Column("error_code", sa.String(64), nullable=True),
        sa.Column("trace_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "idempotency_key",
            sa.String(128),
            nullable=True,
        ),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "finished_at",
            sa.DateTime(timezone=True),
            nullable=True,
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
            "status IN ('pending','running','succeeded','failed','canceled','timed_out')",
            name="ck_workflow_runs_status_enum",
        ),
    )
    op.create_index(
        "ix_workflow_runs_tenant_id",
        "workflow_runs",
        ["tenant_id"],
    )
    op.create_index(
        "ix_workflow_runs_tenant_id_workspace_id_plan_id_status",
        "workflow_runs",
        ["tenant_id", "workspace_id", "plan_id", "status"],
    )
    op.create_index(
        "ix_workflow_runs_tenant_id_started_at",
        "workflow_runs",
        ["tenant_id", "started_at"],
    )
    # partial UQ on idempotency_key — only when the key is present so
    # anonymous runs (no key) do not collide with each other.
    op.create_index(
        "uq_workflow_runs_tenant_id_idempotency_key",
        "workflow_runs",
        ["tenant_id", "idempotency_key"],
        unique=True,
        postgresql_where=sa.text("idempotency_key IS NOT NULL"),
    )

    # ── workflow_step_runs ────────────────────────────────────────────────
    op.create_table(
        "workflow_step_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "run_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workflow_runs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("step_id", sa.String(128), nullable=False),
        sa.Column(
            "kind",
            sa.String(16),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column(
            "input_rendered",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "output",
            postgresql.JSONB,
            nullable=True,
        ),
        sa.Column("error_code", sa.String(64), nullable=True),
        sa.Column("latency_ms", sa.Integer, nullable=True),
        sa.Column(
            "parent_step_run_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("depth", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "finished_at",
            sa.DateTime(timezone=True),
            nullable=True,
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
            "kind IN ('agent','tool','skill','subplan','parallel','conditional','sequence')",
            name="ck_workflow_step_runs_kind_enum",
        ),
        sa.CheckConstraint(
            "status IN ('pending','running','succeeded','failed','skipped','timed_out')",
            name="ck_workflow_step_runs_status_enum",
        ),
    )
    op.create_index(
        "ix_workflow_step_runs_tenant_id",
        "workflow_step_runs",
        ["tenant_id"],
    )
    op.create_index(
        "ix_workflow_step_runs_run_id_step_id",
        "workflow_step_runs",
        ["run_id", "step_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_workflow_step_runs_run_id_step_id",
        table_name="workflow_step_runs",
    )
    op.drop_index(
        "ix_workflow_step_runs_tenant_id",
        table_name="workflow_step_runs",
    )
    op.drop_table("workflow_step_runs")

    op.drop_index(
        "uq_workflow_runs_tenant_id_idempotency_key",
        table_name="workflow_runs",
    )
    op.drop_index(
        "ix_workflow_runs_tenant_id_started_at",
        table_name="workflow_runs",
    )
    op.drop_index(
        "ix_workflow_runs_tenant_id_workspace_id_plan_id_status",
        table_name="workflow_runs",
    )
    op.drop_index(
        "ix_workflow_runs_tenant_id",
        table_name="workflow_runs",
    )
    op.drop_table("workflow_runs")

    op.drop_constraint("uq_orch_plans_tenant_id_name", "orch_plans", type_="unique")
    op.drop_index(
        "ix_orch_plans_tenant_id_workspace_id_created_at",
        table_name="orch_plans",
    )
    op.drop_index("ix_orch_plans_tenant_id", table_name="orch_plans")
    op.drop_table("orch_plans")
