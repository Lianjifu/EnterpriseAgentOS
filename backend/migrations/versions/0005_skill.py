"""skill module: skill_packages + skill_installs + skill_invocations tables.

Revision ID: 0005_skill
Revises: 0004_tool
Create Date: 2026-09-22
"""

from __future__ import annotations

from typing import TYPE_CHECKING
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "0005_skill"
down_revision: str | None = "0004_tool"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # skill_packages
    op.create_table(
        "skill_packages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("version", sa.String(32), nullable=False),
        sa.Column("description", sa.Text, nullable=False, server_default=""),
        sa.Column("entrypoint", sa.String(256), nullable=False),
        sa.Column("image", sa.String(256), nullable=False),
        sa.Column(
            "parameters_schema",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("artifact_uri", sa.Text, nullable=False, server_default=""),
        sa.Column(
            "network_policy",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'default'"),
        ),
        sa.Column("cpu_quota", sa.Float, nullable=True),
        sa.Column("memory_bytes", sa.BigInteger, nullable=True),
        sa.Column(
            "timeout_seconds",
            sa.Integer,
            nullable=False,
            server_default=sa.text("30"),
        ),
        sa.Column("enabled", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("version_lock", sa.Integer, nullable=False, server_default=sa.text("1")),
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
            "version",
            name="uq_skill_packages_tenant_ws_name_version",
        ),
        sa.CheckConstraint(
            "network_policy IN ('none','default','unrestricted')",
            name="ck_skill_packages_network_policy_enum",
        ),
        sa.CheckConstraint(
            "timeout_seconds BETWEEN 1 AND 30",
            name="ck_skill_packages_timeout_range",
        ),
    )
    op.create_index("ix_skill_packages_tenant_id", "skill_packages", ["tenant_id"])
    op.create_index("ix_skill_packages_workspace_id", "skill_packages", ["workspace_id"])
    op.create_index(
        "ix_skill_packages_tenant_id_workspace_id_enabled",
        "skill_packages",
        ["tenant_id", "workspace_id", "enabled"],
    )

    # skill_installs
    op.create_table(
        "skill_installs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("package_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "package_version_lock",
            sa.Integer,
            nullable=False,
            server_default=sa.text("1"),
        ),
        sa.Column("installed_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "status",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column(
            "installed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("run_token_jti", sa.String(128), nullable=True),
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
            "package_id",
            "package_version_lock",
            name="uq_skill_installs_tenant_ws_pkg_lock",
        ),
        sa.CheckConstraint(
            "status IN ('pending','installed','failed')",
            name="ck_skill_installs_status_enum",
        ),
    )
    op.create_index("ix_skill_installs_tenant_id", "skill_installs", ["tenant_id"])
    op.create_index("ix_skill_installs_workspace_id", "skill_installs", ["workspace_id"])
    op.create_index("ix_skill_installs_package_id", "skill_installs", ["package_id"])
    op.create_index(
        "ix_skill_installs_tenant_id_workspace_id_status",
        "skill_installs",
        ["tenant_id", "workspace_id", "status"],
    )

    # skill_invocations
    op.create_table(
        "skill_invocations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("install_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("package_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "arguments",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "status",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'queued'"),
        ),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("latency_ms", sa.Integer, nullable=True),
        sa.Column("result", postgresql.JSONB, nullable=True),
        sa.Column("error_code", sa.String(64), nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("stdout_tail", sa.Text, nullable=False, server_default=""),
        sa.Column("stderr_tail", sa.Text, nullable=False, server_default=""),
        sa.Column("artifact_uri", sa.Text, nullable=True),
        sa.Column("sandbox_run_id", postgresql.UUID(as_uuid=True), nullable=True),
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
            "status IN ('queued','starting','running','succeeded',"
            "'failed','cancelled','timed_out')",
            name="ck_skill_invocations_status_enum",
        ),
    )
    op.create_index("ix_skill_invocations_tenant_id", "skill_invocations", ["tenant_id"])
    op.create_index(
        "ix_skill_invocations_workspace_id",
        "skill_invocations",
        ["workspace_id"],
    )
    op.create_index("ix_skill_invocations_install_id", "skill_invocations", ["install_id"])
    op.create_index("ix_skill_invocations_package_id", "skill_invocations", ["package_id"])
    op.create_index(
        "ix_skill_invocations_tenant_id_workspace_id_status",
        "skill_invocations",
        ["tenant_id", "workspace_id", "status"],
    )
    op.create_index(
        "ix_skill_invocations_package_id_status",
        "skill_invocations",
        ["package_id", "status"],
    )


def downgrade() -> None:
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
    op.drop_index("ix_skill_packages_tenant_id", "skill_packages")
    op.drop_table("skill_packages")
