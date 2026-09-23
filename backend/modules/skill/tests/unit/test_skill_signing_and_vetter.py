"""Unit tests for skill pack signing + vetter.

We exercise:

* canonical_payload / sign_payload / verify_signature round-trip
* tampered fields break verification
* InMemoryTrustStoreSkillVetter accepts / rejects correctly
* LocalTrustStoreSkillVetter reads PEMs from a tmp trust dir
* NoOpSkillVetter accepts everything
* assert_image_digest_matches detects swaps
"""

from __future__ import annotations

from pathlib import Path
from uuid import UUID

import pytest
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from deos.modules.skill.application.vetter import (
    InMemoryTrustStoreSkillVetter,
    LocalTrustStoreSkillVetter,
    NoOpSkillVetter,
    assert_image_digest_matches,
)
from deos.modules.skill.domain.entities import NetworkPolicy, SkillPackage
from deos.modules.skill.domain.errors import (
    SkillImageDigestMismatch,
    SkillSignatureInvalid,
    SkillSignerUntrusted,
)
from deos.modules.skill.domain.signing import (
    SkillPackPayload,
    canonical_payload,
    load_private_key_pem,
    load_public_key_pem,
    private_key_to_pem,
    public_key_id,
    public_key_to_pem,
    sign_payload,
    verify_signature,
)


def _new_key() -> Ed25519PrivateKey:
    return Ed25519PrivateKey.generate()


def _payload() -> SkillPackPayload:
    return SkillPackPayload(
        name="hello-skill",
        version="1.0.0",
        description="demo",
        entrypoint="python -m hello",
        image="ghcr.io/eos/hello-skill:1.0.0",
        image_digest="sha256:" + "a" * 64,
        parameters_schema={"type": "object"},
        artifact_uri="skill-artifact://demo/abc",
        network_policy=str(NetworkPolicy.DEFAULT),
        cpu_quota=0.5,
        memory_bytes=64 * 1024 * 1024,
        timeout_seconds=15,
    )


# canonical_payload / sign_payload / verify_signature --------------------------


def test_canonical_payload_is_deterministic() -> None:
    p = _payload()
    a = canonical_payload(p)
    b = canonical_payload(p)
    assert a == b


def test_sign_verify_roundtrip() -> None:
    p = _payload()
    key = _new_key()
    sig = sign_payload(p, private_key=key)
    pub = key.public_key()
    verify_signature(p, signature_b64=sig, public_key=pub)


def test_tampered_field_breaks_signature() -> None:
    p = _payload()
    key = _new_key()
    sig = sign_payload(p, private_key=key)
    tampered = SkillPackPayload(
        name=p.name,
        version=p.version,
        description=p.description,
        entrypoint="rm -rf /",
        image=p.image,
        image_digest=p.image_digest,
        parameters_schema=dict(p.parameters_schema),
        artifact_uri=p.artifact_uri,
        network_policy=p.network_policy,
        cpu_quota=p.cpu_quota,
        memory_bytes=p.memory_bytes,
        timeout_seconds=p.timeout_seconds,
    )
    with pytest.raises(InvalidSignature):
        verify_signature(tampered, signature_b64=sig, public_key=key.public_key())


def test_wrong_public_key_breaks_signature() -> None:
    p = _payload()
    key = _new_key()
    other = _new_key()
    sig = sign_payload(p, private_key=key)
    with pytest.raises(InvalidSignature):
        verify_signature(p, signature_b64=sig, public_key=other.public_key())


def test_malformed_signature_b64_raises() -> None:
    p = _payload()
    key = _new_key()
    with pytest.raises(InvalidSignature):
        verify_signature(
            p, signature_b64="not!base64!at!all", public_key=key.public_key()
        )


# PEM helpers ------------------------------------------------------------------


def test_pem_helpers_roundtrip() -> None:
    key = _new_key()
    pem_priv = private_key_to_pem(key)
    pem_pub = public_key_to_pem(key.public_key())
    loaded_priv = load_private_key_pem(pem_priv)
    loaded_pub = load_public_key_pem(pem_pub)
    # roundtrip a signature to prove equivalence
    p = _payload()
    sig = sign_payload(p, private_key=loaded_priv)
    verify_signature(p, signature_b64=sig, public_key=loaded_pub)


def test_load_public_key_rejects_non_ed25519(tmp_path: Path) -> None:
    # write an obviously-wrong PEM
    p = tmp_path / "x.pub.pem"
    p.write_text(
        "-----BEGIN PUBLIC KEY-----\n"
        "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA\n"
        "-----END PUBLIC KEY-----\n"
    )
    with pytest.raises(ValueError):
        load_public_key_pem(p.read_bytes())


def test_public_key_id_is_sha256_of_pem() -> None:
    import hashlib

    key = _new_key()
    pem = public_key_to_pem(key.public_key())
    assert public_key_id(key.public_key()) == hashlib.sha256(pem).hexdigest()


# InMemoryTrustStoreSkillVetter ------------------------------------------------


def _signed_package(
    key: Ed25519PrivateKey, *, entrypoint: str = "python -m hello"
) -> SkillPackage:
    p = SkillPackPayload(
        name="hello-skill",
        version="1.0.0",
        description="demo",
        entrypoint=entrypoint,
        image="ghcr.io/eos/hello-skill:1.0.0",
        image_digest="sha256:" + "a" * 64,
        parameters_schema={},
        artifact_uri="",
        network_policy=str(NetworkPolicy.DEFAULT),
        cpu_quota=None,
        memory_bytes=None,
        timeout_seconds=15,
    )
    sig = sign_payload(p, private_key=key)
    return SkillPackage.create(
        tenant_id=UUID(int=1),
        workspace_id=UUID(int=2),
        name=p.name,
        version=p.version,
        description=p.description,
        entrypoint=p.entrypoint,
        image=p.image,
        parameters_schema=p.parameters_schema,
        artifact_uri=p.artifact_uri,
        network_policy=NetworkPolicy(p.network_policy),
        timeout_seconds=p.timeout_seconds,
        signature=sig,
        signer_key_id=public_key_id(key.public_key()),
        image_digest=p.image_digest,
    )


@pytest.mark.asyncio
async def test_inmemory_vetter_accepts_signed_pack() -> None:
    key = _new_key()
    vetter = InMemoryTrustStoreSkillVetter()
    vetter.add(key.public_key())
    await vetter.vet(_signed_package(key))


@pytest.mark.asyncio
async def test_inmemory_vetter_rejects_unsigned_pack() -> None:
    vetter = InMemoryTrustStoreSkillVetter()
    pkg = SkillPackage.create(
        tenant_id=UUID(int=1),
        workspace_id=UUID(int=2),
        name="unsigned",
        version="1.0.0",
        description="",
        entrypoint="python -m x",
        image="ghcr.io/x:1",
    )
    with pytest.raises(SkillSignatureInvalid):
        await vetter.vet(pkg)


@pytest.mark.asyncio
async def test_inmemory_vetter_allows_unsigned_when_not_required() -> None:
    vetter = InMemoryTrustStoreSkillVetter(require_signature=False)
    pkg = SkillPackage.create(
        tenant_id=UUID(int=1),
        workspace_id=UUID(int=2),
        name="unsigned",
        version="1.0.0",
        description="",
        entrypoint="python -m x",
        image="ghcr.io/x:1",
    )
    await vetter.vet(pkg)


@pytest.mark.asyncio
async def test_inmemory_vetter_rejects_unknown_signer() -> None:
    key = _new_key()
    pkg = _signed_package(key)
    vetter = InMemoryTrustStoreSkillVetter()  # empty trust store
    with pytest.raises(SkillSignerUntrusted):
        await vetter.vet(pkg)


@pytest.mark.asyncio
async def test_inmemory_vetter_rejects_tampered_pack() -> None:
    key = _new_key()
    pkg = _signed_package(key, entrypoint="python -m hello")
    # tamper with the entrypoint post-signature
    bad = pkg.update(entrypoint="rm -rf /")
    vetter = InMemoryTrustStoreSkillVetter()
    vetter.add(key.public_key())
    with pytest.raises(SkillSignatureInvalid):
        await vetter.vet(bad)


# LocalTrustStoreSkillVetter ---------------------------------------------------


@pytest.mark.asyncio
async def test_local_trust_store_vetter_accepts(tmp_path: Path) -> None:
    key = _new_key()
    key_id = public_key_id(key.public_key())
    (tmp_path / f"{key_id}.pub.pem").write_bytes(public_key_to_pem(key.public_key()))

    vetter = LocalTrustStoreSkillVetter(trust_dir=str(tmp_path))
    await vetter.vet(_signed_package(key))


@pytest.mark.asyncio
async def test_local_trust_store_rejects_wrong_filename(tmp_path: Path) -> None:
    key = _new_key()
    # write the key with a wrong filename
    (tmp_path / "deadbeef.pub.pem").write_bytes(public_key_to_pem(key.public_key()))
    vetter = LocalTrustStoreSkillVetter(trust_dir=str(tmp_path))
    with pytest.raises(SkillSignerUntrusted):
        await vetter.vet(_signed_package(key))


@pytest.mark.asyncio
async def test_local_trust_store_rejects_missing_key(tmp_path: Path) -> None:
    key = _new_key()
    vetter = LocalTrustStoreSkillVetter(trust_dir=str(tmp_path))
    with pytest.raises(SkillSignerUntrusted):
        await vetter.vet(_signed_package(key))


# NoOpSkillVetter --------------------------------------------------------------


@pytest.mark.asyncio
async def test_noop_vetter_accepts_everything() -> None:
    pkg = SkillPackage.create(
        tenant_id=UUID(int=1),
        workspace_id=UUID(int=2),
        name="x",
        version="1.0.0",
        description="",
        entrypoint="python -m x",
        image="ghcr.io/x:1",
    )
    await NoOpSkillVetter().vet(pkg)


# assert_image_digest_matches --------------------------------------------------


def test_assert_image_digest_matches_passes_on_equal() -> None:
    assert_image_digest_matches("sha256:" + "a" * 64, "sha256:" + "a" * 64)


def test_assert_image_digest_matches_detects_swap() -> None:
    with pytest.raises(SkillImageDigestMismatch):
        assert_image_digest_matches("sha256:" + "a" * 64, "sha256:" + "b" * 64)


def test_assert_image_digest_matches_rejects_tag_ref() -> None:
    with pytest.raises(SkillImageDigestMismatch):
        assert_image_digest_matches("ghcr.io/x:latest", "sha256:" + "a" * 64)


def test_assert_image_digest_matches_rejects_bad_expected() -> None:
    with pytest.raises(SkillImageDigestMismatch):
        assert_image_digest_matches("sha256:" + "a" * 64, "md5:" + "b" * 32)
