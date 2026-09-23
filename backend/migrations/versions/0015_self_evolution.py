"""self_evolution module — 0015 migration.

Adds one table:

- ``evolve_candidates`` — every self-evolution candidate (memory_promote /
  skill_patch / routing_hint / dream). Admin-signed approve/reject,
  apply-guarded. UQ ``(tenant_id, fingerprint)`` dedupes identical
  payloads. CK on ``status`` (4 values) and ``kind`` (4 values).

Indexes / constraints:

- UQ ``tenant_id, fingerprint`` on ``evolve_candidates``
- CK status enum on ``evolve_candidates``
- CK kind enum on ``evolve_candidates``
- ix ``tenant_id, status`` on ``evolve_candidates``
- ix ``tenant_id, created_at`` on ``evolve_candidates``
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0015_self_evolution"
down_revision: str | Sequence[str] | None = "0014_platform"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "evolve_candidates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column(
            "payload",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "confidence", sa.Float, nullable=False, server_default=sa.text("0")
        ),
        sa.Column(
            "trigger_reason",
            sa.String(256),
            nullable=False,
            server_default=sa.text("''"),
        ),
        sa.Column("fingerprint", sa.String(64), nullable=False),
        sa.Column(
            "status",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("requester_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("approver_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "correlation_id", postgresql.UUID(as_uuid=True), nullable=True
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
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
        sa.UniqueConstraint(
            "tenant_id",
            "fingerprint",
            name="uq_evolve_candidates_fingerprint",
        ),
        sa.CheckConstraint(
            "status IN ('pending','approved','rejected','applied')",
            name="ck_evolve_candidates_status",
        ),
        sa.CheckConstraint(
            "kind IN ('memory_promote','skill_patch','routing_hint','dream')",
            name="ck_evolve_candidates_kind",
        ),
    )
    op.create_index(
        "ix_evolve_candidates_tenant_status",
        "evolve_candidates",
        ["tenant_id", "status"],
    )
    op.create_index(
        "ix_evolve_candidates_tenant_created",
        "evolve_candidates",
        ["tenant_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_evolve_candidates_tenant_created", table_name="evolve_candidates"
    )
    op.drop_index(
        "ix_evolve_candidates_tenant_status", table_name="evolve_candidates"
    )
    op.drop_table("evolve_candidates")


__all__ = ["downgrade", "upgrade"]
