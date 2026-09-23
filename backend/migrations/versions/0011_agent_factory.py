"""agent_factory module — 0011 migration.

Adds three tables:

- ``agent_templates``  — named tenant-scoped templates; mutable status
                         (active ↔ archived); default prompt + model
                         inherited by new versions.
- ``agent_versions``   — typed-columns snapshot of an agent's runtime
                         config.  IMMUTABLE once ``status != 'draft'``.
- ``releases``         — record of a successful gate-passed release.

Indexes / constraints:

- UQ (tenant_id, name) on ``agent_templates`` — name uniqueness per tenant
- UQ (tenant_id, template_id, version_tag) on ``agent_versions`` — same
  template cannot have two versions with the same tag
- CK on status enums (templates, versions, releases)
- CK on ``max_total_steps BETWEEN 1 AND 256`` (versions)
- ix (tenant_id, workspace_id, status) on ``agent_templates``
- ix (tenant_id, workspace_id, template_id, status) on ``agent_versions``
- ix (tenant_id, workspace_id, template_id, released_at) on ``releases``

Tenant scoping is via the application layer (``tenant_id`` column on
every table).  Cascade rules:

- agent_versions → agent_templates (ON DELETE RESTRICT) — historical
  versions must outlive template deletion; archival must be explicit.
- releases → agent_templates, agent_versions (ON DELETE RESTRICT) —
  release rows are an audit artefact and never cascade.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0011_agent_factory"
down_revision: str | Sequence[str] | None = "0010_orchestration"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── agent_templates ────────────────────────────────────────────────────
    op.create_table(
        "agent_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column(
            "description",
            sa.Text,
            nullable=False,
            server_default=sa.text("''"),
        ),
        sa.Column("default_model_id", sa.String(128), nullable=False),
        sa.Column("default_system_prompt", sa.Text, nullable=False),
        sa.Column(
            "status",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'active'"),
        ),
        sa.Column(
            "metadata",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
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
            "status IN ('active','archived')",
            name="ck_agent_templates_status_enum",
        ),
    )
    op.create_index(
        "ix_agent_templates_tenant_id",
        "agent_templates",
        ["tenant_id"],
    )
    op.create_index(
        "ix_agent_templates_tenant_id_workspace_id_status",
        "agent_templates",
        ["tenant_id", "workspace_id", "status"],
    )
    op.create_unique_constraint(
        "uq_agent_templates_tenant_id_name",
        "agent_templates",
        ["tenant_id", "name"],
    )

    # ── agent_versions ─────────────────────────────────────────────────────
    op.create_table(
        "agent_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "template_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("agent_templates.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("version_tag", sa.String(64), nullable=False),
        sa.Column(
            "status",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'draft'"),
        ),
        sa.Column("system_prompt", sa.Text, nullable=False),
        sa.Column("model_id", sa.String(128), nullable=False),
        sa.Column(
            "allowed_tools",
            postgresql.ARRAY(sa.String(128)),
            nullable=False,
            server_default=sa.text("'{}'::text[]"),
        ),
        sa.Column(
            "allowed_skills",
            postgresql.ARRAY(sa.String(128)),
            nullable=False,
            server_default=sa.text("'{}'::text[]"),
        ),
        sa.Column(
            "knowledge_package_ids",
            postgresql.ARRAY(sa.String(128)),
            nullable=False,
            server_default=sa.text("'{}'::text[]"),
        ),
        sa.Column("plan_dsl_snapshot", postgresql.JSONB, nullable=True),
        sa.Column("max_total_steps", sa.Integer, nullable=True),
        sa.Column(
            "release_notes",
            sa.Text,
            nullable=False,
            server_default=sa.text("''"),
        ),
        sa.Column(
            "published_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "released_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "metadata",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
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
            "status IN ('draft','published','released','retired')",
            name="ck_agent_versions_status_enum",
        ),
        sa.CheckConstraint(
            "max_total_steps IS NULL OR (max_total_steps BETWEEN 1 AND 256)",
            name="ck_agent_versions_max_total_steps_range",
        ),
    )
    op.create_index(
        "ix_agent_versions_tenant_id",
        "agent_versions",
        ["tenant_id"],
    )
    op.create_index(
        "ix_agent_versions_tenant_id_workspace_id_template_id_status",
        "agent_versions",
        ["tenant_id", "workspace_id", "template_id", "status"],
    )
    op.create_unique_constraint(
        "uq_agent_versions_tenant_id_template_id_version_tag",
        "agent_versions",
        ["tenant_id", "template_id", "version_tag"],
    )

    # ── releases ───────────────────────────────────────────────────────────
    op.create_table(
        "releases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "template_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("agent_templates.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "version_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("agent_versions.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("eval_run_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("eval_score", sa.Numeric(4, 3), nullable=True),
        sa.Column(
            "status",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'released'"),
        ),
        sa.Column("released_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "released_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "notes",
            sa.Text,
            nullable=False,
            server_default=sa.text("''"),
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
        sa.CheckConstraint(
            "status IN ('released')",
            name="ck_releases_status_enum",
        ),
    )
    op.create_index(
        "ix_releases_tenant_id",
        "releases",
        ["tenant_id"],
    )
    op.create_index(
        "ix_releases_tenant_id_workspace_id_template_id_released_at",
        "releases",
        ["tenant_id", "workspace_id", "template_id", "released_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_releases_tenant_id_workspace_id_template_id_released_at",
        table_name="releases",
    )
    op.drop_index("ix_releases_tenant_id", table_name="releases")
    op.drop_table("releases")

    op.drop_constraint(
        "uq_agent_versions_tenant_id_template_id_version_tag",
        "agent_versions",
        type_="unique",
    )
    op.drop_index(
        "ix_agent_versions_tenant_id_workspace_id_template_id_status",
        table_name="agent_versions",
    )
    op.drop_index("ix_agent_versions_tenant_id", table_name="agent_versions")
    op.drop_table("agent_versions")

    op.drop_constraint(
        "uq_agent_templates_tenant_id_name",
        "agent_templates",
        type_="unique",
    )
    op.drop_index(
        "ix_agent_templates_tenant_id_workspace_id_status",
        table_name="agent_templates",
    )
    op.drop_index("ix_agent_templates_tenant_id", table_name="agent_templates")
    op.drop_table("agent_templates")
