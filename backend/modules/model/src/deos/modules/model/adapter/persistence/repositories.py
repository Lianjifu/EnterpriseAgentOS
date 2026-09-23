"""SQL repositories for model domain — async SQLAlchemy.

Each repository implements one of the application ports:

- ``SqlModelRepository``           → ModelRepository
- ``SqlCredentialRepository``       → CredentialRepository
- ``SqlRoutingPolicyRepository``    → RoutingPolicyRepository
- ``SqlQuotaCounterRepository``     → QuotaCounterRepository

Tenant-scoped repositories rely on ``TenantScopedMixin`` (via
``TenantScopedLoader``'s ``do_orm_execute`` listener) to auto-filter
queries by the active ``tenant_id`` contextvar. ``QuotaCounterORM``
doesn't inherit the mixin because its composite PK already binds the
tenant — those repositories apply the WHERE explicitly.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from eos_schema.ids import (
    CredentialId,
    ModelId,
    RoutingPolicyId,
    TenantId,
)
from eos_schema.ids import (
    ModelId as _ModelIdType,
)
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from deos.modules.model.adapter.persistence.models import (
    ModelCredentialORM,
    ModelORM,
    QuotaCounterORM,
    RoutingPolicyORM,
)
from deos.modules.model.application.ports import (
    CredentialRepository,
    ModelRepository,
    QuotaCounterRepository,
    RoutingPolicyRepository,
)
from deos.modules.model.domain.entities import (
    Model,
    ModelCredential,
    QuotaCounter,
    RoutingPolicy,
)
from deos.modules.model.domain.value_objects import (
    ModelProvider,
    RoutingStrategy,
)


def _model_to_domain(row: ModelORM) -> Model:
    return Model(
        id=_ModelIdType(row.id),
        tenant_id=TenantId(row.tenant_id),
        workspace_id=row.workspace_id,
        name=row.name,
        provider=ModelProvider(row.provider),
        upstream_model=row.upstream_model,
        enabled=row.enabled,
        credential_id=CredentialId(row.credential_id) if row.credential_id else None,
        routing_policy_id=RoutingPolicyId(row.routing_policy_id)
        if row.routing_policy_id
        else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _credential_to_domain(row: ModelCredentialORM) -> ModelCredential:
    return ModelCredential(
        id=CredentialId(row.id),
        tenant_id=TenantId(row.tenant_id),
        provider=ModelProvider(row.provider),
        label=row.label,
        encrypted_payload=row.encrypted_payload,
        key_version=row.key_version,
        created_at=row.created_at,
        rotated_at=row.rotated_at,
    )


def _policy_to_domain(row: RoutingPolicyORM) -> RoutingPolicy:
    return RoutingPolicy(
        id=RoutingPolicyId(row.id),
        tenant_id=TenantId(row.tenant_id),
        strategy=RoutingStrategy(row.strategy),
        primary_model_id=_ModelIdType(row.primary_model_id)
        if row.primary_model_id
        else None,
        failover_model_ids=[_ModelIdType(m) for m in row.failover_model_ids],
        selection_rules=dict(row.selection_rules or {}),
        version_lock=row.version_lock,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _quota_to_domain(row: QuotaCounterORM) -> QuotaCounter:
    return QuotaCounter(
        tenant_id=TenantId(row.tenant_id),
        model_id=_ModelIdType(row.model_id),
        window_start=row.window_start,
        input_tokens=row.input_tokens,
        output_tokens=row.output_tokens,
        requests=row.requests,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


# ── ModelRepository ───────────────────────────────────────────────────────


class SqlModelRepository(ModelRepository):
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._sf = session_factory

    async def add(self, model: Model) -> None:
        async with self._sf() as session:
            session.add(
                ModelORM(
                    id=model.id,
                    tenant_id=model.tenant_id,
                    workspace_id=model.workspace_id,
                    name=model.name,
                    provider=model.provider.value,
                    upstream_model=model.upstream_model,
                    enabled=model.enabled,
                    credential_id=model.credential_id,
                    routing_policy_id=model.routing_policy_id,
                    created_at=model.created_at,
                    updated_at=model.updated_at,
                )
            )
            await session.commit()

    async def get(self, *, tenant_id: TenantId, model_id: ModelId) -> Model | None:
        async with self._sf() as session:
            row = await session.get(ModelORM, model_id)
            if row is None or row.tenant_id != tenant_id:
                return None
            return _model_to_domain(row)

    async def get_by_name(self, *, tenant_id: TenantId, name: str) -> Model | None:
        async with self._sf() as session:
            stmt = select(ModelORM).where(
                ModelORM.tenant_id == tenant_id, ModelORM.name == name
            )
            row = (await session.execute(stmt)).scalar_one_or_none()
            if row is None:
                return None
            return _model_to_domain(row)

    async def list(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: UUID | None = None,
        enabled_only: bool = False,
        limit: int = 100,
    ) -> list[Model]:
        async with self._sf() as session:
            stmt = select(ModelORM).where(ModelORM.tenant_id == tenant_id)
            if workspace_id is not None:
                # tenant-wide rows (workspace_id IS NULL) + same workspace
                stmt = stmt.where(
                    (ModelORM.workspace_id.is_(None))
                    | (ModelORM.workspace_id == workspace_id)
                )
            if enabled_only:
                stmt = stmt.where(ModelORM.enabled.is_(True))
            stmt = stmt.limit(limit)
            rows = (await session.execute(stmt)).scalars().all()
            return [_model_to_domain(r) for r in rows]

    async def update(self, model: Model) -> None:
        async with self._sf() as session:
            row = await session.get(ModelORM, model.id)
            if row is None or row.tenant_id != model.tenant_id:
                return
            row.name = model.name
            row.upstream_model = model.upstream_model
            row.provider = model.provider.value
            row.enabled = model.enabled
            row.credential_id = model.credential_id
            row.routing_policy_id = model.routing_policy_id
            row.updated_at = model.updated_at
            await session.commit()

    async def delete(self, *, tenant_id: TenantId, model_id: ModelId) -> bool:
        async with self._sf() as session:
            row = await session.get(ModelORM, model_id)
            if row is None or row.tenant_id != tenant_id:
                return False
            await session.delete(row)
            await session.commit()
            return True


# ── CredentialRepository ──────────────────────────────────────────────────


class SqlCredentialRepository(CredentialRepository):
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._sf = session_factory

    async def add(self, credential: ModelCredential) -> None:
        async with self._sf() as session:
            session.add(
                ModelCredentialORM(
                    id=credential.id,
                    tenant_id=credential.tenant_id,
                    provider=credential.provider.value,
                    label=credential.label,
                    encrypted_payload=credential.encrypted_payload,
                    key_version=credential.key_version,
                    created_at=credential.created_at,
                    rotated_at=credential.rotated_at,
                )
            )
            await session.commit()

    async def get(
        self, *, tenant_id: TenantId, credential_id: CredentialId
    ) -> ModelCredential | None:
        async with self._sf() as session:
            row = await session.get(ModelCredentialORM, credential_id)
            if row is None or row.tenant_id != tenant_id:
                return None
            return _credential_to_domain(row)

    async def list(
        self, *, tenant_id: TenantId, limit: int = 100
    ) -> list[ModelCredential]:
        async with self._sf() as session:
            stmt = (
                select(ModelCredentialORM)
                .where(ModelCredentialORM.tenant_id == tenant_id)
                .limit(limit)
            )
            rows = (await session.execute(stmt)).scalars().all()
            return [_credential_to_domain(r) for r in rows]

    async def update(self, credential: ModelCredential) -> None:
        async with self._sf() as session:
            row = await session.get(ModelCredentialORM, credential.id)
            if row is None or row.tenant_id != credential.tenant_id:
                return
            row.label = credential.label
            row.encrypted_payload = credential.encrypted_payload
            row.key_version = credential.key_version
            row.rotated_at = credential.rotated_at
            await session.commit()

    async def delete(self, *, tenant_id: TenantId, credential_id: CredentialId) -> bool:
        async with self._sf() as session:
            row = await session.get(ModelCredentialORM, credential_id)
            if row is None or row.tenant_id != tenant_id:
                return False
            await session.delete(row)
            await session.commit()
            return True


# ── RoutingPolicyRepository ──────────────────────────────────────────────


class SqlRoutingPolicyRepository(RoutingPolicyRepository):
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._sf = session_factory

    async def add(self, policy: RoutingPolicy) -> None:
        async with self._sf() as session:
            session.add(
                RoutingPolicyORM(
                    id=policy.id,
                    tenant_id=policy.tenant_id,
                    strategy=policy.strategy.value,
                    primary_model_id=policy.primary_model_id,
                    failover_model_ids=[str(m) for m in policy.failover_model_ids],
                    selection_rules=policy.selection_rules,
                    version_lock=policy.version_lock,
                    created_at=policy.created_at,
                    updated_at=policy.updated_at,
                )
            )
            await session.commit()

    async def get(
        self, *, tenant_id: TenantId, policy_id: RoutingPolicyId
    ) -> RoutingPolicy | None:
        async with self._sf() as session:
            row = await session.get(RoutingPolicyORM, policy_id)
            if row is None or row.tenant_id != tenant_id:
                return None
            return _policy_to_domain(row)

    async def get_for_model(
        self, *, tenant_id: TenantId, model_id: ModelId
    ) -> RoutingPolicy | None:
        async with self._sf() as session:
            stmt = select(RoutingPolicyORM).where(
                RoutingPolicyORM.tenant_id == tenant_id,
                RoutingPolicyORM.primary_model_id == model_id,
            )
            row = (await session.execute(stmt)).scalar_one_or_none()
            if row is not None:
                return _policy_to_domain(row)
            # Search in failover array
            stmt2 = select(RoutingPolicyORM).where(
                RoutingPolicyORM.tenant_id == tenant_id,
                RoutingPolicyORM.failover_model_ids.any(model_id),
            )
            row = (await session.execute(stmt2)).scalar_one_or_none()
            if row is None:
                return None
            return _policy_to_domain(row)

    async def list(
        self, *, tenant_id: TenantId, limit: int = 100
    ) -> list[RoutingPolicy]:
        async with self._sf() as session:
            stmt = (
                select(RoutingPolicyORM)
                .where(RoutingPolicyORM.tenant_id == tenant_id)
                .limit(limit)
            )
            rows = (await session.execute(stmt)).scalars().all()
            return [_policy_to_domain(r) for r in rows]


# ── QuotaCounterRepository ───────────────────────────────────────────────


class SqlQuotaCounterRepository(QuotaCounterRepository):
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._sf = session_factory

    async def get(
        self,
        *,
        tenant_id: TenantId,
        model_id: ModelId,
        window_start: datetime,
    ) -> QuotaCounter | None:
        async with self._sf() as session:
            row = await session.get(
                QuotaCounterORM,
                (tenant_id, model_id, window_start),
            )
            return _quota_to_domain(row) if row else None

    async def increment(
        self,
        *,
        tenant_id: TenantId,
        model_id: ModelId,
        window_start: datetime,
        input_tokens: int,
        output_tokens: int,
    ) -> QuotaCounter:
        # INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING — atomic
        # single round-trip increment.
        async with self._sf() as session:
            stmt = (
                pg_insert(QuotaCounterORM)
                .values(
                    tenant_id=tenant_id,
                    model_id=model_id,
                    window_start=window_start,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    requests=1,
                )
                .on_conflict_do_update(
                    index_elements=[
                        QuotaCounterORM.tenant_id,
                        QuotaCounterORM.model_id,
                        QuotaCounterORM.window_start,
                    ],
                    set_={
                        "input_tokens": QuotaCounterORM.input_tokens + input_tokens,
                        "output_tokens": QuotaCounterORM.output_tokens + output_tokens,
                        "requests": QuotaCounterORM.requests + 1,
                        "updated_at": func.now(),
                    },
                )
                .returning(QuotaCounterORM)
            )
            row = (await session.execute(stmt)).scalar_one()
            await session.commit()
            return _quota_to_domain(row)

    async def get_window_usage(
        self,
        *,
        tenant_id: TenantId,
        model_id: ModelId,
        window_start: datetime,
    ) -> int:
        async with self._sf() as session:
            row = await session.get(
                QuotaCounterORM,
                (tenant_id, model_id, window_start),
            )
            if row is None:
                return 0
            return row.input_tokens + row.output_tokens


__all__ = [
    "SqlCredentialRepository",
    "SqlModelRepository",
    "SqlQuotaCounterRepository",
    "SqlRoutingPolicyRepository",
]
