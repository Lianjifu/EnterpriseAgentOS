"""Vault-backed SkillVetter — fetch trust keys from HashiCorp Vault KV v2.

Production wiring of :class:`SkillVetter` for
``EOS_SKILL_SIGNING_MODE=vault``.  Mirrors
:class:`LocalTrustStoreSkillVetter` but the trust store lives in Vault
KV v2 (ref ``EOS_VAULT_SKILL_TRUST_REF`` — default
``vault:secret/data/eos/skill-trust/keys``) instead of a PEM directory
on disk.  Each Vault secret is a ``{key_id: pem}`` mapping.

Why an explicit ``SYSTEM_TENANT_ID``?
-------------------------------------
``eos_vault.HashicorpVaultSecretsResolver.resolve`` requires an
``ActorContext`` (KV v2 honors Vault ACLs by policy; the resolver
threads the actor so ACL failures surface as
:class:`SecretAccessDenied`).  The trust-store lookup is a *platform*
operation, not a per-tenant operation — there is no real user behind
it.  We use a well-known constant so audit logs are explicit about the
synthetic caller.
"""

from __future__ import annotations

import time
from collections.abc import Callable
from uuid import UUID

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from eos_pack_signing import load_public_key_pem
from eos_vault.actor import ActorContext
from eos_vault.errors import (
    InvalidSecretRef,
    SecretAccessDenied,
    SecretNotFound,
)
from eos_vault.hashicorp_vault import HashicorpVaultSecretsResolver

from deos.modules.skill.application.vetter import (
    SkillVetter,
    _payload_of,
    verify_signature,
)
from deos.modules.skill.domain.entities import SkillPackage
from deos.modules.skill.domain.errors import SkillSignatureInvalid, SkillSignerUntrusted

SYSTEM_TENANT_ID = UUID("00000000-0000-0000-0000-000000000001")

__all__ = ["VaultBackedSkillVetter"]


class VaultBackedSkillVetter(SkillVetter):
    """SkillVetter whose trust store lives in HashiCorp Vault KV v2.

    Parameters
    ----------
    kv_resolver:
        A :class:`VaultSecretsResolver` (typically
        :class:`eos_vault.HashicorpVaultSecretsResolver`) — single source
        of trust keys.
    trust_ref:
        Vault ref (``vault:secret/data/<path>``).  The secret's
        ``data`` field is a ``{key_id: pem}`` mapping.
    refresh_seconds:
        How often to re-fetch the trust store.  Default 5 min — small
        enough that a Vault rotate shows up promptly, large enough to
        absorb routine replays.
    min_keys:
        Fail-loud if Vault returns fewer than this many trusted keys.
        Prevents booting with an empty / misconfigured trust store.
    require_signature:
        Mirror :class:`LocalTrustStoreSkillVetter` — reject unsigned
        packs unless the operator explicitly opts out.
    clock:
        Override for tests (default :func:`time.monotonic`).
    """

    def __init__(
        self,
        *,
        kv_resolver: HashicorpVaultSecretsResolver,
        trust_ref: str,
        refresh_seconds: float = 300.0,
        min_keys: int = 1,
        require_signature: bool = True,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._kv = kv_resolver
        self._trust_ref = trust_ref
        self._refresh_seconds = float(refresh_seconds)
        self._min_keys = int(min_keys)
        self._require_signature = require_signature
        self._keys: dict[str, Ed25519PublicKey] = {}
        self._last_refresh: float = 0.0
        self._clock = clock
        self._actor = ActorContext(
            tenant_id=SYSTEM_TENANT_ID,
            workspace_id=None,
            principal_id=None,
            roles=frozenset({"system"}),
        )

    @property
    def trust_ref(self) -> str:
        return self._trust_ref

    @property
    def trust_key_count(self) -> int:
        return len(self._keys)

    async def vet(self, package: SkillPackage) -> None:
        await self._ensure_fresh()
        if not package.signature:
            if self._require_signature:
                raise SkillSignatureInvalid(
                    f"skill pack {package.name}@{package.version} has no signature"
                )
            return
        key = self._keys.get(package.signer_key_id)
        if key is None:
            raise SkillSignerUntrusted(
                f"signing key {package.signer_key_id!r} not in vault trust store "
                f"{self._trust_ref}"
            )
        try:
            verify_signature(
                _payload_of(package),
                signature_b64=package.signature,
                public_key=key,
            )
        except InvalidSignature as exc:
            raise SkillSignatureInvalid(
                f"signature for {package.name}@{package.version} failed verification"
            ) from exc

    async def _ensure_fresh(self) -> None:
        """Lazy refresh — fetch from Vault on first call or every TTL."""
        now = self._clock()
        if self._keys and (now - self._last_refresh) < self._refresh_seconds:
            return
        try:
            payload = await self._kv.resolve(self._trust_ref, actor=self._actor)
        except (SecretNotFound, SecretAccessDenied, InvalidSecretRef) as exc:
            raise SkillSignerUntrusted(
                f"vault trust store {self._trust_ref!r} unreachable: {exc}"
            ) from exc
        keys: dict[str, Ed25519PublicKey] = {}
        for key_id, pem in payload.items():
            try:
                keys[key_id] = load_public_key_pem(pem.encode("ascii"))
            except (TypeError, ValueError) as exc:
                raise SkillSignerUntrusted(
                    f"vault trust store key {key_id!r} is not a valid Ed25519 PEM"
                ) from exc
        if len(keys) < self._min_keys:
            raise SkillSignerUntrusted(
                f"vault trust store returned {len(keys)} keys, need >= {self._min_keys}"
            )
        self._keys = keys
        self._last_refresh = self._clock()

    def invalidate_keys(self) -> None:
        """Admin hook — drop the local cache and the Vault-side cache."""
        try:
            self._kv.invalidate(ref=self._trust_ref)
        except (AttributeError, TypeError):
            # Some resolvers don't accept the kwarg form; fall back to flush-all.
            try:
                self._kv.invalidate()
            except TypeError:
                pass
        self._keys.clear()
        self._last_refresh = 0.0
