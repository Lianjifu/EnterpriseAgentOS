"""tool module: tools + tool_calls tables.

Revision ID: 0004_tool
Revises: 0003_agent_turn_started_at
Create Date: 2026-09-21
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

if TYPE_CHECKING:
    from collections.abc import Sequence

revision: str = "0004_tool"
down_revision: str | None = "0003_agent_turn_started_at"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # tools
    op.create_table(
        "tools",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("description", sa.Text, nullable=False, server_default=""),
        sa.Column("protocol", sa.String(16), nullable=False),
        sa.Column(
            "spec",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "spec_operations",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("auth_config", postgresql.JSONB, nullable=True),
        sa.Column("rate_limit_per_minute", sa.Integer, nullable=True),
        sa.Column("enabled", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("version", sa.Integer, nullable=False, server_default=sa.text("1")),
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
        sa.UniqueConstraint("tenant_id", "name", name="uq_tools_tenant_id_name"),
        sa.CheckConstraint("protocol IN ('custom','openapi','mcp')", name="ck_tools_protocol_enum"),
    )
    op.create_index("ix_tools_tenant_id", "tools", ["tenant_id"])
    op.create_index("ix_tools_workspace_id", "tools", ["workspace_id"])
    op.create_index("ix_tools_tenant_id_enabled", "tools", ["tenant_id", "enabled"])
    op.create_index("ix_tools_tenant_id_protocol", "tools", ["tenant_id", "protocol"])

    # tool_calls
    op.create_table(
        "tool_calls",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tool_name", sa.String(128), nullable=False),
        sa.Column(
            "arguments",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("result", postgresql.JSONB, nullable=True),
        sa.Column("error_code", sa.String(64), nullable=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="running"),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("latency_ms", sa.Integer, nullable=True),
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
            "status IN ('running','succeeded','failed')",
            name="ck_tool_calls_status_enum",
        ),
    )
    op.create_index("ix_tool_calls_tenant_id", "tool_calls", ["tenant_id"])
    op.create_index("ix_tool_calls_tool_name", "tool_calls", ["tool_name"])
    op.create_index(
        "ix_tool_calls_tenant_id_tool_name_status",
        "tool_calls",
        ["tenant_id", "tool_name", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_tool_calls_tenant_id_tool_name_status", table_name="tool_calls")
    op.drop_index("ix_tool_calls_tool_name", table_name="tool_calls")
    op.drop_index("ix_tool_calls_tenant_id", table_name="tool_calls")
    op.drop_table("tool_calls")

    op.drop_index("ix_tools_tenant_id_protocol", table_name="tools")
    op.drop_index("ix_tools_tenant_id_enabled", table_name="tools")
    op.drop_index("ix_tools_workspace_id", table_name="tools")
    op.drop_index("ix_tools_tenant_id", table_name="tools")
    op.drop_table("tools")
