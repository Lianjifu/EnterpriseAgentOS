"""Plan Pack digital-signature payload definition + pack-specific adapters.

Generic Ed25519 / canonical-JSON helpers live in ``eos_pack_signing``.
This module keeps only the **Plan-specific** parts:

* :data:`_CANONICAL_FIELDS` — the 7 fields the signature commits to.
* :class:`PlanPackPayload` — structured data a vetter signs / verifies.
* :func:`canonical_payload` / :func:`sign_payload` / :func:`verify_signature`
  — thin adapters over ``eos_pack_signing.canonical``.

The signature covers content that defines the plan's runtime behavior:
``plan_dsl`` itself + ``allowed_tenants`` (so a pack published for one
tenant can't silently broaden to others) + ``schedule`` and
``default_timeout_seconds`` (so a signed plan can't quietly become
deadline-free or unbounded without re-signing).
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any, Final

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from eos_pack_signing import (
    canonical_payload as _canonical_bytes,
)
from eos_pack_signing import (
    sign_payload as _sign_bytes,
)
from eos_pack_signing import (
    verify_signature as _verify_bytes,
)

_CANONICAL_FIELDS: Final[tuple[str, ...]] = (
    "name",
    "version",
    "description",
    "plan_dsl",
    "allowed_tenants",
    "schedule",
    "default_timeout_seconds",
)


@dataclass(slots=True, frozen=True)
class PlanPackPayload:
    """The structured data a vetter signs / verifies."""

    name: str
    version: str
    description: str
    plan_dsl: Mapping[str, Any]
    allowed_tenants: tuple[str, ...]
    schedule: str
    default_timeout_seconds: int


def _payload_as_dict(p: PlanPackPayload) -> Mapping[str, Any]:
    return {f: getattr(p, f) for f in _CANONICAL_FIELDS}


def canonical_payload(p: PlanPackPayload) -> bytes:
    """Deterministic UTF-8 JSON encoding — same input ⇒ same bytes."""
    return _canonical_bytes(_payload_as_dict(p))


def payload_digest(p: PlanPackPayload) -> str:
    """``sha256:<hex>`` over :func:`canonical_payload` — useful for logging."""
    import hashlib

    digest = hashlib.sha256(canonical_payload(p)).hexdigest()
    return f"sha256:{digest}"


def sign_payload(p: PlanPackPayload, *, private_key: Ed25519PrivateKey) -> str:
    """Sign the canonical payload; return the base64-encoded signature."""
    return _sign_bytes(_payload_as_dict(p), private_key=private_key)


def verify_signature(
    p: PlanPackPayload, *, signature_b64: str, public_key: Ed25519PublicKey
) -> None:
    """Raise :class:`InvalidSignature` on any mismatch (bad sig / tampered fields)."""
    _verify_bytes(
        _payload_as_dict(p), signature_b64=signature_b64, public_key=public_key
    )


__all__ = [
    "PlanPackPayload",
    "canonical_payload",
    "payload_digest",
    "sign_payload",
    "verify_signature",
]
