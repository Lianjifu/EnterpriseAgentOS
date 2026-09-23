"""Knowledge Pack digital-signature payload definition + pack-specific adapters.

Generic Ed25519 / canonical-JSON helpers live in ``eos_pack_signing``.
This module keeps only the **Knowledge-specific** parts:

* :data:`_CANONICAL_FIELDS` — the 8 fields the signature commits to.
* :class:`KnowledgePackPayload` — structured data a vetter signs / verifies.
* :func:`canonical_payload` / :func:`sign_payload` / :func:`verify_signature`
  — thin adapters over ``eos_pack_signing.canonical``.

The signature covers content-addressable concerns of a knowledge pack:
chunking strategy + embedding model (so a swapped embedder can't
silently degrade retrieval), asset_ids (so a published pack can't
later point at different assets without re-signing), refresh_policy
+ network_policy (so a signed pack can't quietly become offline /
egress-allowlisted without re-signing).
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
    "chunking_strategy",
    "embedding_model",
    "asset_ids",
    "refresh_policy",
    "network_policy",
)


@dataclass(slots=True, frozen=True)
class KnowledgePackPayload:
    """The structured data a vetter signs / verifies."""

    name: str
    version: str
    description: str
    chunking_strategy: str
    embedding_model: str
    asset_ids: tuple[str, ...]
    refresh_policy: str
    network_policy: str


def _payload_as_dict(p: KnowledgePackPayload) -> Mapping[str, Any]:
    return {f: getattr(p, f) for f in _CANONICAL_FIELDS}


def canonical_payload(p: KnowledgePackPayload) -> bytes:
    """Deterministic UTF-8 JSON encoding — same input ⇒ same bytes."""
    return _canonical_bytes(_payload_as_dict(p))


def payload_digest(p: KnowledgePackPayload) -> str:
    """``sha256:<hex>`` over :func:`canonical_payload` — useful for logging."""
    import hashlib

    digest = hashlib.sha256(canonical_payload(p)).hexdigest()
    return f"sha256:{digest}"


def sign_payload(p: KnowledgePackPayload, *, private_key: Ed25519PrivateKey) -> str:
    """Sign the canonical payload; return the base64-encoded signature."""
    return _sign_bytes(_payload_as_dict(p), private_key=private_key)


def verify_signature(
    p: KnowledgePackPayload, *, signature_b64: str, public_key: Ed25519PublicKey
) -> None:
    """Raise :class:`InvalidSignature` on any mismatch (bad sig / tampered fields)."""
    _verify_bytes(
        _payload_as_dict(p), signature_b64=signature_b64, public_key=public_key
    )


__all__ = [
    "KnowledgePackPayload",
    "canonical_payload",
    "payload_digest",
    "sign_payload",
    "verify_signature",
]
