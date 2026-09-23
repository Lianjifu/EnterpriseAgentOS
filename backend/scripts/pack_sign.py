#!/usr/bin/env python
"""Sign a skill-pack directory and write ``signature.json``.

Reads ``<pack_dir>/manifest.json``, builds the canonical 12-field
:class:`SkillPackPayload`, signs it with the supplied Ed25519 private
key, and writes ``<pack_dir>/signature.json`` of the form
``{"signature": <b64>, "signer_key_id": <hex>}``.  Existing
``signature.json`` files are overwritten — re-run after any manifest
change.

Manifest requirements::

    name, version, description, entrypoint, image, image_digest,
    parameters_schema, artifact_uri, network_policy, cpu_quota,
    memory_bytes, timeout_seconds

Missing fields abort with a non-zero exit code so CI catches drift
between ``manifest.json`` and the canonical schema.

Usage::

    python scripts/pack_sign.py packs/office/skills/skp.office.email_triage \\
        -k .eos/skill-trust/eos-office-dev.priv.pem
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

_REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_REPO_ROOT))

from deos.modules.skill.domain.signing import (  # noqa: E402
    SkillPackPayload,
    load_private_key_pem,
    public_key_id,
    sign_payload,
)

_REQUIRED_FIELDS = (
    "name",
    "version",
    "description",
    "entrypoint",
    "image",
    "image_digest",
    "parameters_schema",
    "artifact_uri",
    "network_policy",
    "cpu_quota",
    "memory_bytes",
    "timeout_seconds",
)


def _build_payload(manifest: dict[str, Any]) -> SkillPackPayload:
    missing = [f for f in _REQUIRED_FIELDS if f not in manifest]
    if missing:
        raise ValueError(
            f"manifest missing required field(s): {', '.join(sorted(missing))}"
        )
    return SkillPackPayload(
        name=str(manifest["name"]),
        version=str(manifest["version"]),
        description=str(manifest["description"]),
        entrypoint=str(manifest["entrypoint"]),
        image=str(manifest["image"]),
        image_digest=str(manifest["image_digest"]),
        parameters_schema=dict(manifest["parameters_schema"] or {}),
        artifact_uri=str(manifest["artifact_uri"]),
        network_policy=str(manifest["network_policy"]),
        cpu_quota=(
            float(manifest["cpu_quota"]) if manifest["cpu_quota"] is not None else None
        ),
        memory_bytes=(
            int(manifest["memory_bytes"])
            if manifest["memory_bytes"] is not None
            else None
        ),
        timeout_seconds=int(manifest["timeout_seconds"]),
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "pack_dir",
        type=Path,
        help="pack directory containing manifest.json",
    )
    parser.add_argument(
        "-k",
        "--priv-key",
        required=True,
        type=Path,
        help="PEM-encoded Ed25519 private key (unencrypted)",
    )
    args = parser.parse_args()

    pack_dir: Path = args.pack_dir.expanduser().resolve()
    if not pack_dir.is_dir():
        print(f"error: pack dir {pack_dir} not found", file=sys.stderr)
        return 2

    manifest_path = pack_dir / "manifest.json"
    if not manifest_path.is_file():
        print(f"error: {manifest_path} not found", file=sys.stderr)
        return 2

    manifest = json.loads(manifest_path.read_text())
    try:
        payload = _build_payload(manifest)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    priv_key_path: Path = args.priv_key.expanduser().resolve()
    if not priv_key_path.is_file():
        print(f"error: private key {priv_key_path} not found", file=sys.stderr)
        return 2
    priv_key: Ed25519PrivateKey = load_private_key_pem(priv_key_path.read_bytes())
    signature_b64 = sign_payload(payload, private_key=priv_key)
    key_id = public_key_id(priv_key.public_key())

    signature_path = pack_dir / "signature.json"
    signature_path.write_text(
        json.dumps(
            {"signature": signature_b64, "signer_key_id": key_id},
            indent=2,
            sort_keys=True,
        )
        + "\n"
    )
    print(f"wrote {signature_path} (signer_key_id={key_id})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
