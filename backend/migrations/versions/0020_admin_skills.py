"""Replace sandbox skill_packages with the admin catalog tables.

Revision ID: 0020_admin_skills
Revises: 0019_plan_signing
Create Date: 2026-10-03
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0020_admin_skills"
down_revision: str | Sequence[str] | None = "0019_plan_signing"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "admin_skills",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("description", sa.Text, nullable=False, server_default=sa.text("''")),
        sa.Column("type", sa.String(16), nullable=False, server_default=sa.text("'Skill'")),
        sa.Column("owner", sa.String(128), nullable=False, server_default=sa.text("''")),
        sa.Column("status", sa.String(16), nullable=False, server_default=sa.text("'draft'")),
        sa.Column("version", sa.String(32), nullable=False, server_default=sa.text("'draft'")),
        sa.Column("calls", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("success_rate", sa.Float, nullable=False, server_default=sa.text("0")),
        sa.Column("error_rate", sa.Float, nullable=False, server_default=sa.text("0")),
        sa.Column("avg_latency_ms", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("rating", sa.Float, nullable=False, server_default=sa.text("0")),
        sa.Column("risk", sa.String(16), nullable=False, server_default=sa.text("'low'")),
        sa.Column("need_confirm", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column(
            "visible_scope",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'[\"部门\"]'::jsonb"),
        ),
        sa.Column("tags", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("starred", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column(
            "input_schema",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "output_schema",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "versions",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("trend", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column(
            "used_by_agents",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "audit_log",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
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
        sa.UniqueConstraint(
            "tenant_id",
            "workspace_id",
            "name",
            name="uq_admin_skills_tenant_ws_name",
        ),
    )
    op.create_index("ix_admin_skills_tenant_id", "admin_skills", ["tenant_id"])
    op.create_index("ix_admin_skills_workspace_id", "admin_skills", ["workspace_id"])
    op.create_index(
        "ix_admin_skills_tenant_workspace_status",
        "admin_skills",
        ["tenant_id", "workspace_id", "status"],
    )

    op.create_table(
        "admin_skill_user_state",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("skill_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("favorited", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("last_used", sa.String(64), nullable=False, server_default=sa.text("''")),
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
            "user_id",
            "skill_id",
            name="uq_admin_skill_user_state",
        ),
    )
    op.create_index("ix_admin_skill_user_state_tenant_id", "admin_skill_user_state", ["tenant_id"])
    op.create_index(
        "ix_admin_skill_user_state_workspace_id",
        "admin_skill_user_state",
        ["workspace_id"],
    )
    op.create_index("ix_admin_skill_user_state_user_id", "admin_skill_user_state", ["user_id"])
    op.create_index("ix_admin_skill_user_state_skill_id", "admin_skill_user_state", ["skill_id"])
    op.create_index(
        "ix_admin_skill_user_state_user_skill",
        "admin_skill_user_state",
        ["tenant_id", "user_id", "skill_id"],
    )

    op.drop_index("ix_skill_invocations_package_id_status", table_name="skill_invocations")
    op.drop_index(
        "ix_skill_invocations_tenant_id_workspace_id_status",
        table_name="skill_invocations",
    )
    op.drop_index("ix_skill_invocations_package_id", table_name="skill_invocations")
    op.drop_index("ix_skill_invocations_install_id", table_name="skill_invocations")
    op.drop_index("ix_skill_invocations_workspace_id", table_name="skill_invocations")
    op.drop_index("ix_skill_invocations_tenant_id", table_name="skill_invocations")
    op.drop_table("skill_invocations")

    op.drop_index(
        "ix_skill_installs_tenant_id_workspace_id_status",
        table_name="skill_installs",
    )
    op.drop_index("ix_skill_installs_package_id", table_name="skill_installs")
    op.drop_index("ix_skill_installs_workspace_id", table_name="skill_installs")
    op.drop_index("ix_skill_installs_tenant_id", table_name="skill_installs")
    op.drop_table("skill_installs")

    op.drop_index(
        "ix_skill_packages_tenant_id_workspace_id_enabled",
        table_name="skill_packages",
    )
    op.drop_index("ix_skill_packages_workspace_id", table_name="skill_packages")
    op.drop_index("ix_skill_packages_tenant_id", table_name="skill_packages")
    op.drop_table("skill_packages")


def downgrade() -> None:
    raise NotImplementedError("0020_admin_skills does not support downgrade")
