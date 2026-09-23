"""Skill Vetter — verify a pack before registration / install.

The Vetter is the single gate every SkillPackage passes through on its
way into the system.  It is responsible for:

1. Looking up the signing public key in the workspace trust store by
   ``signer_key_id`` — :class:`SkillSignerUntrusted` if not found.
2. Verifying the Ed25519 signature over the canonical payload —
   :class:`SkillSignatureInvalid` on any mismatch.
3. Cross-checking the supplied ``image_digest`` against a digest the
   platform can compute (e.g. via the registry on install).  At
   registration time the digest is taken at face value (the caller has
   just pulled the image and computed it locally); install-time
   re-check is performed by :class:`SkillPackRegistry` (out of scope).

Why a Protocol and not a concrete class?
----------------------------------------
The composition root wires the Vetter based on environment:

* :class:`LocalTrustStoreSkillVetter` (dev / staging) reads PEM keys from
  ``EOS_SKILL_TRUST_DIR`` via ``eos_pack_signing.scan_trust_dir``.
* :class:`VaultBackedSkillVetter` (prod) fetches PEM-encoded keys from
  ``eos_vault`` at first use and re-fetches on rotation.
* :class:`NoOpSkillVetter` is provided for tests that don't care about signing.

All three satisfy :class:`SkillVetter` so the use case stays the same.
"""

from __future__ import annotations

import abc
from collections.abc import Mapping
from pathlib import Path

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from eos_pack_signing import scan_trust_dir

from deos.modules.skill.domain.entities import SkillPackage
from deos.modules.skill.domain.errors import (
    SkillImageDigestMismatch,
    SkillSignatureInvalid,
    SkillSignerUntrusted,
)
from deos.modules.skill.domain.signing import (
    SkillPackPayload,
    verify_signature,
)

__all__ = [
    "LocalTrustStoreSkillVetter",
    "NoOpSkillVetter",
    "SkillVetter",
    "SkillVetterResult",
]


class SkillVetterResult:
    """Successful vet returns ``None``; failures raise a typed error.

    We use exceptions (not a result object) so the HTTP envelope
    surfaces the right status code without a use-case branch.
    """


class SkillVetter(abc.ABC):
    """Port — every implementation must be idempotent and side-effect free."""

    @abc.abstractmethod
    async def vet(self, package: SkillPackage) -> None:
        """Verify ``package``.  Raise on failure; return ``None`` on success."""


def _payload_of(p: SkillPackage) -> SkillPackPayload:
    return SkillPackPayload(
        name=p.name,
        version=p.version,
        description=p.description,
        entrypoint=p.entrypoint,
        image=p.image,
        image_digest=p.image_digest,
        parameters_schema=dict(p.parameters_schema),
        artifact_uri=p.artifact_uri,
        network_policy=str(p.network_policy),
        cpu_quota=p.cpu_quota,
        memory_bytes=p.memory_bytes,
        timeout_seconds=p.timeout_seconds,
    )


class LocalTrustStoreSkillVetter(SkillVetter):
    """Trust store = a directory of PEM files named ``<key_id>.pub.pem``.

    Used in dev / staging.  Production uses
    :class:`VaultBackedSkillVetter` (separate adapter).

    The trust directory is scanned once at construction: every
    ``*.pub.pem`` file is parsed into an :class:`Ed25519PublicKey` and
    cached by ``key_id`` (= ``public_key_id(key)``). An empty / missing
    directory is treated as a hard failure — callers cannot
    accidentally run an unconfigured trust store.

    Parameters
    ----------
    trust_dir:
        Directory holding ``<key_id>.pub.pem`` files.  ``key_id`` is
        the SHA-256 of the PEM, hex-encoded.
    require_signature:
        If ``False`` the vetter becomes a no-op for unsigned packs
        (still rejects on a known-bad signature).  Defaults to ``True``
        so production wiring never silently accepts unsigned packs.
    """

    def __init__(
        self,
        *,
        trust_dir: str | Path,
        require_signature: bool = True,
    ) -> None:
        self._trust_dir = Path(trust_dir)
        self._require_signature = require_signature
        # Eager scan — fail-loud if no keys are present.
        self._keys: dict[str, Ed25519PublicKey] = scan_trust_dir(
            self._trust_dir,
            label="skill",
            signer_untrusted_exc=SkillSignerUntrusted,
        )

    @property
    def trust_dir(self) -> Path:
        return self._trust_dir

    @property
    def trust_key_count(self) -> int:
        return len(self._keys)

    async def vet(self, package: SkillPackage) -> None:
        if not package.signature:
            if self._require_signature:
                raise SkillSignatureInvalid(
                    f"skill pack {package.name}@{package.version} has no signature"
                )
            return
        key = self._keys.get(package.signer_key_id)
        if key is None:
            raise SkillSignerUntrusted(
                f"signing key {package.signer_key_id!r} not in trust store "
                f"{self._trust_dir}"
            )
        try:
            verify_signature(
                _payload_of(package), signature_b64=package.signature, public_key=key
            )
        except InvalidSignature as exc:
            raise SkillSignatureInvalid(
                f"signature for {package.name}@{package.version} failed verification"
            ) from exc


class InMemoryTrustStoreSkillVetter(SkillVetter):
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
        from eos_pack_signing import public_key_id

        key_id = public_key_id(key)
        self._keys[key_id] = key
        return key_id

    async def vet(self, package: SkillPackage) -> None:
        if not package.signature:
            if self._require_signature:
                raise SkillSignatureInvalid(
                    f"skill pack {package.name}@{package.version} has no signature"
                )
            return
        key = self._keys.get(package.signer_key_id)
        if key is None:
            raise SkillSignerUntrusted(
                f"signing key {package.signer_key_id!r} not in trust store"
            )
        try:
            verify_signature(
                _payload_of(package), signature_b64=package.signature, public_key=key
            )
        except InvalidSignature as exc:
            raise SkillSignatureInvalid(
                f"signature for {package.name}@{package.version} failed verification"
            ) from exc


class NoOpSkillVetter(SkillVetter):
    """Accept every pack — only for unit tests that don't model signing."""

    async def vet(self, package: SkillPackage) -> None:
        return None


def assert_image_digest_matches(image_ref: str, expected_digest: str) -> None:
    """Compare a registry-resolved digest against what was signed.

    Both values are ``sha256:<hex>``.  Raises
    :class:`SkillImageDigestMismatch` if they differ — install-time
    defense against a pulled image being swapped for a different one.
    """
    if not expected_digest.startswith("sha256:"):
        raise SkillImageDigestMismatch(
            f"image_digest must start with 'sha256:' (got {expected_digest!r})"
        )
    if not image_ref.startswith("sha256:"):
        raise SkillImageDigestMismatch(
            f"image_ref must be a digest (got {image_ref!r}) — "
            "tag-based refs cannot be vetter-validated"
        )
    if image_ref != expected_digest:
        raise SkillImageDigestMismatch(
            f"image digest {image_ref!r} does not match signed digest {expected_digest!r}"
        )