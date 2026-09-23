"""governance module: policies + approvals + decision_events + audit_log.

Revision ID: 0007_governance
Revises: 0006_memory
Create Date: 2026-09-22

Four tables:

- ``policies`` — JSON rule DSL (subject_type + action_pattern + effect).
  Index hits ``(tenant_id, subject_type, action_pattern) WHERE enabled``
  for fast lookup.
- ``approvals`` — pending/approved/denied/expired requests; carry
  ``correlation_id`` for trace correlation, ``expires_at`` for TTL.
- ``decision_events`` — append-only log of every policy decision
  (deny/approval/allow) with ``latency_ms`` for hot-path observability.
- ``audit_log`` — append-only log of every business event (tool, skill,
  memory, agent); populated by an EventBus subscriber in the
  composition root.

JSONB ``quota`` column on policies enables per-rule quota counters
without a separate table — the ``PolicyEvaluator`` reads the JSON
and writes to ``quota_counters`` (P6/P10).

Soft-delete only; nothing here cascades.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "0007_governance"
down_revision: str | None = "0006_memory"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "policies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("subject_type", sa.String(16), nullable=False),
        sa.Column("subject_ref", sa.String(256), nullable=False),
        sa.Column("action_pattern", sa.String(256), nullable=False),
        sa.Column("effect", sa.String(16), nullable=False),
        sa.Column(
            "priority",
            sa.Integer,
            nullable=False,
            server_default=sa.text("100"),
        ),
        sa.Column(
            "approval_required",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("quota", postgresql.JSONB, nullable=True),
        sa.Column(
            "enabled",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "version_lock",
            sa.Integer,
            nullable=False,
            server_default=sa.text("1"),
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
            "effect IN ('allow','deny','approval')",
            name="ck_policies_effect",
        ),
        sa.CheckConstraint(
            "subject_type IN ('role','user','agent')",
            name="ck_policies_subject",
        ),
    )
    op.create_index("ix_policies_tenant_id", "policies", ["tenant_id"])
    # Partial index — only enabled rules are candidates for evaluation.
    op.execute(
        "CREATE INDEX ix_policies_enabled_lookup "
        "ON policies (tenant_id, subject_type, action_pattern) "
        "WHERE enabled"
    )

    op.create_table(
        "approvals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requester_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("resource", postgresql.JSONB, nullable=False),
        sa.Column("action", sa.String(256), nullable=False),
        sa.Column(
            "payload",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "status",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("approver_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("correlation_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "status IN ('pending','approved','denied','expired')",
            name="ck_approvals_status",
        ),
    )
    op.create_index("ix_approvals_tenant_id", "approvals", ["tenant_id"])
    op.create_index(
        "ix_approvals_tenant_id_status_created_at",
        "approvals",
        ["tenant_id", "status", "created_at"],
    )
    op.create_index("ix_approvals_correlation_id", "approvals", ["correlation_id"])

    op.create_table(
        "decision_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("action", sa.String(256), nullable=False),
        sa.Column("resource", postgresql.JSONB, nullable=True),
        sa.Column("effect", sa.String(16), nullable=False),
        sa.Column("rule_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("approval_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "latency_ms",
            sa.Integer,
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "effect IN ('allow','deny','approval')",
            name="ck_decision_events_effect",
        ),
    )
    op.execute(
        "CREATE INDEX ix_decision_events_tenant_id_created_at "
        "ON decision_events (tenant_id, created_at DESC)"
    )

    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("payload", postgresql.JSONB, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.execute(
        "CREATE INDEX ix_audit_log_tenant_id_created_at ON audit_log (tenant_id, created_at DESC)"
    )


def downgrade() -> None:
    op.drop_index("ix_audit_log_tenant_id_created_at", table_name="audit_log")
    op.drop_table("audit_log")

    op.drop_index("ix_decision_events_tenant_id_created_at", table_name="decision_events")
    op.drop_table("decision_events")

    op.drop_index("ix_approvals_correlation_id", table_name="approvals")
    op.drop_index("ix_approvals_tenant_id_status_created_at", table_name="approvals")
    op.drop_index("ix_approvals_tenant_id", table_name="approvals")
    op.drop_table("approvals")

    op.execute("DROP INDEX IF EXISTS ix_policies_enabled_lookup")
    op.drop_index("ix_policies_tenant_id", table_name="policies")
    op.drop_table("policies")
