"""Unit tests for :class:`VaultBackedSkillVetter`.

We use a ``_FakeKvResolver`` stub that mimics
:class:`eos_vault.resolver.VaultSecretsResolver`'s ``resolve(ref, *,
actor)`` coroutine.  Each test monkeypatches ``time.monotonic`` so the
TTL behavior is deterministic.
"""

from __future__ import annotations

from uuid import UUID

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from eos_pack_signing import (
    public_key_id,
    public_key_to_pem,
)

from deos.modules.skill.application.vetter_vault import (
    SYSTEM_TENANT_ID,
    VaultBackedSkillVetter,
)
from deos.modules.skill.domain.entities import NetworkPolicy, SkillPackage
from deos.modules.skill.domain.errors import (
    SkillSignerUntrusted,
)
from deos.modules.skill.domain.signing import (
    SkillPackPayload,
    sign_payload,
)

# ── stubs ─────────────────────────────────────────────────────────────────


class _FakeKvResolver:
    """Records calls + returns canned payloads.

    Implements the minimal interface
    :class:`eos_vault.resolver.VaultSecretsResolver` exposes to the
    vetter: ``resolve(ref, *, actor)`` + ``invalidate(**kwargs)``.
    """

    def __init__(self) -> None:
        self.resolve_calls: list[str] = []
        self.invalidate_calls: list[dict[str, object]] = []
        self.payloads: dict[str, dict[str, str]] = {}
        self.raise_on_resolve: Exception | None = None

    async def resolve(self, ref: str, *, actor):  # type: ignore[no-untyped-def]
        self.resolve_calls.append(ref)
        if self.raise_on_resolve is not None:
            raise self.raise_on_resolve
        return self.payloads[ref]

    def invalidate(self, **kwargs):  # type: ignore[no-untyped-def]
        self.invalidate_calls.append(kwargs)


def _key_pem(kid: str, key: Ed25519PublicKey) -> str:
    return public_key_to_pem(key).decode("ascii")


def _signed_package(priv: Ed25519PrivateKey, *, kid: str) -> SkillPackage:
    p = SkillPackPayload(
        name="hello-skill",
        version="1.0.0",
        description="demo",
        entrypoint="python -m hello",
        image="ghcr.io/eos/hello:1",
        image_digest="sha256:" + "a" * 64,
        parameters_schema={},
        artifact_uri="",
        network_policy=str(NetworkPolicy.DEFAULT),
        cpu_quota=None,
        memory_bytes=None,
        timeout_seconds=15,
    )
    sig = sign_payload(p, private_key=priv)
    return SkillPackage.create(
        tenant_id=UUID(int=1),
        workspace_id=UUID(int=2),
        name=p.name,
        version=p.version,
        description=p.description,
        entrypoint=p.entrypoint,
        image=p.image,
        parameters_schema=p.parameters_schema,
        artifact_uri=p.artifact_uri,
        network_policy=NetworkPolicy(p.network_policy),
        cpu_quota=None,
        memory_bytes=None,
        timeout_seconds=p.timeout_seconds,
        signature=sig,
        signer_key_id=kid,
        image_digest=p.image_digest,
    )


def _build_kv(
    priv: Ed25519PrivateKey, *, extra: int = 0
) -> tuple[_FakeKvResolver, str]:
    kid = public_key_id(priv.public_key())
    kv = _FakeKvResolver()
    payload = {kid: _key_pem(kid, priv.public_key())}
    for i in range(extra):
        extra_priv = Ed25519PrivateKey.generate()
        ekid = public_key_id(extra_priv.public_key())
        payload[ekid] = _key_pem(ekid, extra_priv.public_key())
    kv.payloads["vault:secret/data/eos/skill-trust/keys"] = payload
    return kv, kid


def _clock(initial: float = 1000.0):
    state = {"t": initial}

    def now() -> float:
        return state["t"]

    def advance(seconds: float) -> None:
        state["t"] += seconds

    now.advance = advance  # type: ignore[attr-defined]
    return now


# ── tests ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_first_vet_triggers_vault_refresh() -> None:
    priv = Ed25519PrivateKey.generate()
    kv, kid = _build_kv(priv)
    now = _clock()
    vetter = VaultBackedSkillVetter(
        kv_resolver=kv,
        trust_ref="vault:secret/data/eos/skill-trust/keys",
        refresh_seconds=300.0,
        clock=now,
    )
    await vetter.vet(_signed_package(priv, kid=kid))
    assert kv.resolve_calls == ["vault:secret/data/eos/skill-trust/keys"]
    assert vetter.trust_key_count == 1


@pytest.mark.asyncio
async def test_subsequent_vet_within_ttl_does_not_re_fetch() -> None:
    priv = Ed25519PrivateKey.generate()
    kv, kid = _build_kv(priv)
    now = _clock()
    vetter = VaultBackedSkillVetter(
        kv_resolver=kv,
        trust_ref="vault:secret/data/eos/skill-trust/keys",
        refresh_seconds=300.0,
        clock=now,
    )
    await vetter.vet(_signed_package(priv, kid=kid))
    now.advance(10.0)  # well inside TTL
    await vetter.vet(_signed_package(priv, kid=kid))
    assert len(kv.resolve_calls) == 1


@pytest.mark.asyncio
async def test_vet_after_ttl_triggers_renewed_refresh() -> None:
    priv = Ed25519PrivateKey.generate()
    kv, kid = _build_kv(priv)
    now = _clock()
    vetter = VaultBackedSkillVetter(
        kv_resolver=kv,
        trust_ref="vault:secret/data/eos/skill-trust/keys",
        refresh_seconds=300.0,
        clock=now,
    )
    await vetter.vet(_signed_package(priv, kid=kid))
    now.advance(301.0)  # TTL elapsed
    await vetter.vet(_signed_package(priv, kid=kid))
    assert len(kv.resolve_calls) == 2


@pytest.mark.asyncio
async def test_unknown_signer_raises_signer_untrusted() -> None:
    priv = Ed25519PrivateKey.generate()
    kv, _kid = _build_kv(priv)
    vetter = VaultBackedSkillVetter(
        kv_resolver=kv,
        trust_ref="vault:secret/data/eos/skill-trust/keys",
        refresh_seconds=300.0,
        clock=_clock(),
    )
    forged_priv = Ed25519PrivateKey.generate()
    forged_kid = public_key_id(forged_priv.public_key())
    pkg = _signed_package(forged_priv, kid=forged_kid)
    with pytest.raises(SkillSignerUntrusted, match="not in vault trust store"):
        await vetter.vet(pkg)


@pytest.mark.asyncio
async def test_secret_not_found_raises_signer_untrusted() -> None:
    """A missing trust-store ref MUST surface as ``SkillSignerUntrusted``."""
    from eos_vault.errors import SecretNotFound

    priv = Ed25519PrivateKey.generate()
    kv, _kid = _build_kv(priv)
    kv.raise_on_resolve = SecretNotFound("vault:secret/data/eos/skill-trust/keys")
    vetter = VaultBackedSkillVetter(
        kv_resolver=kv,
        trust_ref="vault:secret/data/eos/skill-trust/keys",
        refresh_seconds=300.0,
        clock=_clock(),
    )
    with pytest.raises(SkillSignerUntrusted, match="vault trust store"):
        await vetter.vet(_signed_package(priv, kid=public_key_id(priv.public_key())))


@pytest.mark.asyncio
async def test_secret_access_denied_raises_signer_untrusted() -> None:
    from eos_vault.errors import SecretAccessDenied

    priv = Ed25519PrivateKey.generate()
    kv, _kid = _build_kv(priv)
    kv.raise_on_resolve = SecretAccessDenied("actor cannot read")
    vetter = VaultBackedSkillVetter(
        kv_resolver=kv,
        trust_ref="vault:secret/data/eos/skill-trust/keys",
        refresh_seconds=300.0,
        clock=_clock(),
    )
    with pytest.raises(SkillSignerUntrusted):
        await vetter.vet(_signed_package(priv, kid=public_key_id(priv.public_key())))


@pytest.mark.asyncio
async def test_min_keys_enforced() -> None:
    """If Vault returns 0 valid keys, refuse (even if no ``raise``)."""
    kv = _FakeKvResolver()
    kv.payloads["vault:secret/data/eos/skill-trust/keys"] = {}
    vetter = VaultBackedSkillVetter(
        kv_resolver=kv,
        trust_ref="vault:secret/data/eos/skill-trust/keys",
        refresh_seconds=300.0,
        min_keys=1,
        clock=_clock(),
    )
    priv = Ed25519PrivateKey.generate()
    kid = public_key_id(priv.public_key())
    with pytest.raises(SkillSignerUntrusted, match="need >="):
        await vetter.vet(_signed_package(priv, kid=kid))


@pytest.mark.asyncio
async def test_invalid_pem_in_vault_raises_signer_untrusted() -> None:
    """A PEM that won't decode as Ed25519 must not be trusted."""
    priv = Ed25519PrivateKey.generate()
    kid = public_key_id(priv.public_key())
    kv = _FakeKvResolver()
    kv.payloads["vault:secret/data/eos/skill-trust/keys"] = {
        kid: "not-a-valid-pem",
    }
    vetter = VaultBackedSkillVetter(
        kv_resolver=kv,
        trust_ref="vault:secret/data/eos/skill-trust/keys",
        refresh_seconds=300.0,
        clock=_clock(),
    )
    with pytest.raises(SkillSignerUntrusted, match="not a valid Ed25519 PEM"):
        await vetter.vet(_signed_package(priv, kid=kid))


@pytest.mark.asyncio
async def test_require_signature_false_allows_unsigned() -> None:
    """``require_signature=False`` mirrors ``LocalTrustStore*Vetter`` opt-out."""
    kv, _kid = _build_kv(Ed25519PrivateKey.generate())
    vetter = VaultBackedSkillVetter(
        kv_resolver=kv,
        trust_ref="vault:secret/data/eos/skill-trust/keys",
        refresh_seconds=300.0,
        require_signature=False,
        clock=_clock(),
    )
    pkg = SkillPackage.create(
        tenant_id=UUID(int=1),
        workspace_id=UUID(int=2),
        name="unsigned",
        version="1.0.0",
        description="",
        entrypoint="python -m x",
        image="ghcr.io/x:1",
    )
    await vetter.vet(pkg)


@pytest.mark.asyncio
async def test_invalidate_keys_drops_cache_and_calls_resolver() -> None:
    """``invalidate_keys()`` flushes both layers — admin rotate hook."""
    priv = Ed25519PrivateKey.generate()
    kv, kid = _build_kv(priv)
    vetter = VaultBackedSkillVetter(
        kv_resolver=kv,
        trust_ref="vault:secret/data/eos/skill-trust/keys",
        refresh_seconds=300.0,
        clock=_clock(),
    )
    await vetter.vet(_signed_package(priv, kid=kid))
    assert vetter.trust_key_count == 1
    vetter.invalidate_keys()
    assert vetter.trust_key_count == 0
    # At least one invalidate call recorded — pass the ref as kwarg.
    assert len(kv.invalidate_calls) >= 1
    # Next vet() must re-fetch from Vault.
    await vetter.vet(_signed_package(priv, kid=kid))
    assert len(kv.resolve_calls) == 2


@pytest.mark.asyncio
async def test_invalidate_keys_works_when_resolver_lacks_invalidate_kwarg() -> None:
    """If the resolver doesn't accept ``ref=``, fall back to flush-all."""

    class _NoKwargFlushResolver:
        def __init__(self) -> None:
            self.flush_calls = 0

        async def resolve(self, ref, *, actor):  # type: ignore[no-untyped-def]
            kid = next(iter(self._store.keys()))
            return {kid: self._store[kid]}

        def invalidate(self):  # no kwargs at all
            self.flush_calls += 1

        def set(self, payload):  # type: ignore[no-untyped-def]
            self._store = payload

    priv = Ed25519PrivateKey.generate()
    kid = public_key_id(priv.public_key())
    resolver = _NoKwargFlushResolver()
    resolver.set({kid: _key_pem(kid, priv.public_key())})
    vetter = VaultBackedSkillVetter(
        kv_resolver=resolver,  # type: ignore[arg-type]
        trust_ref="vault:secret/data/eos/skill-trust/keys",
        refresh_seconds=300.0,
        clock=_clock(),
    )
    await vetter.vet(_signed_package(priv, kid=kid))
    assert vetter.trust_key_count == 1
    vetter.invalidate_keys()
    assert resolver.flush_calls == 1


def test_system_tenant_id_is_well_known() -> None:
    """The synthetic actor must use the well-known system UUID so audit
    logs are explicit about the synthetic caller."""
    assert str(SYSTEM_TENANT_ID) == "00000000-0000-0000-0000-000000000001"
    assert isinstance(SYSTEM_TENANT_ID, UUID)


@pytest.mark.asyncio
async def test_vetter_rejects_tampered_signature_after_rotate() -> None:
    """Simulate a key rotation: pre-rotate signature should fail once
    the trust store is rotated to a new key."""
    old = Ed25519PrivateKey.generate()
    new = Ed25519PrivateKey.generate()
    old_kid = public_key_id(old.public_key())
    new_kid = public_key_id(new.public_key())

    kv = _FakeKvResolver()
    kv.payloads["vault:secret/data/eos/skill-trust/keys"] = {
        old_kid: _key_pem(old_kid, old.public_key()),
    }
    now = _clock()
    vetter = VaultBackedSkillVetter(
        kv_resolver=kv,
        trust_ref="vault:secret/data/eos/skill-trust/keys",
        refresh_seconds=300.0,
        clock=now,
    )
    pkg = _signed_package(old, kid=old_kid)
    await vetter.vet(pkg)
    # Simulate rotate: replace trust store with new key.
    kv.payloads["vault:secret/data/eos/skill-trust/keys"] = {
        new_kid: _key_pem(new_kid, new.public_key()),
    }
    # Invalidate so the next vet() re-fetches.
    vetter.invalidate_keys()
    with pytest.raises(SkillSignerUntrusted, match="not in vault trust store"):
        await vetter.vet(pkg)
