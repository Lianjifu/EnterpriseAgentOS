"""orch_plans: add signing triple columns (signature, signer_key_id,
image_digest).

Mirrors 0016_skill_signing and 0018_knowledge_signing for plans.
Tier B closes the same wire-up hole that A6 closed for skills.

The columns are NOT NULL with DEFAULT '' so:
* Existing rows satisfy the constraint unchanged.
* The domain triple invariant (any/all of the three) is enforced by
  ``Plan.create()``, not by the DB.

Revision ID: 0019_plan_signing
Revises: 0018_knowledge_signing
Create Date: 2026-09-23
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Sequence

import sqlalchemy as sa
from alembic import op

if TYPE_CHECKING:
    from collections.abc import Sequence as _Seq  # noqa: F401

revision: str = "0019_plan_signing"
down_revision: str | None = "0018_knowledge_signing"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "orch_plans",
        sa.Column(
            "signature",
            sa.Text,
            nullable=False,
            server_default=sa.text("''"),
        ),
    )
    op.add_column(
        "orch_plans",
        sa.Column(
            "signer_key_id",
            sa.String(64),
            nullable=False,
            server_default=sa.text("''"),
        ),
    )
    op.add_column(
        "orch_plans",
        sa.Column(
            "image_digest",
            sa.String(128),
            nullable=False,
            server_default=sa.text("''"),
        ),
    )


def downgrade() -> None:
    op.drop_column("orch_plans", "image_digest")
    op.drop_column("orch_plans", "signer_key_id")
    op.drop_column("orch_plans", "signature")