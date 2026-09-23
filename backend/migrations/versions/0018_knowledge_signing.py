"""knowledge_packages: add signing triple columns (signature,
signer_key_id, image_digest).

Mirrors 0016_skill_signing for the knowledge module.  Tier B closes
the same wire-up hole that A6 closed for skills: the entity already
carries the triple in-memory but persistence lacked matching columns,
so the trust gate was effectively a no-op.

The columns are NOT NULL with DEFAULT '' so:
* Existing rows satisfy the constraint unchanged.
* The domain triple invariant (any/all of the three) is enforced by
  ``KnowledgePackage.create()``, not by the DB.

Revision ID: 0018_knowledge_signing
Revises: 0017_rename_orch_plans
Create Date: 2026-09-23
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Sequence

import sqlalchemy as sa
from alembic import op

if TYPE_CHECKING:
    from collections.abc import Sequence as _Seq  # noqa: F401

revision: str = "0018_knowledge_signing"
down_revision: str | None = "0017_rename_orch_plans"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "knowledge_packages",
        sa.Column(
            "signature",
            sa.Text,
            nullable=False,
            server_default=sa.text("''"),
        ),
    )
    op.add_column(
        "knowledge_packages",
        sa.Column(
            "signer_key_id",
            sa.String(64),
            nullable=False,
            server_default=sa.text("''"),
        ),
    )
    op.add_column(
        "knowledge_packages",
        sa.Column(
            "image_digest",
            sa.String(128),
            nullable=False,
            server_default=sa.text("''"),
        ),
    )


def downgrade() -> None:
    op.drop_column("knowledge_packages", "image_digest")
    op.drop_column("knowledge_packages", "signer_key_id")
    op.drop_column("knowledge_packages", "signature")