"""skill_packages: add signing triple columns (signature, signer_key_id,
image_digest).

Closes the A2 wire-up gap: ``SkillPackage`` has carried the triple as
in-memory fields since `4fd0491` but the persistence layer never had
matching columns, so the trust gate was effectively a no-op. The
columns are NOT NULL with DEFAULT '' so:

* Existing rows satisfy the constraint unchanged.
* The domain triple invariant (any/all of the three) is enforced by
  ``SkillPackage.create()`` / ``.update()``, not by the DB.

Revision ID: 0016_skill_signing
Revises: 0015_self_evolution
Create Date: 2026-09-23
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Union

import sqlalchemy as sa
from alembic import op

if TYPE_CHECKING:
    from collections.abc import Sequence

revision: str = "0016_skill_signing"
down_revision: str | None = "0015_self_evolution"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "skill_packages",
        sa.Column(
            "signature",
            sa.Text,
            nullable=False,
            server_default=sa.text("''"),
        ),
    )
    op.add_column(
        "skill_packages",
        sa.Column(
            "signer_key_id",
            sa.String(64),
            nullable=False,
            server_default=sa.text("''"),
        ),
    )
    op.add_column(
        "skill_packages",
        sa.Column(
            "image_digest",
            sa.String(128),
            nullable=False,
            server_default=sa.text("''"),
        ),
    )


def downgrade() -> None:
    op.drop_column("skill_packages", "image_digest")
    op.drop_column("skill_packages", "signer_key_id")
    op.drop_column("skill_packages", "signature")