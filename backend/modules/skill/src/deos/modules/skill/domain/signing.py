"""Skill Pack digital-signature payload definition + pack-specific adapters.

The generic Ed25519 / canonical-JSON / PEM helpers live in
``eos_pack_signing`` (shared with Knowledge and Plan pack vetters).
This module keeps only the **Skill-specific** parts:

* :data:`_CANONICAL_FIELDS` — the 12 fields the signature commits to.
* :class:`SkillPackPayload` — the structured data a vetter signs / verifies.
* :func:`canonical_payload` / :func:`sign_payload` / :func:`verify_signature`
  — thin adapters that take a ``SkillPackPayload`` and call into
  ``eos_pack_signing.canonical``.

Why Ed25519 and not RSA-PSS / ECDSA-P256?
-----------------------------------------
Cosign / sigstore use ECDSA-P256 to interop with KMS systems; we keep
Ed25519 here because no KMS round-trip is needed for the dev / staging
trust store and 64-byte signatures cut bandwidth on every registration.
A future ADR can swap to ECDSA-P256 if KMS signing is required.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Final, Mapping

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from eos_pack_signing import (
    canonical_payload as _canonical_bytes,
    sign_payload as _sign_bytes,
    verify_signature as _verify_bytes,
)

# Fields covered by the signature. Order is fixed — clients MUST build
# the canonical payload via :func:`canonical_payload` so verification
# is reproducible across SDK versions.
_CANONICAL_FIELDS: Final[tuple[str, ...]] = (
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


@dataclass(slots=True, frozen=True)
class SkillPackPayload:
    """The structured data a vetter signs / verifies."""

    name: str
    version: str
    description: str
    entrypoint: str
    image: str
    image_digest: str
    parameters_schema: dict
    artifact_uri: str
    network_policy: str
    cpu_quota: float | None
    memory_bytes: int | None
    timeout_seconds: int


def _payload_as_dict(p: SkillPackPayload) -> Mapping[str, Any]:
    return {f: getattr(p, f) for f in _CANONICAL_FIELDS}


def canonical_payload(p: SkillPackPayload) -> bytes:
    """Deterministic UTF-8 JSON encoding — same input ⇒ same bytes."""
    return _canonical_bytes(_payload_as_dict(p))


def payload_digest(p: SkillPackPayload) -> str:
    """``sha256:<hex>`` over :func:`canonical_payload` — useful for logging."""
    import hashlib

    digest = hashlib.sha256(canonical_payload(p)).hexdigest()
    return f"sha256:{digest}"


def sign_payload(p: SkillPackPayload, *, private_key: Ed25519PrivateKey) -> str:
    """Sign the canonical payload; return the base64-encoded signature."""
    return _sign_bytes(_payload_as_dict(p), private_key=private_key)


def verify_signature(
    p: SkillPackPayload, *, signature_b64: str, public_key: Ed25519PublicKey
) -> None:
    """Raise :class:`InvalidSignature` on any mismatch (bad sig / tampered fields)."""
    _verify_bytes(
        _payload_as_dict(p), signature_b64=signature_b64, public_key=public_key
    )


__all__ = [
    "SkillPackPayload",
    "canonical_payload",
    "payload_digest",
    "sign_payload",
    "verify_signature",
]