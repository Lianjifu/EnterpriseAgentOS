"""burn-in F1 fix — rename orch plans table to avoid collision.

P10 burn-in finding F1 (2026-09-23): both ``0010_orchestration.py`` and
``0014_platform.py`` define a table named ``plans`` with different
schemas, so applying migrations 0010→0014 in sequence raises
``Table 'plans' is already defined`` on the orch→platform boundary.

Resolution: 0010 now creates ``orch_plans`` (orchestration Plan DSL).
This migration handles environments that already ran the old 0010
and thus have a ``plans`` table with the orch schema (entry_dsl,
max_total_steps, tenant_id+name UQ).

Logic:
* if ``orch_plans`` exists  → no-op (fresh install path).
* elif ``plans`` has orch-schema columns (entry_dsl present, code
  absent) → rename ``plans`` → ``orch_plans`` + rename its indexes
  and unique constraint.
* else → no-op (the ``plans`` table is the platform/billing one from
  0014; nothing to do).
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0017_rename_orch_plans"
down_revision: str | Sequence[str] | None = "0016_skill_signing"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    if "orch_plans" in tables:
        return

    if "plans" not in tables:
        # Fresh env — 0010 already creates orch_plans via the renamed
        # migration; nothing to migrate.
        return

    cols = {c["name"] for c in inspector.get_columns("plans")}
    if "entry_dsl" not in cols or "code" in cols:
        # Not the orch plans table; this is the platform/billing one.
        return

    op.rename_table("plans", "orch_plans")
    # Rename the indexes / constraint to keep the naming aligned with
    # the new table (matches 0010_orchestration.py).
    op.execute("ALTER INDEX IF EXISTS ix_plans_tenant_id RENAME TO ix_orch_plans_tenant_id")
    op.execute(
        "ALTER INDEX IF EXISTS ix_plans_tenant_id_workspace_id_created_at "
        "RENAME TO ix_orch_plans_tenant_id_workspace_id_created_at"
    )
    op.execute(
        "ALTER TABLE orch_plans "
        "RENAME CONSTRAINT uq_plans_tenant_id_name "
        "TO uq_orch_plans_tenant_id_name"
    )
    op.execute(
        "ALTER TABLE orch_plans "
        "RENAME CONSTRAINT ck_plans_max_total_steps_range "
        "TO ck_orch_plans_max_total_steps_range"
    )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    if "orch_plans" not in tables:
        return

    cols = {c["name"] for c in inspector.get_columns("orch_plans")}
    if "entry_dsl" not in cols or "code" in cols:
        return

    op.execute("ALTER INDEX IF EXISTS ix_orch_plans_tenant_id RENAME TO ix_plans_tenant_id")
    op.execute(
        "ALTER INDEX IF EXISTS ix_orch_plans_tenant_id_workspace_id_created_at "
        "RENAME TO ix_plans_tenant_id_workspace_id_created_at"
    )
    op.execute(
        "ALTER TABLE orch_plans "
        "RENAME CONSTRAINT uq_orch_plans_tenant_id_name "
        "TO uq_plans_tenant_id_name"
    )
    op.execute(
        "ALTER TABLE orch_plans "
        "RENAME CONSTRAINT ck_orch_plans_max_total_steps_range "
        "TO ck_plans_max_total_steps_range"
    )
    op.rename_table("orch_plans", "plans")
