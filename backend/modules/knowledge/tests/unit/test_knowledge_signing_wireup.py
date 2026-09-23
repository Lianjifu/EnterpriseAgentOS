"""Tier B — wire-up tests for the knowledge-pack signing triple.

Mirrors ``backend/modules/skill/tests/unit/test_skill_signing_wireup.py``.
Exercises:

* ORM ↔ domain roundtrip preserves ``signature`` / ``signer_key_id`` /
  ``image_digest``.
* HTTP DTOs accept and emit the triple (CreateKnowledgePackageRequest,
  KnowledgePackageResponse).
* ``CreateKnowledgePackageUseCase`` rejects unsigned / tampered packs
  when the wired vetter is strict.
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

from deos.modules.knowledge.adapter.http.dto import (
    CreateKnowledgePackageRequest,
    KnowledgePackageResponse,
)
from deos.modules.knowledge.adapter.http.mappers import package_to_dto
from deos.modules.knowledge.adapter.persistence.mappers import (
    package_to_domain,
    package_to_orm,
)
from deos.modules.knowledge.application.use_cases.create_package import (
    CreateKnowledgePackageUseCase,
)
from deos.modules.knowledge.application.vetter import (
    InMemoryTrustStoreKnowledgeVetter,
    LocalTrustStoreKnowledgeVetter,
)
from deos.modules.knowledge.domain.entities import KnowledgePackage
from deos.modules.knowledge.domain.errors import (
    KnowledgePackageNameConflict,
    KnowledgeSignatureInvalid,
    KnowledgeSignerUntrusted,
)
from deos.modules.knowledge.domain.signing import (
    KnowledgePackPayload,
    sign_payload,
)


class _StubRepo:
    """In-memory KnowledgeRepository — just enough for the use case."""

    def __init__(self) -> None:
        self.packages: dict[tuple, KnowledgePackage] = {}

    async def list_packages(self, *, tenant_id, workspace_id, limit):  # type: ignore[no-untyped-def]
        return [
            p
            for p in self.packages.values()
            if p.tenant_id == tenant_id and p.workspace_id == workspace_id
        ]

    async def add_package(self, package: KnowledgePackage) -> KnowledgePackage:
        if (package.tenant_id, package.workspace_id, package.name) in self.packages:
            raise KnowledgePackageNameConflict(
                f"knowledge package '{package.name}' already exists"
            )
        self.packages[(package.tenant_id, package.workspace_id, package.name)] = package
        return package


def _new_key() -> Ed25519PrivateKey:
    return Ed25519PrivateKey.generate()


def _payload() -> KnowledgePackPayload:
    return KnowledgePackPayload(
        name="kp.office.handbook",
        version="0.1.0",
        description="Internal handbook corpus",
        chunking_strategy="fixed",
        embedding_model="text-embedding-3-small",
        asset_ids=("a1", "a2"),
        refresh_policy="never",
        network_policy="default",
    )


def _make_package(
    *,
    signature: str = "",
    signer_key_id: str = "",
    image_digest: str = "",
) -> KnowledgePackage:
    return KnowledgePackage.create(
        tenant_id=uuid4(),
        workspace_id=uuid4(),
        name="kp.office.handbook",
        description="Internal handbook corpus",
        metadata={
            "version": "0.1.0",
            "chunking_strategy": "fixed",
            "embedding_model": "text-embedding-3-small",
            "asset_ids": ["a1", "a2"],
            "refresh_policy": "never",
            "network_policy": "default",
        },
        signature=signature,
        signer_key_id=signer_key_id,
        image_digest=image_digest,
    )


def test_orm_roundtrip_preserves_signature_triple() -> None:
    pkg = _make_package(
        signature="abc123",
        signer_key_id="d" * 64,
        image_digest="sha256:" + "b" * 64,
    )
    orm = package_to_orm(pkg)
    assert orm.signature == "abc123"
    assert orm.signer_key_id == "d" * 64
    assert orm.image_digest == "sha256:" + "b" * 64

    back = package_to_domain(orm)
    assert back.signature == "abc123"
    assert back.signer_key_id == "d" * 64
    assert back.image_digest == "sha256:" + "b" * 64


def test_orm_roundtrip_with_empty_triple_defaults() -> None:
    pkg = _make_package()
    orm = package_to_orm(pkg)
    assert orm.signature == ""
    assert orm.signer_key_id == ""
    assert orm.image_digest == ""
    back = package_to_domain(orm)
    assert back.signature == ""


def test_create_request_accepts_triple() -> None:
    req = CreateKnowledgePackageRequest(
        name="kp.x",
        description="",
        metadata={},
        signature="sig",
        signer_key_id="kid",
        image_digest="sha256:" + "a" * 64,
    )
    assert req.signature == "sig"
    assert req.signer_key_id == "kid"


def test_knowledge_package_response_exposes_triple() -> None:
    pkg = _make_package(
        signature="sig",
        signer_key_id="kid",
        image_digest="sha256:" + "a" * 64,
    )
    dto = package_to_dto(pkg)
    assert isinstance(dto, KnowledgePackageResponse)
    assert dto.signature == "sig"
    assert dto.signer_key_id == "kid"
    assert dto.image_digest == "sha256:" + "a" * 64


async def test_create_use_case_rejects_unsigned_under_strict_vetter() -> None:
    repo = _StubRepo()
    vetter = InMemoryTrustStoreKnowledgeVetter()
    uc = CreateKnowledgePackageUseCase(repository=repo, vetter=vetter)
    with pytest.raises(KnowledgeSignatureInvalid):
        await uc.execute(
            tenant_id=uuid4(),
            workspace_id=uuid4(),
            name="unsigned-pack",
        )


async def test_create_use_case_rejects_unknown_signer() -> None:
    key = _new_key()
    p = _payload()
    sig = sign_payload(p, private_key=key)
    repo = _StubRepo()
    vetter = InMemoryTrustStoreKnowledgeVetter()  # empty trust store
    uc = CreateKnowledgePackageUseCase(repository=repo, vetter=vetter)
    with pytest.raises(KnowledgeSignerUntrusted):
        await uc.execute(
            tenant_id=uuid4(),
            workspace_id=uuid4(),
            name=p.name,
            description=p.description,
            metadata={
                "version": p.version,
                "chunking_strategy": p.chunking_strategy,
                "embedding_model": p.embedding_model,
                "asset_ids": list(p.asset_ids),
                "refresh_policy": p.refresh_policy,
                "network_policy": p.network_policy,
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
    vetter = InMemoryTrustStoreKnowledgeVetter()
    vetter.add(key.public_key())
    uc = CreateKnowledgePackageUseCase(repository=repo, vetter=vetter)
    # The vetter signs the entity's own ``name`` so the test must pass
    # the *payload*'s name into ``execute(..., name=...)``.
    saved = await uc.execute(
        tenant_id=uuid4(),
        workspace_id=uuid4(),
        name=p.name,
        description=p.description,
        metadata={
            "version": p.version,
            "chunking_strategy": p.chunking_strategy,
            "embedding_model": p.embedding_model,
            "asset_ids": list(p.asset_ids),
            "refresh_policy": p.refresh_policy,
            "network_policy": p.network_policy,
        },
        signature=sig,
        signer_key_id=public_key_id(key.public_key()),
        image_digest="sha256:" + "a" * 64,
    )
    assert saved.signature == sig


def test_local_trust_store_vetter_raises_on_empty_dir(tmp_path: Path) -> None:
    with pytest.raises(KnowledgeSignerUntrusted):
        LocalTrustStoreKnowledgeVetter(trust_dir=str(tmp_path))


def test_local_trust_store_vetter_raises_when_dir_missing(tmp_path: Path) -> None:
    with pytest.raises(KnowledgeSignerUntrusted):
        LocalTrustStoreKnowledgeVetter(trust_dir=str(tmp_path / "ghost"))


async def test_local_trust_store_vetter_caches_key_for_repeat_lookups(
    tmp_path: Path,
) -> None:
    key = _new_key()
    kid = public_key_id(key.public_key())
    (tmp_path / f"{kid}.pub.pem").write_bytes(public_key_to_pem(key.public_key()))
    vetter = LocalTrustStoreKnowledgeVetter(trust_dir=str(tmp_path))
    # Build a signed package and run vet twice — second call must not
    # re-scan the trust dir.
    p = _payload()
    sig = sign_payload(p, private_key=key)
    pkg = _make_package(
        signature=sig,
        signer_key_id=kid,
        image_digest="sha256:" + "c" * 64,
    )
    await vetter.vet(pkg)
    # Mutate the trust dir; if the vetter re-scanned, this would now be
    # empty.  Re-vet with the same cached state must still pass.
    (tmp_path / f"{kid}.pub.pem").unlink()
    await vetter.vet(pkg)
