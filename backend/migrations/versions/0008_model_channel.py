"""P6 model + channel: 7 tables.

Revision ID: 0008_model_channel
Revises: 0007_governance

Seven tables (4 model + 3 channel):

Model tables
------------
- ``models`` — per-tenant registry of model aliases + provider + upstream.
  Unique on (tenant_id, name); index on (tenant_id, enabled).
- ``model_credentials`` — AES-GCM encrypted provider secrets.
  ``encrypted_payload`` is ``nonce(12) || ct || tag(16)``.
  ``key_version`` enables master-key rotation without breaking reads.
- ``routing_policies`` — strategy + primary + failover chain + JSON rules.
- ``quota_counters`` — (tenant_id, model_id, window_start) → tokens/req
  with minute-bucket windows for atomic UPDATE...RETURNING increments.

Channel tables
--------------
- ``channels`` — channel row per tenant; unique (tenant_id, type, external_id).
  ``webhook_secret_id`` references ``channel_secrets``.
- ``channel_secrets`` — AES-GCM encrypted webhook secrets + outbound creds.
- ``channel_deliveries`` — append-only inbound/outbound delivery log;
  ``payload_summary`` is truncated to ≤ 4 KB.

All tables are tenant-scoped (tenant_id indexed). No cascades.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "0008_model_channel"
down_revision: str | None = "0007_governance"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── Model: models ────────────────────────────────────────────────────
    op.create_table(
        "models",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("provider", sa.String(16), nullable=False),
        sa.Column("upstream_model", sa.String(256), nullable=False),
        sa.Column("enabled", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("credential_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "routing_policy_id", postgresql.UUID(as_uuid=True), nullable=True
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("tenant_id", "name", name="uq_models_tenant_name"),
        sa.CheckConstraint(
            "provider IN ('openai','anthropic','deepseek','custom','mock')",
            name="ck_model_provider",
        ),
    )
    op.execute("CREATE INDEX ix_models_tenant_enabled ON models (tenant_id, enabled)")
    op.execute(
        "CREATE INDEX ix_models_credential ON models (credential_id) "
        "WHERE credential_id IS NOT NULL"
    )

    # ── Model: model_credentials ─────────────────────────────────────────
    op.create_table(
        "model_credentials",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(16), nullable=False),
        sa.Column("label", sa.String(256), nullable=False),
        sa.Column(
            "encrypted_payload", sa.LargeBinary, nullable=False
        ),  # nonce(12) || ct || tag(16)
        sa.Column(
            "key_version", sa.Integer, nullable=False, server_default="1"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("rotated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "provider IN ('openai','anthropic','deepseek','custom','mock')",
            name="ck_credential_provider",
        ),
    )
    op.execute(
        "CREATE INDEX ix_model_credentials_tenant ON model_credentials (tenant_id)"
    )

    # ── Model: routing_policies ──────────────────────────────────────────
    op.create_table(
        "routing_policies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("strategy", sa.String(32), nullable=False),
        sa.Column("primary_model_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "failover_model_ids",
            postgresql.ARRAY(postgresql.UUID(as_uuid=True)),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "selection_rules",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "version_lock", sa.Integer, nullable=False, server_default="1"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "strategy IN "
            "('priority','round_robin','cost_optim','latency_optim','tenant_default')",
            name="ck_routing_strategy",
        ),
    )
    op.execute(
        "CREATE INDEX ix_routing_policies_tenant ON routing_policies (tenant_id)"
    )

    # ── Model: quota_counters ───────────────────────────────────────────
    op.create_table(
        "quota_counters",
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("model_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "window_start", sa.DateTime(timezone=True), nullable=False
        ),  # 1-minute buckets
        sa.Column(
            "input_tokens", sa.Integer, nullable=False, server_default="0"
        ),
        sa.Column(
            "output_tokens", sa.Integer, nullable=False, server_default="0"
        ),
        sa.Column("requests", sa.Integer, nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint(
            "tenant_id",
            "model_id",
            "window_start",
            name="pk_quota_counters",
        ),
    )
    op.execute(
        "CREATE INDEX ix_quota_counters_window ON quota_counters (window_start)"
    )

    # ── Channel: channels ────────────────────────────────────────────────
    op.create_table(
        "channels",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("type", sa.String(16), nullable=False),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("external_id", sa.String(256), nullable=False),
        sa.Column(
            "webhook_secret_id", postgresql.UUID(as_uuid=True), nullable=True
        ),
        sa.Column(
            "status", sa.String(16), nullable=False, server_default="active"
        ),
        sa.Column("inbound_path", sa.String(512), nullable=False),
        sa.Column(
            "outbound_config",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "tenant_id",
            "type",
            "external_id",
            name="uq_channels_tenant_type_extid",
        ),
        sa.CheckConstraint(
            "type IN ('feishu','dingtalk','wechatwork','web')",
            name="ck_channel_type",
        ),
        sa.CheckConstraint(
            "status IN ('active','disabled')",
            name="ck_channel_status",
        ),
    )
    op.execute(
        "CREATE INDEX ix_channels_tenant_status ON channels (tenant_id, status)"
    )

    # ── Channel: channel_secrets ─────────────────────────────────────────
    op.create_table(
        "channel_secrets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("channel_type", sa.String(16), nullable=False),
        sa.Column("label", sa.String(256), nullable=False),
        sa.Column(
            "encrypted_payload", sa.LargeBinary, nullable=False
        ),  # nonce(12) || ct || tag(16)
        sa.Column(
            "key_version", sa.Integer, nullable=False, server_default="1"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("rotated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "channel_type IN ('feishu','dingtalk','wechatwork','web')",
            name="ck_channel_secret_type",
        ),
    )
    op.execute(
        "CREATE INDEX ix_channel_secrets_tenant ON channel_secrets (tenant_id)"
    )

    # ── Channel: channel_deliveries ──────────────────────────────────────
    op.create_table(
        "channel_deliveries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("channel_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("direction", sa.String(16), nullable=False),
        sa.Column(
            "external_message_id", sa.String(256), nullable=True
        ),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "payload_summary",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "status", sa.String(16), nullable=False, server_default="pending"
        ),
        sa.Column("error_code", sa.String(64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "direction IN ('inbound','outbound')",
            name="ck_delivery_direction",
        ),
        sa.CheckConstraint(
            "status IN ('pending','sent','delivered','failed')",
            name="ck_delivery_status",
        ),
    )
    op.execute(
        "CREATE INDEX ix_channel_deliveries_channel_created "
        "ON channel_deliveries (channel_id, created_at DESC)"
    )
    op.execute(
        "CREATE INDEX ix_channel_deliveries_tenant "
        "ON channel_deliveries (tenant_id)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_channel_deliveries_tenant")
    op.execute("DROP INDEX IF EXISTS ix_channel_deliveries_channel_created")
    op.drop_table("channel_deliveries")

    op.execute("DROP INDEX IF EXISTS ix_channel_secrets_tenant")
    op.drop_table("channel_secrets")

    op.execute("DROP INDEX IF EXISTS ix_channels_tenant_status")
    op.drop_table("channels")

    op.execute("DROP INDEX IF EXISTS ix_quota_counters_window")
    op.drop_table("quota_counters")

    op.execute("DROP INDEX IF EXISTS ix_routing_policies_tenant")
    op.drop_table("routing_policies")

    op.execute("DROP INDEX IF EXISTS ix_model_credentials_tenant")
    op.drop_table("model_credentials")

    op.execute("DROP INDEX IF EXISTS ix_models_credential")
    op.execute("DROP INDEX IF EXISTS ix_models_tenant_enabled")
    op.drop_table("models")