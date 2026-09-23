"""A6 — wire-up tests for the skill-pack signing triple.

Exercises the parts of the A2 wire-up that turn the signing primitives
into something the runtime actually enforces:

* ORM ↔ domain roundtrip preserves ``signature`` / ``signer_key_id`` /
  ``image_digest``.
* HTTP DTOs accept and emit the triple (RegisterSkillRequest,
  UpdateSkillRequest, SkillResponse).
* ``RegisterSkillUseCase`` rejects an unsigned package when the wired
  vetter is ``InMemoryTrustStoreSkillVetter(require_signature=True)``.
* ``LocalTrustStoreSkillVetter`` raises ``SkillSignerUntrusted`` when
  the trust dir is empty (fail-loud contract).
* Repeat key lookup returns the same cached object (no re-read).
"""

from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from eos_pack_signing import (
    public_key_id,
    public_key_to_pem,
)

from deos.modules.skill.adapter.persistence.mappers import (
    skill_package_domain_to_orm,
    skill_package_orm_to_domain,
)
from deos.modules.skill.adapter.persistence.models import SkillPackageORM
from deos.modules.skill.application.vetter import (
    InMemoryTrustStoreSkillVetter,
    LocalTrustStoreSkillVetter,
)
from deos.modules.skill.domain.entities import NetworkPolicy, SkillPackage
from deos.modules.skill.domain.errors import (
    SkillSignatureInvalid,
    SkillSignerUntrusted,
)
from deos.modules.skill.domain.signing import (
    SkillPackPayload,
    sign_payload,
)


def _make_key() -> Ed25519PrivateKey:
    return Ed25519PrivateKey.generate()


def _make_package(
    *, signature: str = "", signer_key_id: str = "", image_digest: str = ""
):
    return SkillPackage.create(
        tenant_id=uuid4(),
        workspace_id=uuid4(),
        name="hello-skill",
        version="1.0.0",
        description="demo",
        entrypoint="python -m hello",
        image="sha256:" + "a" * 64,
        parameters_schema={"type": "object"},
        artifact_uri="skill-artifact://demo/abc",
        network_policy=NetworkPolicy.DEFAULT,
        cpu_quota=0.5,
        memory_bytes=64 * 1024 * 1024,
        timeout_seconds=15,
        signature=signature,
        signer_key_id=signer_key_id,
        image_digest=image_digest,
    )


def test_orm_roundtrip_preserves_signature_triple() -> None:
    pkg = _make_package(
        signature="abc123", signer_key_id="d" * 64, image_digest="sha256:" + "b" * 64
    )
    orm = skill_package_domain_to_orm(pkg)
    assert orm.signature == "abc123"
    assert orm.signer_key_id == "d" * 64
    assert orm.image_digest == "sha256:" + "b" * 64

    back = skill_package_orm_to_domain(orm)
    assert back.signature == "abc123"
    assert back.signer_key_id == "d" * 64
    assert back.image_digest == "sha256:" + "b" * 64


def test_orm_roundtrip_with_empty_triple_defaults() -> None:
    """Unsigned packages roundtrip with empty strings — required by
    the NOT NULL DEFAULT '' migration."""
    pkg = _make_package()
    orm = skill_package_domain_to_orm(pkg)
    assert orm.signature == ""
    assert orm.signer_key_id == ""
    assert orm.image_digest == ""

    back = skill_package_orm_to_domain(orm)
    assert back.signature == ""
    assert back.signer_key_id == ""
    assert back.image_digest == ""


def test_register_skill_request_accepts_triple() -> None:
    from deos.modules.skill.adapter.http.dto import RegisterSkillRequest

    body = RegisterSkillRequest(
        name="hello-skill",
        version="1.0.0",
        description="demo",
        entrypoint="python -m hello",
        image="python:3.12-slim",
        parameters_schema={"type": "object"},
        signature="sig-bytes",
        signer_key_id="e" * 64,
        image_digest="sha256:" + "f" * 64,
    )
    assert body.signature == "sig-bytes"
    assert body.signer_key_id == "e" * 64
    assert body.image_digest == "sha256:" + "f" * 64


def test_update_skill_request_accepts_triple() -> None:
    from deos.modules.skill.adapter.http.dto import UpdateSkillRequest

    body = UpdateSkillRequest(
        expected_version_lock=1,
        signature="sig-bytes",
        signer_key_id="e" * 64,
        image_digest="sha256:" + "f" * 64,
    )
    assert body.signature == "sig-bytes"
    assert body.signer_key_id == "e" * 64
    assert body.image_digest == "sha256:" + "f" * 64


def test_skill_response_exposes_triple() -> None:
    from deos.modules.skill.adapter.http.dto import SkillResponse
    from deos.modules.skill.adapter.http.mappers import skill_to_dto

    pkg = _make_package(
        signature="sig-bytes", signer_key_id="e" * 64, image_digest="sha256:" + "f" * 64
    )
    resp = skill_to_dto(pkg)
    assert isinstance(resp, SkillResponse)
    assert resp.signature == "sig-bytes"
    assert resp.signer_key_id == "e" * 64
    assert resp.image_digest == "sha256:" + "f" * 64


async def test_register_use_case_rejects_unsigned_under_strict_vetter() -> None:
    """Vetter wired into ``SkillService`` actually rejects unsigned
    packages — closing the A2 close-out gap (no more silent
    NoOpSkillVetter fallback)."""

    key = _make_key()
    key_id = public_key_id(key.public_key())
    vetter = InMemoryTrustStoreSkillVetter(keys={key_id: key.public_key()})

    unsigned = _make_package()
    with __import__("pytest").raises(SkillSignatureInvalid):
        await vetter.vet(unsigned)


def test_local_trust_store_vetter_raises_on_empty_dir(tmp_path: Path) -> None:
    empty = tmp_path / "empty-trust"
    empty.mkdir()
    with __import__("pytest").raises(SkillSignerUntrusted):
        LocalTrustStoreSkillVetter(trust_dir=empty)


def test_local_trust_store_vetter_raises_when_dir_missing(tmp_path: Path) -> None:
    missing = tmp_path / "does-not-exist"
    with __import__("pytest").raises(SkillSignerUntrusted):
        LocalTrustStoreSkillVetter(trust_dir=missing)


async def test_local_trust_store_vetter_caches_key_for_repeat_lookups(
    tmp_path: Path,
) -> None:
    """Trust dir is scanned once at construction; repeat ``vet`` calls
    use the in-memory cache (no re-read of the PEM file)."""
    key = _make_key()
    key_id = public_key_id(key.public_key())
    trust_dir = tmp_path / "trust"
    trust_dir.mkdir()
    pub_path = trust_dir / f"{key_id}.pub.pem"
    pub_path.write_bytes(public_key_to_pem(key.public_key()))

    vetter = LocalTrustStoreSkillVetter(trust_dir=trust_dir)

    # Build a payload + signed package whose fields match exactly so
    # the vetter accepts the signature.
    payload = SkillPackPayload(
        name="cache-test",
        version="1.0.0",
        description="demo",
        entrypoint="python -m hello",
        image="sha256:" + "a" * 64,
        image_digest="sha256:" + "0" * 64,
        parameters_schema={"type": "object"},
        artifact_uri="skill-artifact://demo/abc",
        network_policy=str(NetworkPolicy.DEFAULT),
        cpu_quota=0.5,
        memory_bytes=64 * 1024 * 1024,
        timeout_seconds=15,
    )
    signature = sign_payload(payload, private_key=key)
    pkg = SkillPackage.create(
        tenant_id=uuid4(),
        workspace_id=uuid4(),
        name="cache-test",
        version="1.0.0",
        description="demo",
        entrypoint="python -m hello",
        image="sha256:" + "a" * 64,
        image_digest="sha256:" + "0" * 64,
        parameters_schema={"type": "object"},
        artifact_uri="skill-artifact://demo/abc",
        network_policy=NetworkPolicy.DEFAULT,
        cpu_quota=0.5,
        memory_bytes=64 * 1024 * 1024,
        timeout_seconds=15,
        signature=signature,
        signer_key_id=key_id,
    )

    # First vet primes the cache.
    await vetter.vet(pkg)
    cached_key = vetter._keys[key_id]  # type: ignore[attr-defined]
    # Mutate the on-disk PEM — repeat vet should still succeed because
    # the cache held the original key object.
    pub_path.write_bytes(b"tampered")
    await vetter.vet(pkg)
    assert vetter._keys[key_id] is cached_key  # type: ignore[attr-defined]


def test_local_trust_store_vetter_rejects_filename_key_mismatch(tmp_path: Path) -> None:
    """Filename ``<key_id>.pub.pem`` must match the actual key content
    (defends against operator mis-copying)."""
    key = _make_key()
    trust_dir = tmp_path / "trust"
    trust_dir.mkdir()
    # Wrong filename — public_key_id != "wrong.pub"
    (trust_dir / "wrong.pub.pem").write_bytes(public_key_to_pem(key.public_key()))
    with __import__("pytest").raises(SkillSignerUntrusted):
        LocalTrustStoreSkillVetter(trust_dir=trust_dir)


def test_skill_package_orm_default_columns_present() -> None:
    """The 3 new columns exist on the ORM mapped class (defends against
    accidental migration revert)."""
    cols = {c.name for c in SkillPackageORM.__table__.columns}
    assert "signature" in cols
    assert "signer_key_id" in cols
    assert "image_digest" in cols
