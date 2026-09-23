"""SQLAlchemy ORM models for the skill module.

All three tables inherit `TenantScopedMixin` so the `do_orm_execute`
listener in `install_tenant_loader` auto-filters every query by the
request's bound tenant id, and the `tenant_id` index is added by the
mixin.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from eos_persistence.base import Base, TenantScopedMixin, make_composite_index
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column


class SkillPackageORM(TenantScopedMixin, Base):
    __tablename__ = "skill_packages"

    workspace_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=text("''")
    )
    entrypoint: Mapped[str] = mapped_column(String(256), nullable=False)
    image: Mapped[str] = mapped_column(String(256), nullable=False)
    parameters_schema: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    artifact_uri: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=text("''")
    )
    network_policy: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="default",
        server_default=text("'default'"),
    )
    cpu_quota: Mapped[float | None] = mapped_column(Float, nullable=True)
    memory_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    timeout_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=30, server_default=text("30")
    )
    enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    version_lock: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=text("1")
    )

    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "workspace_id",
            "name",
            "version",
            name="uq_skill_packages_tenant_ws_name_version",
        ),
        make_composite_index("workspace_id", "enabled"),
        CheckConstraint(
            "network_policy IN ('none','default','unrestricted')",
            name="skill_packages_network_policy_enum",
        ),
        CheckConstraint(
            "timeout_seconds BETWEEN 1 AND 30",
            name="skill_packages_timeout_range",
        ),
    )


class SkillInstallORM(TenantScopedMixin, Base):
    __tablename__ = "skill_installs"

    workspace_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), nullable=False, index=True
    )
    package_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), nullable=False, index=True
    )
    package_version_lock: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=text("1")
    )
    installed_by: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="pending",
        server_default=text("'pending'"),
    )
    installed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    run_token_jti: Mapped[str | None] = mapped_column(String(128), nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "workspace_id",
            "package_id",
            "package_version_lock",
            name="uq_skill_installs_tenant_ws_pkg_lock",
        ),
        make_composite_index("workspace_id", "status"),
        CheckConstraint(
            "status IN ('pending','installed','failed')",
            name="skill_installs_status_enum",
        ),
    )


class SkillInvocationORM(TenantScopedMixin, Base):
    __tablename__ = "skill_invocations"

    workspace_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), nullable=False, index=True
    )
    install_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), nullable=False, index=True
    )
    package_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), nullable=False, index=True
    )
    arguments: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="queued",
        server_default=text("'queued'"),
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    stdout_tail: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=text("''")
    )
    stderr_tail: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=text("''")
    )
    artifact_uri: Mapped[str | None] = mapped_column(Text, nullable=True)
    sandbox_run_id: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True), nullable=True
    )

    __table_args__ = (
        make_composite_index("workspace_id", "status"),
        make_composite_index("package_id", "status"),
        CheckConstraint(
            "status IN ('queued','starting','running','succeeded',"
            "'failed','cancelled','timed_out')",
            name="skill_invocations_status_enum",
        ),
    )
