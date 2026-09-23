"""Model persistence — SQLAlchemy ORM (0008_model_channel migration).

Tables (all tenant-scoped via ``TenantScopedMixin``):

- ``models``
- ``model_credentials``
- ``routing_policies``
- ``quota_counters`` (composite PK on tenant_id + model_id + window_start)
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Index,
    Integer,
    LargeBinary,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from eos_persistence.base import Base, TenantScopedMixin


class ModelORM(Base, TenantScopedMixin):
    __tablename__ = "models"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    workspace_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    provider: Mapped[str] = mapped_column(String(16), nullable=False)
    upstream_model: Mapped[str] = mapped_column(String(256), nullable=False)
    enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )
    credential_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    routing_policy_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        Index("ix_models_tenant_enabled", "tenant_id", "enabled"),
        CheckConstraint(
            "provider IN ('openai','anthropic','deepseek','custom','mock')",
            name="ck_model_provider",
        ),
    )


class ModelCredentialORM(Base, TenantScopedMixin):
    __tablename__ = "model_credentials"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    provider: Mapped[str] = mapped_column(String(16), nullable=False)
    label: Mapped[str] = mapped_column(String(256), nullable=False)
    encrypted_payload: Mapped[bytes] = mapped_column(
        LargeBinary, nullable=False
    )
    key_version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="1"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    rotated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        Index("ix_model_credentials_tenant", "tenant_id"),
        CheckConstraint(
            "provider IN ('openai','anthropic','deepseek','custom','mock')",
            name="ck_credential_provider",
        ),
    )


class RoutingPolicyORM(Base, TenantScopedMixin):
    __tablename__ = "routing_policies"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    strategy: Mapped[str] = mapped_column(String(32), nullable=False)
    primary_model_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    failover_model_ids: Mapped[list[UUID]] = mapped_column(
        ARRAY(PG_UUID(as_uuid=True)),
        nullable=False,
        server_default="{}",
    )
    selection_rules: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )
    version_lock: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="1"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        Index("ix_routing_policies_tenant", "tenant_id"),
        CheckConstraint(
            "strategy IN "
            "('priority','round_robin','cost_optim','latency_optim','tenant_default')",
            name="ck_routing_strategy",
        ),
    )


class QuotaCounterORM(Base):
    """Composite-PK table — not tenant-scoped via mixin (PK already binds)."""

    __tablename__ = "quota_counters"

    tenant_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True
    )
    model_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True
    )
    window_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), primary_key=True
    )
    input_tokens: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    output_tokens: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    requests: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        Index("ix_quota_counters_window", "window_start"),
    )


__all__ = [
    "ModelCredentialORM",
    "ModelORM",
    "QuotaCounterORM",
    "RoutingPolicyORM",
]