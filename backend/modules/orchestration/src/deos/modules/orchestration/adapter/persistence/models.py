"""SQLAlchemy ORM models for the orchestration module.

Three tables:

- ``plans``               — persisted Plan DSL.
- ``workflow_runs``       — one execution; carries its own snapshot of
                            the DSL so historical runs are immutable.
- ``workflow_step_runs``  — one row per executed step within a run.

Tenant scoping is enforced via the application layer (``tenant_id`` is a
plain column on every table).  Cascade rules:

- workflow_step_runs → workflow_runs (CASCADE)
- workflow_runs → plans (RESTRICT) — historical runs must outlive plan
  deletion; archival must be explicit.

Constraint ``status`` columns are validated by CheckConstraints in
``0010_orchestration.py``.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from eos_persistence.base import Base, TenantScopedMixin, make_composite_index
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column


class PlanORM(TenantScopedMixin, Base):
    __tablename__ = "plans"

    workspace_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("''")
    )
    entry_dsl: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    max_total_steps: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("64")
    )
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )
    created_by: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True), nullable=True
    )

    __table_args__ = (
        CheckConstraint(
            "max_total_steps BETWEEN 1 AND 256",
            name="ck_plans_max_total_steps_range",
        ),
        make_composite_index("workspace_id", "created_at"),
    )


class WorkflowRunORM(TenantScopedMixin, Base):
    __tablename__ = "workflow_runs"

    workspace_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), nullable=False, index=True
    )
    plan_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("plans.id", ondelete="RESTRICT"),
        nullable=False,
    )
    plan_dsl_snapshot: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        server_default=text("'pending'"),
    )
    variables: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )
    input: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )
    final_output: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    trace_id: Mapped[UUID | None] = mapped_column(PgUUID(as_uuid=True), nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        make_composite_index("workspace_id", "plan_id", "status"),
        make_composite_index("started_at"),
    )


class WorkflowStepRunORM(TenantScopedMixin, Base):
    __tablename__ = "workflow_step_runs"

    run_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("workflow_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    step_id: Mapped[str] = mapped_column(String(128), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        server_default=text("'pending'"),
    )
    input_rendered: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )
    output: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parent_step_run_id: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True), nullable=True
    )
    depth: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (make_composite_index("run_id", "step_id"),)


__all__ = [
    "PlanORM",
    "WorkflowRunORM",
    "WorkflowStepRunORM",
]