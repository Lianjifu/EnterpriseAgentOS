"""agent_runtime: add agent_turns.started_at column.

The P1 migration (0002) shipped with `created_at` only, but the domain
`Turn` entity distinguishes "when this turn began" (`started_at`) from
"when the row was inserted" (`created_at`). Both are populated at insert
time today but the semantic split lets future schema revisions add an
index on `started_at` without a backfill.

Revision ID: 0003_agent_turn_started_at
Revises: 0002_agent_runtime
Create Date: 2026-09-21
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Union

import sqlalchemy as sa
from alembic import op

if TYPE_CHECKING:
    from collections.abc import Sequence

revision: str = "0003_agent_turn_started_at"
down_revision: str | None = "0002_agent_runtime"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "agent_turns",
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    # Existing rows already have a non-null `created_at`; backfill `started_at`
    # from it so the new NOT NULL column is satisfied without a full rewrite.
    op.execute("UPDATE agent_turns SET started_at = created_at WHERE started_at IS NULL")


def downgrade() -> None:
    op.drop_column("agent_turns", "started_at")
