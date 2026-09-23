"""A6 — tests for ``scripts/pack_sign.py`` CLI.

The CLI is a thin wrapper over ``SkillPackPayload`` /
:func:`sign_payload`; these tests pin the canonical-payload contract
(``pack_sign.py`` MUST reuse the A2 helper, not reimplement the JSON
serialisation) and exercise the failure modes that CI cares about.
"""

from __future__ import annotations

import base64
import json
import subprocess
import sys
from pathlib import Path

import pytest
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from deos.modules.skill.domain.signing import (
    SkillPackPayload,
    canonical_payload,
    load_private_key_pem,
    load_public_key_pem,
    private_key_to_pem,
    public_key_id,
    public_key_to_pem,
    verify_signature,
)

_REPO_ROOT = Path(__file__).resolve().parents[4]
_SCRIPT = _REPO_ROOT / "scripts" / "pack_sign.py"


def _write_manifest(pack_dir: Path, *, include_image_digest: bool = True) -> None:
    pack_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "name": "test-pack",
        "version": "1.0.0",
        "description": "demo",
        "entrypoint": "entrypoint.main",
        "image": "sha256:" + "a" * 64,
        "image_digest": "sha256:" + "b" * 64,
        "parameters_schema": {"type": "object"},
        "artifact_uri": "",
        "network_policy": "default",
        "cpu_quota": 0.5,
        "memory_bytes": 64 * 1024 * 1024,
        "timeout_seconds": 15,
    }
    if not include_image_digest:
        manifest.pop("image_digest")
    (pack_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True)
    )


def _write_key(tmp_path: Path) -> tuple[Path, Ed25519PrivateKey]:
    key = Ed25519PrivateKey.generate()
    priv_path = tmp_path / "priv.pem"
    priv_path.write_bytes(private_key_to_pem(key))
    return priv_path, key


def test_pack_sign_writes_signature_and_verifies(tmp_path: Path) -> None:
    """Happy path: ``pack_sign.py`` writes a valid ``signature.json``
    whose bytes round-trip through :func:`verify_signature`."""
    pack_dir = tmp_path / "pack"
    _write_manifest(pack_dir)
    priv_path, key = _write_key(tmp_path)

    result = subprocess.run(
        [
            sys.executable,
            str(_SCRIPT),
            str(pack_dir),
            "-k",
            str(priv_path),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
    sig_path = pack_dir / "signature.json"
    assert sig_path.is_file()

    sig_doc = json.loads(sig_path.read_text())
    assert "signature" in sig_doc
    assert "signer_key_id" in sig_doc
    assert sig_doc["signer_key_id"] == public_key_id(key.public_key())

    # Decode + verify with the same public key.
    sig_bytes = base64.b64decode(sig_doc["signature"])
    manifest = json.loads((pack_dir / "manifest.json").read_text())
    payload = SkillPackPayload(
        name=manifest["name"],
        version=manifest["version"],
        description=manifest["description"],
        entrypoint=manifest["entrypoint"],
        image=manifest["image"],
        image_digest=manifest["image_digest"],
        parameters_schema=manifest["parameters_schema"],
        artifact_uri=manifest["artifact_uri"],
        network_policy=manifest["network_policy"],
        cpu_quota=manifest["cpu_quota"],
        memory_bytes=manifest["memory_bytes"],
        timeout_seconds=manifest["timeout_seconds"],
    )
    key.public_key().verify(sig_bytes, canonical_payload(payload))


def test_pack_sign_tampered_manifest_fails_verification(tmp_path: Path) -> None:
    """Editing the manifest after signing breaks verification — pins
    that ``pack_sign.py`` produces a signature that covers all 12
    canonical fields."""
    pack_dir = tmp_path / "pack"
    _write_manifest(pack_dir)
    priv_path, key = _write_key(tmp_path)

    result = subprocess.run(
        [sys.executable, str(_SCRIPT), str(pack_dir), "-k", str(priv_path)],
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0

    # Tamper: bump version field, leave signature unchanged.
    manifest_path = pack_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["version"] = "9.9.9"
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True))

    sig_doc = json.loads((pack_dir / "signature.json").read_text())
    pub_key = key.public_key()
    payload = SkillPackPayload(
        name=manifest["name"],
        version=manifest["version"],
        description=manifest["description"],
        entrypoint=manifest["entrypoint"],
        image=manifest["image"],
        image_digest=manifest["image_digest"],
        parameters_schema=manifest["parameters_schema"],
        artifact_uri=manifest["artifact_uri"],
        network_policy=manifest["network_policy"],
        cpu_quota=manifest["cpu_quota"],
        memory_bytes=manifest["memory_bytes"],
        timeout_seconds=manifest["timeout_seconds"],
    )
    with pytest.raises(InvalidSignature):
        verify_signature(
            payload,
            signature_b64=sig_doc["signature"],
            public_key=pub_key,
        )


def test_pack_sign_rejects_manifest_missing_required_field(tmp_path: Path) -> None:
    pack_dir = tmp_path / "pack"
    _write_manifest(pack_dir, include_image_digest=False)
    priv_path, _ = _write_key(tmp_path)

    result = subprocess.run(
        [sys.executable, str(_SCRIPT), str(pack_dir), "-k", str(priv_path)],
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    assert "image_digest" in result.stderr or "missing" in result.stderr.lower()


def test_pack_sign_overwrites_existing_signature(tmp_path: Path) -> None:
    """Re-running the CLI replaces the old signature.json — defends
    against stale signatures after a manifest edit."""
    pack_dir = tmp_path / "pack"
    _write_manifest(pack_dir)
    priv_path, _ = _write_key(tmp_path)
    subprocess.run(
        [sys.executable, str(_SCRIPT), str(pack_dir), "-k", str(priv_path)],
        check=True,
        capture_output=True,
    )
    first_sig = (pack_dir / "signature.json").read_text()

    # Touch the manifest and re-sign.
    manifest_path = pack_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["description"] = "updated"
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True))
    subprocess.run(
        [sys.executable, str(_SCRIPT), str(pack_dir), "-k", str(priv_path)],
        check=True,
        capture_output=True,
    )
    second_sig = (pack_dir / "signature.json").read_text()
    assert second_sig != first_sig


def test_pack_sign_uses_canonical_payload_helper(tmp_path: Path) -> None:
    """The signature bytes must match what ``canonical_payload`` would
    produce — pins that the CLI does not reimplement the JSON encoder."""
    pack_dir = tmp_path / "pack"
    _write_manifest(pack_dir)
    priv_path, key = _write_key(tmp_path)

    result = subprocess.run(
        [sys.executable, str(_SCRIPT), str(pack_dir), "-k", str(priv_path)],
        check=True,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0

    sig_doc = json.loads((pack_dir / "signature.json").read_text())
    manifest = json.loads((pack_dir / "manifest.json").read_text())

    payload = SkillPackPayload(
        name=manifest["name"],
        version=manifest["version"],
        description=manifest["description"],
        entrypoint=manifest["entrypoint"],
        image=manifest["image"],
        image_digest=manifest["image_digest"],
        parameters_schema=manifest["parameters_schema"],
        artifact_uri=manifest["artifact_uri"],
        network_policy=manifest["network_policy"],
        cpu_quota=manifest["cpu_quota"],
        memory_bytes=manifest["memory_bytes"],
        timeout_seconds=manifest["timeout_seconds"],
    )
    expected = key.sign(canonical_payload(payload))
    assert base64.b64decode(sig_doc["signature"]) == expected


def test_pack_trust_seed_copies_pub_with_canonical_filename(tmp_path: Path) -> None:
    """``pack_trust_seed.py`` writes ``<key_id>.pub.pem`` — the same
    filename shape :class:`LocalTrustStoreSkillVetter` expects."""
    pub_path = tmp_path / "anyname.pub.pem"
    trust_dir = tmp_path / "trust"
    key = Ed25519PrivateKey.generate()
    pub_path.write_bytes(public_key_to_pem(key.public_key()))

    result = subprocess.run(
        [
            sys.executable,
            str(_REPO_ROOT / "scripts" / "pack_trust_seed.py"),
            str(pub_path),
            str(trust_dir),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0
    expected = trust_dir / f"{public_key_id(key.public_key())}.pub.pem"
    assert expected.is_file()
    # And the bytes match the original pub key (defends against copy corruption).
    assert load_public_key_pem(expected.read_bytes()).public_bytes(
        __import__("cryptography").hazmat.primitives.serialization.Encoding.PEM,
        __import__("cryptography").hazmat.primitives.serialization.PublicFormat.SubjectPublicKeyInfo,
    ) == public_key_to_pem(key.public_key())


def test_pack_sign_rejects_missing_priv_key(tmp_path: Path) -> None:
    """Missing priv key is a clean exit code 2 (CLI contract)."""
    pack_dir = tmp_path / "pack"
    _write_manifest(pack_dir)
    missing_priv = tmp_path / "no-such-key.pem"
    result = subprocess.run(
        [sys.executable, str(_SCRIPT), str(pack_dir), "-k", str(missing_priv)],
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 2


def test_pack_sign_rejects_missing_pack_dir(tmp_path: Path) -> None:
    """Missing pack dir is a clean exit code 2 (CLI contract)."""
    priv_path, _ = _write_key(tmp_path)
    missing_pack = tmp_path / "no-such-pack"
    result = subprocess.run(
        [sys.executable, str(_SCRIPT), str(missing_pack), "-k", str(priv_path)],
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 2


def test_dev_signing_keygen_writes_keypair_and_prints_key_id(tmp_path: Path) -> None:
    """``dev_signing_keygen.py`` outputs ``<prefix>.priv.pem`` +
    ``<prefix>.pub.pem`` and prints the canonical key_id."""
    out_dir = tmp_path / "out"
    prefix = "eos-test"
    result = subprocess.run(
        [
            sys.executable,
            str(_REPO_ROOT / "scripts" / "dev_signing_keygen.py"),
            "-o",
            str(out_dir),
            "-p",
            prefix,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0
    priv = out_dir / f"{prefix}.priv.pem"
    pub = out_dir / f"{prefix}.pub.pem"
    assert priv.is_file()
    assert pub.is_file()
    # The script prints signer_key_id=<hex> on stdout.
    assert "signer_key_id=" in result.stdout
    # Load + cross-check.
    priv_key = load_private_key_pem(priv.read_bytes())
    expected_id = public_key_id(priv_key.public_key())
    assert expected_id in result.stdout
    # Pub key is loadable and has the same key_id.
    loaded_pub = load_public_key_pem(pub.read_bytes())
    assert public_key_id(loaded_pub) == expected_id