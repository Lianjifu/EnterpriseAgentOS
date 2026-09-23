"""Knowledge Vetter — verify a pack before registration.

The Vetter is the single gate every ``KnowledgePackage`` passes through
on its way into the system.  It is responsible for:

1. Looking up the signing public key in the workspace trust store by
   ``signer_key_id`` — :class:`KnowledgeSignerUntrusted` if not found.
2. Verifying the Ed25519 signature over the canonical payload —
   :class:`KnowledgeSignatureInvalid` on any mismatch.

The generic Ed25519 plumbing lives in ``eos_pack_signing``; this file
mirrors the SkillVetter split (NoOp / InMemory / LocalTrustStore).

Why a Protocol and not a concrete class?
----------------------------------------
The composition root wires the Vetter based on environment:

* :class:`LocalTrustStoreKnowledgeVetter` (dev / staging) reads PEM keys
  from ``EOS_KNOWLEDGE_TRUST_DIR`` via ``eos_pack_signing.scan_trust_dir``.
* :class:`NoOpKnowledgeVetter` is provided for tests / ``disabled`` mode.
* :class:`InMemoryTrustStoreKnowledgeVetter` for test-time key injection.
"""

from __future__ import annotations

import abc
from collections.abc import Mapping
from pathlib import Path

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from eos_pack_signing import public_key_id, scan_trust_dir

from deos.modules.knowledge.domain.entities import KnowledgePackage
from deos.modules.knowledge.domain.errors import (
    KnowledgeSignatureInvalid,
    KnowledgeSignerUntrusted,
)
from deos.modules.knowledge.domain.signing import (
    KnowledgePackPayload,
    verify_signature,
)

__all__ = [
    "LocalTrustStoreKnowledgeVetter",
    "NoOpKnowledgeVetter",
    "KnowledgeVetter",
    "InMemoryTrustStoreKnowledgeVetter",
]


class KnowledgeVetter(abc.ABC):
    """Port — every implementation must be idempotent and side-effect free."""

    @abc.abstractmethod
    async def vet(self, package: KnowledgePackage) -> None:
        """Verify ``package``.  Raise on failure; return ``None`` on success."""


def _payload_of(p: KnowledgePackage) -> KnowledgePackPayload:
    # ``asset_ids`` is a tuple[str, ...] in the canonical payload but
    # currently not part of the entity — we hash the *sorted* set so an
    # out-of-order pack still canonicalizes deterministically.
    metadata = dict(p.metadata or {})
    asset_ids: tuple[str, ...] = tuple(sorted(str(x) for x in metadata.get("asset_ids", ())))
    return KnowledgePackPayload(
        name=p.name,
        version=str(metadata.get("version", p.name)),
        description=p.description,
        chunking_strategy=str(metadata.get("chunking_strategy", "fixed")),
        embedding_model=str(metadata.get("embedding_model", "text-embedding-3-small")),
        asset_ids=asset_ids,
        refresh_policy=str(metadata.get("refresh_policy", "never")),
        network_policy=str(metadata.get("network_policy", "default")),
    )


class LocalTrustStoreKnowledgeVetter(KnowledgeVetter):
    """Trust store = a directory of PEM files named ``<key_id>.pub.pem``.

    Eager-scans at construction — empty / missing dir → fail-loud.
    """

    def __init__(
        self,
        *,
        trust_dir: str | Path,
        require_signature: bool = True,
    ) -> None:
        self._trust_dir = Path(trust_dir)
        self._require_signature = require_signature
        self._keys: dict[str, Ed25519PublicKey] = scan_trust_dir(
            self._trust_dir,
            label="knowledge",
            signer_untrusted_exc=KnowledgeSignerUntrusted,
        )

    @property
    def trust_dir(self) -> Path:
        return self._trust_dir

    @property
    def trust_key_count(self) -> int:
        return len(self._keys)

    async def vet(self, package: KnowledgePackage) -> None:
        if not package.signature:
            if self._require_signature:
                raise KnowledgeSignatureInvalid(
                    f"knowledge pack {package.name} has no signature"
                )
            return
        key = self._keys.get(package.signer_key_id)
        if key is None:
            raise KnowledgeSignerUntrusted(
                f"signing key {package.signer_key_id!r} not in trust store "
                f"{self._trust_dir}"
            )
        try:
            verify_signature(
                _payload_of(package),
                signature_b64=package.signature,
                public_key=key,
            )
        except InvalidSignature as exc:
            raise KnowledgeSignatureInvalid(
                f"signature for knowledge pack {package.name} failed verification"
            ) from exc


class InMemoryTrustStoreKnowledgeVetter(KnowledgeVetter):
    """In-memory trust store — handy for tests and the no-fs dev case."""

    def __init__(
        self,
        *,
        keys: Mapping[str, Ed25519PublicKey] | None = None,
        require_signature: bool = True,
    ) -> None:
        self._keys: dict[str, Ed25519PublicKey] = dict(keys or {})
        self._require_signature = require_signature

    @property
    def trust_key_count(self) -> int:
        return len(self._keys)

    def add(self, key: Ed25519PublicKey) -> str:
        kid = public_key_id(key)
        self._keys[kid] = key
        return kid

    async def vet(self, package: KnowledgePackage) -> None:
        if not package.signature:
            if self._require_signature:
                raise KnowledgeSignatureInvalid(
                    f"knowledge pack {package.name} has no signature"
                )
            return
        key = self._keys.get(package.signer_key_id)
        if key is None:
            raise KnowledgeSignerUntrusted(
                f"signing key {package.signer_key_id!r} not in trust store"
            )
        try:
            verify_signature(
                _payload_of(package),
                signature_b64=package.signature,
                public_key=key,
            )
        except InvalidSignature as exc:
            raise KnowledgeSignatureInvalid(
                f"signature for knowledge pack {package.name} failed verification"
            ) from exc


class NoOpKnowledgeVetter(KnowledgeVetter):
    """Accept every pack — only for ``disabled`` mode and unit tests."""

    async def vet(self, package: KnowledgePackage) -> None:
        return None