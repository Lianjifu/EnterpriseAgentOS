"""Skill Pack digital-signature primitives.

A Skill Pack is registered with three signing-related fields:

* ``signature``         — base64-encoded Ed25519 signature over the
                          canonical payload (see ``_CANONICAL_FIELDS``).
* ``signer_key_id``     — opaque identifier (typically the SHA-256 of
                          the public key, hex-encoded) the workspace
                          trust store resolves to an Ed25519 verify key.
* ``image_digest``      — ``sha256:<hex>`` digest of the container
                          image that was signed.  Enforced at install
                          time by :class:`SkillVetter`.

We use Ed25519 because (a) signatures are 64 bytes, (b) verification is
constant-time, and (c) it has no curve parameters to embed.  The
``cryptography`` package's ``ed25519`` primitive gives us all three.

Why Ed25519 and not RSA-PSS / ECDSA-P256?
-----------------------------------------
Cosign / sigstore use ECDSA-P256 to interop with KMS systems; we keep
Ed25519 here because no KMS round-trip is needed for the dev / staging
trust store and 64-byte signatures cut bandwidth on every registration.
A future ADR can swap to ECDSA-P256 if KMS signing is required.
"""

from __future__ import annotations

import base64
import hashlib
import json
from dataclasses import dataclass
from typing import Final

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PrivateFormat,
    PublicFormat,
    load_pem_private_key,
    load_pem_public_key,
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


def canonical_payload(p: SkillPackPayload) -> bytes:
    """Deterministic UTF-8 JSON encoding — same input ⇒ same bytes."""
    obj = {f: getattr(p, f) for f in _CANONICAL_FIELDS}
    return json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8")


def payload_digest(p: SkillPackPayload) -> str:
    """``sha256:<hex>`` over :func:`canonical_payload` — useful for logging."""
    digest = hashlib.sha256(canonical_payload(p)).hexdigest()
    return f"sha256:{digest}"


def sign_payload(p: SkillPackPayload, *, private_key: Ed25519PrivateKey) -> str:
    """Sign the canonical payload; return the base64-encoded signature."""
    sig = private_key.sign(canonical_payload(p))
    return base64.b64encode(sig).decode("ascii")


def verify_signature(
    p: SkillPackPayload, *, signature_b64: str, public_key: Ed25519PublicKey
) -> None:
    """Raise :class:`InvalidSignature` on any mismatch (bad sig / tampered fields)."""
    try:
        sig = base64.b64decode(signature_b64.encode("ascii"), validate=True)
    except (ValueError, TypeError) as exc:
        raise InvalidSignature("signature is not valid base64") from exc
    public_key.verify(sig, canonical_payload(p))


# ---------------------------------------------------------------------------
# PEM helpers (PEM is the dev / staging trust-store format; production
# trusts keys via ``eos_vault`` refs and pins them in the DB.)
# ---------------------------------------------------------------------------


def public_key_to_pem(key: Ed25519PublicKey) -> bytes:
    return key.public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo)


def load_public_key_pem(pem: bytes) -> Ed25519PublicKey:
    key = load_pem_public_key(pem)
    if not isinstance(key, Ed25519PublicKey):
        raise TypeError(f"expected Ed25519 public key, got {type(key).__name__}")
    return key


def private_key_to_pem(key: Ed25519PrivateKey) -> bytes:
    return key.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption())


def load_private_key_pem(
    pem: bytes, *, password: bytes | None = None
) -> Ed25519PrivateKey:
    key = load_pem_private_key(pem, password=password)
    if not isinstance(key, Ed25519PrivateKey):
        raise TypeError(f"expected Ed25519 private key, got {type(key).__name__}")
    return key


def public_key_id(key: Ed25519PublicKey) -> str:
    """SHA-256 of the PEM bytes, hex-encoded — used as ``signer_key_id``."""
    pem = public_key_to_pem(key)
    return hashlib.sha256(pem).hexdigest()


__all__ = [
    "SkillPackPayload",
    "canonical_payload",
    "load_private_key_pem",
    "load_public_key_pem",
    "payload_digest",
    "private_key_to_pem",
    "public_key_id",
    "public_key_to_pem",
    "sign_payload",
    "verify_signature",
]
