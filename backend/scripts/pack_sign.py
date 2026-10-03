#!/usr/bin/env python
"""Sign a pack directory and write ``signature.json``.

Reads ``<pack_dir>/manifest.json``, builds the canonical payload for
the chosen pack kind, signs it with the supplied Ed25519 private key,
and writes ``<pack_dir>/signature.json`` of the form
``{"signature": <b64>, "signer_key_id": <hex>}``.  Existing
``signature.json`` files are overwritten — re-run after any manifest
change.

Subcommands (chosen by positional argument ``KIND``):

* ``plan``      — 7-field :class:`PlanPackPayload`

Sandbox skill / knowledge packs are retired; catalog items are managed
via ``/api/admin/skills`` and ``/api/admin/knowledge``.

Usage::

    python scripts/pack_sign.py plan packs/office/plans/pl.office.weekly_digest \\
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
sys.path.insert(0, str(_REPO_ROOT / "libs" / "pack_signing" / "src"))

from deos.modules.orchestration.domain.signing import (  # noqa: E402
    PlanPackPayload,
)
from deos.modules.orchestration.domain.signing import (  # noqa: E402
    sign_payload as sign_plan_payload,
)
from eos_pack_signing import (  # noqa: E402
    load_private_key_pem,
    public_key_id,
)

_PLAN_REQUIRED_FIELDS = (
    "name",
    "version",
    "description",
    "plan_dsl",
    "allowed_tenants",
    "schedule",
    "default_timeout_seconds",
)


def _build_plan_payload(manifest: dict[str, Any]) -> PlanPackPayload:
    missing = [f for f in _PLAN_REQUIRED_FIELDS if f not in manifest]
    if missing:
        raise ValueError(f"manifest missing required field(s): {', '.join(sorted(missing))}")
    tenants_raw = manifest["allowed_tenants"] or []
    if not isinstance(tenants_raw, list):
        raise TypeError("allowed_tenants must be a list")
    plan_dsl = manifest["plan_dsl"]
    if not isinstance(plan_dsl, dict):
        raise TypeError("plan_dsl must be an object")
    return PlanPackPayload(
        name=str(manifest["name"]),
        version=str(manifest["version"]),
        description=str(manifest["description"]),
        plan_dsl=dict(plan_dsl),
        allowed_tenants=tuple(str(t) for t in tenants_raw),
        schedule=str(manifest["schedule"]),
        default_timeout_seconds=int(manifest["default_timeout_seconds"]),
    )


_BUILDERS = {
    "plan": _build_plan_payload,
}

_SIGNERS = {
    "plan": sign_plan_payload,
}


def _sign_kind(kind: str, manifest: dict[str, Any], *, private_key: Ed25519PrivateKey) -> str:
    payload = _BUILDERS[kind](manifest)
    return _SIGNERS[kind](payload, private_key=private_key)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "kind",
        choices=("plan",),
        help="pack kind (decides which canonical fields to commit to)",
    )
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

    priv_key_path: Path = args.priv_key.expanduser().resolve()
    if not priv_key_path.is_file():
        print(f"error: private key {priv_key_path} not found", file=sys.stderr)
        return 2
    priv_key: Ed25519PrivateKey = load_private_key_pem(priv_key_path.read_bytes())

    try:
        signature_b64 = _sign_kind(args.kind, manifest, private_key=priv_key)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

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
