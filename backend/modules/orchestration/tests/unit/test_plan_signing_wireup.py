"""Tier B — wire-up tests for the plan-pack signing triple.

Mirrors ``backend/modules/knowledge/tests/unit/test_knowledge_signing_wireup.py``.
"""

from __future__ import annotations

from pathlib import Path
from uuid import uuid4

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from eos_pack_signing import (
    public_key_id,
    public_key_to_pem,
)

from deos.modules.orchestration.adapter.http.dto import (
    CreatePlanRequest,
    PlanResponse,
)
from deos.modules.orchestration.adapter.http.mappers import plan_to_dto
from deos.modules.orchestration.adapter.persistence.mappers import (
    plan_to_domain,
    plan_to_orm,
)
from deos.modules.orchestration.application.use_cases.create_plan import (
    CreatePlanUseCase,
)
from deos.modules.orchestration.application.vetter import (
    InMemoryTrustStorePlanVetter,
    LocalTrustStorePlanVetter,
)
from deos.modules.orchestration.domain.entities import Plan
from deos.modules.orchestration.domain.errors import (
    PlanNameConflict,
    PlanSignatureInvalid,
    PlanSignerUntrusted,
)
from deos.modules.orchestration.domain.signing import (
    PlanPackPayload,
    sign_payload,
)


class _StubRepo:
    """In-memory PlanRepository — just enough for the use case."""

    def __init__(self) -> None:
        self.plans: dict[str, Plan] = {}

    async def get_by_name(self, *, tenant_id, name):  # type: ignore[no-untyped-def]
        return self.plans.get((tenant_id, name))

    async def add(self, plan: Plan) -> Plan:
        if (plan.tenant_id, plan.name) in self.plans:
            raise PlanNameConflict(f"plan {plan.name!r} already exists")
        self.plans[(plan.tenant_id, plan.name)] = plan
        return plan


def _new_key() -> Ed25519PrivateKey:
    return Ed25519PrivateKey.generate()


def _payload() -> PlanPackPayload:
    return PlanPackPayload(
        name="pl.office.weekly_digest",
        version="0.1.0",
        description="Weekly digest plan",
        plan_dsl={
            "name": "pl.office.weekly_digest",
            "description": "Weekly digest plan",
            "entry": {
                "kind": "tool",
                "step_id": "s1",
                "tool_name": "echo",
                "arguments_template": {"text": "hi"},
            },
        },
        allowed_tenants=("demo", "internal"),
        schedule="0 9 * * 1",
        default_timeout_seconds=60,
    )


_VALID_DSL = {
    "name": "pl.office.weekly_digest",
    "description": "Weekly digest plan",
    "entry": {
        "kind": "tool",
        "step_id": "s1",
        "tool_name": "echo",
        "arguments_template": {"text": "hi"},
    },
}


def _make_plan(
    *,
    signature: str = "",
    signer_key_id: str = "",
    image_digest: str = "",
) -> Plan:
    return Plan.create(
        tenant_id=uuid4(),
        workspace_id=uuid4(),
        name="pl.office.weekly_digest",
        description="Weekly digest plan",
        entry_dsl=_VALID_DSL,
        max_total_steps=64,
        metadata={
            "version": "0.1.0",
            "allowed_tenants": ["demo", "internal"],
            "schedule": "0 9 * * 1",
            "default_timeout_seconds": 60,
        },
        created_by=uuid4(),
        signature=signature,
        signer_key_id=signer_key_id,
        image_digest=image_digest,
    )


def test_orm_roundtrip_preserves_signature_triple() -> None:
    plan = _make_plan(
        signature="abc123",
        signer_key_id="d" * 64,
        image_digest="sha256:" + "b" * 64,
    )
    orm = plan_to_orm(plan)
    assert orm.signature == "abc123"
    assert orm.signer_key_id == "d" * 64
    assert orm.image_digest == "sha256:" + "b" * 64
    back = plan_to_domain(orm)
    assert back.signature == "abc123"
    assert back.signer_key_id == "d" * 64
    assert back.image_digest == "sha256:" + "b" * 64


def test_orm_roundtrip_with_empty_triple_defaults() -> None:
    plan = _make_plan()
    orm = plan_to_orm(plan)
    assert orm.signature == ""
    assert orm.signer_key_id == ""
    assert orm.image_digest == ""
    back = plan_to_domain(orm)
    assert back.signature == ""


def test_create_plan_request_accepts_triple() -> None:
    req = CreatePlanRequest(
        name="pl.x",
        description="",
        entry_dsl={"kind": "single", "prompt": "hi"},
        signature="sig",
        signer_key_id="kid",
        image_digest="sha256:" + "a" * 64,
    )
    assert req.signature == "sig"
    assert req.signer_key_id == "kid"


def test_plan_response_exposes_triple() -> None:
    plan = _make_plan(
        signature="sig",
        signer_key_id="kid",
        image_digest="sha256:" + "a" * 64,
    )
    dto = plan_to_dto(plan)
    assert isinstance(dto, PlanResponse)
    assert dto.signature == "sig"
    assert dto.signer_key_id == "kid"
    assert dto.image_digest == "sha256:" + "a" * 64


async def test_create_use_case_rejects_unsigned_under_strict_vetter() -> None:
    repo = _StubRepo()
    vetter = InMemoryTrustStorePlanVetter()
    uc = CreatePlanUseCase(repository=repo, vetter=vetter)
    with pytest.raises(PlanSignatureInvalid):
        await uc.execute(
            tenant_id=uuid4(),
            workspace_id=uuid4(),
            name="pl.unsigned",
            description="",
            entry_dsl=_VALID_DSL,
        )


async def test_create_use_case_rejects_unknown_signer() -> None:
    key = _new_key()
    p = _payload()
    sig = sign_payload(p, private_key=key)
    repo = _StubRepo()
    vetter = InMemoryTrustStorePlanVetter()  # empty
    uc = CreatePlanUseCase(repository=repo, vetter=vetter)
    with pytest.raises(PlanSignerUntrusted):
        await uc.execute(
            tenant_id=uuid4(),
            workspace_id=uuid4(),
            name=p.name,
            description=p.description,
            entry_dsl=dict(p.plan_dsl),
            metadata={
                "version": p.version,
                "allowed_tenants": list(p.allowed_tenants),
                "schedule": p.schedule,
                "default_timeout_seconds": p.default_timeout_seconds,
            },
            signature=sig,
            signer_key_id=public_key_id(key.public_key()),
            image_digest="sha256:" + "a" * 64,
        )


async def test_create_use_case_accepts_signed_under_trusting_vetter() -> None:
    key = _new_key()
    p = _payload()
    sig = sign_payload(p, private_key=key)
    repo = _StubRepo()
    vetter = InMemoryTrustStorePlanVetter()
    vetter.add(key.public_key())
    uc = CreatePlanUseCase(repository=repo, vetter=vetter)
    saved = await uc.execute(
        tenant_id=uuid4(),
        workspace_id=uuid4(),
        name=p.name,
        description=p.description,
        entry_dsl=dict(p.plan_dsl),
        metadata={
            "version": p.version,
            "allowed_tenants": list(p.allowed_tenants),
            "schedule": p.schedule,
            "default_timeout_seconds": p.default_timeout_seconds,
        },
        signature=sig,
        signer_key_id=public_key_id(key.public_key()),
        image_digest="sha256:" + "a" * 64,
    )
    assert saved.signature == sig


def test_local_trust_store_vetter_raises_on_empty_dir(tmp_path: Path) -> None:
    with pytest.raises(PlanSignerUntrusted):
        LocalTrustStorePlanVetter(trust_dir=str(tmp_path))


def test_local_trust_store_vetter_raises_when_dir_missing(tmp_path: Path) -> None:
    with pytest.raises(PlanSignerUntrusted):
        LocalTrustStorePlanVetter(trust_dir=str(tmp_path / "ghost"))


async def test_local_trust_store_vetter_caches_key_for_repeat_lookups(
    tmp_path: Path,
) -> None:
    key = _new_key()
    kid = public_key_id(key.public_key())
    (tmp_path / f"{kid}.pub.pem").write_bytes(public_key_to_pem(key.public_key()))
    vetter = LocalTrustStorePlanVetter(trust_dir=str(tmp_path))
    p = _payload()
    sig = sign_payload(p, private_key=key)
    plan = _make_plan(
        signature=sig,
        signer_key_id=kid,
        image_digest="sha256:" + "c" * 64,
    )
    await vetter.vet(plan)
    # Mutate the trust dir; if the vetter re-scanned, this would now be
    # empty.  Re-vet with the same cached state must still pass.
    (tmp_path / f"{kid}.pub.pem").unlink()
    await vetter.vet(plan)
