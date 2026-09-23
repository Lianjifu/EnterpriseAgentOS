"""Tier B — knowledge pack signing + vetter tests.

Mirrors ``backend/modules/skill/tests/unit/test_skill_signing_and_vetter.py``
but for :class:`KnowledgePackage`.  Exercises:

* :func:`canonical_payload` / :func:`sign_payload` / :func:`verify_signature`
  round-trip + tamper detection.
* :class:`InMemoryTrustStoreKnowledgeVetter` accepts signed packs, rejects
  unsigned / unknown-signer / tampered.
* :class:`LocalTrustStoreKnowledgeVetter` reads PEMs from a tmp trust dir.
* :class:`NoOpKnowledgeVetter` accepts everything (disabled mode).
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

from deos.modules.knowledge.application.vetter import (
    InMemoryTrustStoreKnowledgeVetter,
    LocalTrustStoreKnowledgeVetter,
    NoOpKnowledgeVetter,
)
from deos.modules.knowledge.domain.entities import KnowledgePackage
from deos.modules.knowledge.domain.errors import (
    KnowledgeSignatureInvalid,
    KnowledgeSignerUntrusted,
)
from deos.modules.knowledge.domain.signing import (
    KnowledgePackPayload,
    canonical_payload,
    sign_payload,
    verify_signature,
)


def _new_key() -> Ed25519PrivateKey:
    return Ed25519PrivateKey.generate()


def _payload() -> KnowledgePackPayload:
    return KnowledgePackPayload(
        name="kp.office.handbook",
        version="0.1.0",
        description="Internal handbook corpus",
        chunking_strategy="fixed",
        embedding_model="text-embedding-3-small",
        asset_ids=("asset-1", "asset-2", "asset-3"),
        refresh_policy="never",
        network_policy="default",
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


def test_tampered_field_breaks_signature() -> None:
    p = _payload()
    key = _new_key()
    sig = sign_payload(p, private_key=key)
    tampered = KnowledgePackPayload(
        name=p.name,
        version=p.version,
        description="evil-description",  # tampered
        chunking_strategy=p.chunking_strategy,
        embedding_model=p.embedding_model,
        asset_ids=p.asset_ids,
        refresh_policy=p.refresh_policy,
        network_policy=p.network_policy,
    )
    with pytest.raises(InvalidSignature):
        verify_signature(tampered, signature_b64=sig, public_key=key.public_key())


def test_tampered_asset_ids_breaks_signature() -> None:
    """Swapping the asset set must invalidate the signature."""
    p = _payload()
    key = _new_key()
    sig = sign_payload(p, private_key=key)
    swapped = KnowledgePackPayload(
        name=p.name,
        version=p.version,
        description=p.description,
        chunking_strategy=p.chunking_strategy,
        embedding_model=p.embedding_model,
        asset_ids=("asset-evil",),  # tampered
        refresh_policy=p.refresh_policy,
        network_policy=p.network_policy,
    )
    with pytest.raises(InvalidSignature):
        verify_signature(swapped, signature_b64=sig, public_key=key.public_key())


def test_wrong_public_key_breaks_signature() -> None:
    p = _payload()
    key = _new_key()
    sig = sign_payload(p, private_key=key)
    with pytest.raises(InvalidSignature):
        verify_signature(p, signature_b64=sig, public_key=_new_key().public_key())


# InMemoryTrustStoreKnowledgeVetter -------------------------------------------


def _signed_package(key: Ed25519PrivateKey) -> KnowledgePackage:
    p = _payload()
    sig = sign_payload(p, private_key=key)
    return KnowledgePackage.create(
        tenant_id=UUID(int=1),
        workspace_id=UUID(int=2),
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


def _unsigned_package() -> KnowledgePackage:
    return KnowledgePackage.create(
        tenant_id=UUID(int=1),
        workspace_id=UUID(int=2),
        name="unsigned",
        description="",
    )


@pytest.mark.asyncio
async def test_inmemory_vetter_accepts_signed_pack() -> None:
    key = _new_key()
    vetter = InMemoryTrustStoreKnowledgeVetter()
    vetter.add(key.public_key())
    await vetter.vet(_signed_package(key))


@pytest.mark.asyncio
async def test_inmemory_vetter_rejects_unsigned_pack() -> None:
    vetter = InMemoryTrustStoreKnowledgeVetter()
    with pytest.raises(KnowledgeSignatureInvalid):
        await vetter.vet(_unsigned_package())


@pytest.mark.asyncio
async def test_inmemory_vetter_allows_unsigned_when_not_required() -> None:
    vetter = InMemoryTrustStoreKnowledgeVetter(require_signature=False)
    await vetter.vet(_unsigned_package())


@pytest.mark.asyncio
async def test_inmemory_vetter_rejects_unknown_signer() -> None:
    key = _new_key()
    pkg = _signed_package(key)
    vetter = InMemoryTrustStoreKnowledgeVetter()  # empty
    with pytest.raises(KnowledgeSignerUntrusted):
        await vetter.vet(pkg)


@pytest.mark.asyncio
async def test_inmemory_vetter_rejects_tampered_metadata() -> None:
    """Mutating ``metadata`` after the signature was issued must reject."""
    key = _new_key()
    pkg = _signed_package(key)
    # Tamper: rewrite metadata.asset_ids to a different value.
    bad = KnowledgePackage(
        id=pkg.id,
        tenant_id=pkg.tenant_id,
        workspace_id=pkg.workspace_id,
        name=pkg.name,
        description=pkg.description,
        status=pkg.status,
        asset_count=pkg.asset_count,
        metadata={**dict(pkg.metadata), "asset_ids": ["forged"]},
        created_by=pkg.created_by,
        signature=pkg.signature,
        signer_key_id=pkg.signer_key_id,
        image_digest=pkg.image_digest,
        created_at=pkg.created_at,
        updated_at=pkg.updated_at,
    )
    vetter = InMemoryTrustStoreKnowledgeVetter()
    vetter.add(key.public_key())
    with pytest.raises(KnowledgeSignatureInvalid):
        await vetter.vet(bad)


# LocalTrustStoreKnowledgeVetter ----------------------------------------------


@pytest.mark.asyncio
async def test_local_trust_store_vetter_accepts(tmp_path: Path) -> None:
    key = _new_key()
    kid = public_key_id(key.public_key())
    (tmp_path / f"{kid}.pub.pem").write_bytes(public_key_to_pem(key.public_key()))
    vetter = LocalTrustStoreKnowledgeVetter(trust_dir=str(tmp_path))
    await vetter.vet(_signed_package(key))


@pytest.mark.asyncio
async def test_local_trust_store_rejects_wrong_filename(tmp_path: Path) -> None:
    key = _new_key()
    (tmp_path / "deadbeef.pub.pem").write_bytes(public_key_to_pem(key.public_key()))
    with pytest.raises(KnowledgeSignerUntrusted):
        LocalTrustStoreKnowledgeVetter(trust_dir=str(tmp_path))


@pytest.mark.asyncio
async def test_local_trust_store_rejects_missing_dir(tmp_path: Path) -> None:
    ghost = tmp_path / "nope"
    with pytest.raises(KnowledgeSignerUntrusted):
        LocalTrustStoreKnowledgeVetter(trust_dir=str(ghost))


@pytest.mark.asyncio
async def test_local_trust_store_rejects_empty_dir(tmp_path: Path) -> None:
    with pytest.raises(KnowledgeSignerUntrusted):
        LocalTrustStoreKnowledgeVetter(trust_dir=str(tmp_path))


# NoOpKnowledgeVetter ----------------------------------------------------------


@pytest.mark.asyncio
async def test_noop_vetter_accepts_everything() -> None:
    await NoOpKnowledgeVetter().vet(_unsigned_package())


@pytest.mark.asyncio
async def test_noop_vetter_accepts_signed_pack() -> None:
    await NoOpKnowledgeVetter().vet(_signed_package(_new_key()))


# Domain entity — partial-triple invariant ------------------------------------


def test_knowledge_package_rejects_partial_triple() -> None:
    """Any of signature/signer_key_id/image_digest set without the others
    must be rejected at construction time."""
    with pytest.raises(Exception, match="all be set together"):
        KnowledgePackage.create(
            tenant_id=UUID(int=1),
            workspace_id=UUID(int=2),
            name="partial",
            signature="abc",
            signer_key_id="",
            image_digest="",
        )


def test_knowledge_package_accepts_empty_triple() -> None:
    """Default unsigned construction is allowed."""
    pkg = KnowledgePackage.create(
        tenant_id=UUID(int=1),
        workspace_id=UUID(int=2),
        name="unsigned",
    )
    assert pkg.signature == ""
    assert pkg.signer_key_id == ""
    assert pkg.image_digest == ""
