"""agent_runtime: agent_sessions + agent_turns tables

Revision ID: 0002_agent_runtime
Revises: 0001_init
Create Date: 2026-09-21
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

if TYPE_CHECKING:
    from collections.abc import Sequence

revision: str = "0002_agent_runtime"
down_revision: str | None = "0001_init"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # agent_sessions
    op.create_table(
        "agent_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("agent_version", sa.String(64), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.CheckConstraint("status IN ('open','closed')", name="ck_agent_sessions_status_enum"),
    )
    op.create_index("ix_agent_sessions_tenant_id", "agent_sessions", ["tenant_id"])
    op.create_index(
        "ix_agent_sessions_tenant_id_owner_id_status",
        "agent_sessions",
        ["tenant_id", "owner_id", "status"],
    )
    op.create_index(
        "ix_agent_sessions_tenant_id_agent_id",
        "agent_sessions",
        ["tenant_id", "agent_id"],
    )
    op.create_index("ix_agent_sessions_workspace_id", "agent_sessions", ["workspace_id"])
    op.create_index("ix_agent_sessions_owner_id", "agent_sessions", ["owner_id"])

    # agent_turns
    op.create_table(
        "agent_turns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("user_input", sa.Text, nullable=False),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("status", sa.String(16), nullable=False, server_default="running"),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("final_response", sa.Text, nullable=True),
        sa.Column("error_code", sa.String(64), nullable=True),
        sa.Column("input_tokens", sa.Integer, nullable=True),
        sa.Column("output_tokens", sa.Integer, nullable=True),
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
        sa.ForeignKeyConstraint(["session_id"], ["agent_sessions.id"], ondelete="CASCADE"),
        sa.CheckConstraint(
            "status IN ('running','succeeded','failed','denied')",
            name="ck_agent_turns_status_enum",
        ),
    )
    op.create_index("ix_agent_turns_tenant_id", "agent_turns", ["tenant_id"])
    op.create_index(
        "ix_agent_turns_tenant_id_session_id_status",
        "agent_turns",
        ["tenant_id", "session_id", "status"],
    )
    op.create_index(
        "ix_agent_turns_tenant_id_session_id_created_at",
        "agent_turns",
        ["tenant_id", "session_id", "created_at"],
    )
    op.create_index(
        "ix_agent_turns_tenant_id_workspace_id",
        "agent_turns",
        ["tenant_id", "workspace_id"],
    )
    op.create_index("ix_agent_turns_session_id", "agent_turns", ["session_id"])


def downgrade() -> None:
    op.drop_index("ix_agent_turns_session_id", table_name="agent_turns")
    op.drop_index("ix_agent_turns_tenant_id_workspace_id", table_name="agent_turns")
    op.drop_index("ix_agent_turns_tenant_id_session_id_created_at", table_name="agent_turns")
    op.drop_index("ix_agent_turns_tenant_id_session_id_status", table_name="agent_turns")
    op.drop_index("ix_agent_turns_tenant_id", table_name="agent_turns")
    op.drop_table("agent_turns")

    op.drop_index("ix_agent_sessions_owner_id", table_name="agent_sessions")
    op.drop_index("ix_agent_sessions_workspace_id", table_name="agent_sessions")
    op.drop_index("ix_agent_sessions_tenant_id_agent_id", table_name="agent_sessions")
    op.drop_index("ix_agent_sessions_tenant_id_owner_id_status", table_name="agent_sessions")
    op.drop_index("ix_agent_sessions_tenant_id", table_name="agent_sessions")
    op.drop_table("agent_sessions")
