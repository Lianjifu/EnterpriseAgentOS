"""Tier B — plan pack signing + vetter tests.

Mirrors ``test_knowledge_signing_and_vetter.py`` but for :class:`Plan`.
"""

from __future__ import annotations

from pathlib import Path
from uuid import UUID

import pytest
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from eos_pack_signing import (
    public_key_id,
    public_key_to_pem,
)

from deos.modules.orchestration.application.vetter import (
    InMemoryTrustStorePlanVetter,
    LocalTrustStorePlanVetter,
    NoOpPlanVetter,
)
from deos.modules.orchestration.domain.entities import Plan
from deos.modules.orchestration.domain.errors import (
    PlanSignatureInvalid,
    PlanSignerUntrusted,
)
from deos.modules.orchestration.domain.signing import (
    PlanPackPayload,
    canonical_payload,
    sign_payload,
    verify_signature,
)


def _new_key() -> Ed25519PrivateKey:
    return Ed25519PrivateKey.generate()


def _payload() -> PlanPackPayload:
    return PlanPackPayload(
        name="pl.office.weekly_digest",
        version="0.1.0",
        description="Weekly digest plan",
        plan_dsl={"kind": "single", "prompt": "summarize this week"},
        allowed_tenants=("demo", "internal"),
        schedule="0 9 * * 1",
        default_timeout_seconds=60,
    )


# canonical_payload / sign_payload / verify_signature --------------------------


def test_canonical_payload_is_deterministic() -> None:
    p = _payload()
    assert canonical_payload(p) == canonical_payload(p)


def test_sign_verify_roundtrip() -> None:
    p = _payload()
    key = _new_key()
    sig = sign_payload(p, private_key=key)
    verify_signature(p, signature_b64=sig, public_key=key.public_key())


def test_tampered_dsl_breaks_signature() -> None:
    p = _payload()
    key = _new_key()
    sig = sign_payload(p, private_key=key)
    tampered = PlanPackPayload(
        name=p.name,
        version=p.version,
        description=p.description,
        plan_dsl={"kind": "single", "prompt": "DROP DATABASE"},  # tampered
        allowed_tenants=p.allowed_tenants,
        schedule=p.schedule,
        default_timeout_seconds=p.default_timeout_seconds,
    )
    with pytest.raises(InvalidSignature):
        verify_signature(
            tampered, signature_b64=sig, public_key=key.public_key()
        )


def test_tampered_allowed_tenants_breaks_signature() -> None:
    """Widening the tenant scope after signing must invalidate."""
    p = _payload()
    key = _new_key()
    sig = sign_payload(p, private_key=key)
    tampered = PlanPackPayload(
        name=p.name,
        version=p.version,
        description=p.description,
        plan_dsl=dict(p.plan_dsl),
        allowed_tenants=("*",),  # tampered
        schedule=p.schedule,
        default_timeout_seconds=p.default_timeout_seconds,
    )
    with pytest.raises(InvalidSignature):
        verify_signature(
            tampered, signature_b64=sig, public_key=key.public_key()
        )


def test_tampered_schedule_breaks_signature() -> None:
    p = _payload()
    key = _new_key()
    sig = sign_payload(p, private_key=key)
    tampered = PlanPackPayload(
        name=p.name,
        version=p.version,
        description=p.description,
        plan_dsl=dict(p.plan_dsl),
        allowed_tenants=p.allowed_tenants,
        schedule="* * * * *",  # tampered
        default_timeout_seconds=p.default_timeout_seconds,
    )
    with pytest.raises(InvalidSignature):
        verify_signature(
            tampered, signature_b64=sig, public_key=key.public_key()
        )


def test_tampered_timeout_breaks_signature() -> None:
    p = _payload()
    key = _new_key()
    sig = sign_payload(p, private_key=key)
    tampered = PlanPackPayload(
        name=p.name,
        version=p.version,
        description=p.description,
        plan_dsl=dict(p.plan_dsl),
        allowed_tenants=p.allowed_tenants,
        schedule=p.schedule,
        default_timeout_seconds=86_400 * 365,  # tampered — effectively no timeout
    )
    with pytest.raises(InvalidSignature):
        verify_signature(
            tampered, signature_b64=sig, public_key=key.public_key()
        )


# InMemoryTrustStorePlanVetter ------------------------------------------------


def _signed_plan(key: Ed25519PrivateKey) -> Plan:
    p = _payload()
    sig = sign_payload(p, private_key=key)
    return Plan.create(
        tenant_id=UUID(int=1),
        workspace_id=UUID(int=2),
        name=p.name,
        description=p.description,
        entry_dsl=dict(p.plan_dsl),
        max_total_steps=64,
        metadata={
            "version": p.version,
            "allowed_tenants": list(p.allowed_tenants),
            "schedule": p.schedule,
            "default_timeout_seconds": p.default_timeout_seconds,
        },
        created_by=UUID(int=3),
        signature=sig,
        signer_key_id=public_key_id(key.public_key()),
        image_digest="sha256:" + "b" * 64,
    )


def _unsigned_plan() -> Plan:
    return Plan.create(
        tenant_id=UUID(int=1),
        workspace_id=UUID(int=2),
        name="pl.unsigned",
        description="",
        entry_dsl={"kind": "single", "prompt": "hi"},
        max_total_steps=64,
        metadata={},
        created_by=UUID(int=3),
    )


@pytest.mark.asyncio
async def test_inmemory_vetter_accepts_signed_plan() -> None:
    key = _new_key()
    vetter = InMemoryTrustStorePlanVetter()
    vetter.add(key.public_key())
    await vetter.vet(_signed_plan(key))


@pytest.mark.asyncio
async def test_inmemory_vetter_rejects_unsigned_plan() -> None:
    vetter = InMemoryTrustStorePlanVetter()
    with pytest.raises(PlanSignatureInvalid):
        await vetter.vet(_unsigned_plan())


@pytest.mark.asyncio
async def test_inmemory_vetter_allows_unsigned_when_not_required() -> None:
    vetter = InMemoryTrustStorePlanVetter(require_signature=False)
    await vetter.vet(_unsigned_plan())


@pytest.mark.asyncio
async def test_inmemory_vetter_rejects_unknown_signer() -> None:
    key = _new_key()
    vetter = InMemoryTrustStorePlanVetter()  # empty
    with pytest.raises(PlanSignerUntrusted):
        await vetter.vet(_signed_plan(key))


@pytest.mark.asyncio
async def test_inmemory_vetter_rejects_tampered_dsl() -> None:
    key = _new_key()
    plan = _signed_plan(key)
    # Forge a tampered Plan by rebuilding the entity with a different
    # entry_dsl but the same signature triple.
    bad = Plan(
        id=plan.id,
        tenant_id=plan.tenant_id,
        workspace_id=plan.workspace_id,
        name=plan.name,
        description=plan.description,
        entry_dsl={"kind": "single", "prompt": "forged"},  # tampered
        max_total_steps=plan.max_total_steps,
        metadata=dict(plan.metadata),
        created_by=plan.created_by,
        signature=plan.signature,
        signer_key_id=plan.signer_key_id,
        image_digest=plan.image_digest,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )
    vetter = InMemoryTrustStorePlanVetter()
    vetter.add(key.public_key())
    with pytest.raises(PlanSignatureInvalid):
        await vetter.vet(bad)


# LocalTrustStorePlanVetter ---------------------------------------------------


@pytest.mark.asyncio
async def test_local_trust_store_vetter_accepts(tmp_path: Path) -> None:
    key = _new_key()
    kid = public_key_id(key.public_key())
    (tmp_path / f"{kid}.pub.pem").write_bytes(
        public_key_to_pem(key.public_key())
    )
    vetter = LocalTrustStorePlanVetter(trust_dir=str(tmp_path))
    await vetter.vet(_signed_plan(key))


@pytest.mark.asyncio
async def test_local_trust_store_rejects_wrong_filename(tmp_path: Path) -> None:
    key = _new_key()
    (tmp_path / "deadbeef.pub.pem").write_bytes(
        public_key_to_pem(key.public_key())
    )
    with pytest.raises(PlanSignerUntrusted):
        LocalTrustStorePlanVetter(trust_dir=str(tmp_path))


@pytest.mark.asyncio
async def test_local_trust_store_rejects_missing_dir(tmp_path: Path) -> None:
    with pytest.raises(PlanSignerUntrusted):
        LocalTrustStorePlanVetter(trust_dir=str(tmp_path / "nope"))


# NoOpPlanVetter --------------------------------------------------------------


@pytest.mark.asyncio
async def test_noop_vetter_accepts_everything() -> None:
    await NoOpPlanVetter().vet(_unsigned_plan())


# Domain entity — partial-triple invariant ------------------------------------


def test_plan_rejects_partial_triple() -> None:
    with pytest.raises(ValueError, match="all be set together"):
        Plan.create(
            tenant_id=UUID(int=1),
            workspace_id=UUID(int=2),
            name="partial",
            description="",
            entry_dsl={"kind": "single", "prompt": "x"},
            max_total_steps=64,
            metadata={},
            created_by=UUID(int=3),
            signature="sig",
            signer_key_id="",
            image_digest="",
        )