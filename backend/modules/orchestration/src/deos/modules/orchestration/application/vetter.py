"""Plan Vetter — verify a pack before registration.

Mirrors :mod:`deos.modules.knowledge.application.vetter` and
:mod:`deos.modules.skill.application.vetter`.  Three implementations:

* :class:`LocalTrustStorePlanVetter` — eager-scans ``EOS_PLAN_TRUST_DIR``
  via ``eos_pack_signing.scan_trust_dir``.
* :class:`InMemoryTrustStorePlanVetter` — test-time key injection.
* :class:`NoOpPlanVetter` — ``disabled`` mode / unit tests.

The signature covers content that defines the plan's runtime behavior
(``plan_dsl``, ``allowed_tenants``, ``schedule``,
``default_timeout_seconds``) so a signed plan can't quietly broaden
tenant reach, become deadline-free, or be repointed at a different DSL
without re-signing.
"""

from __future__ import annotations

import abc
from collections.abc import Mapping
from pathlib import Path

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from eos_pack_signing import public_key_id, scan_trust_dir

from deos.modules.orchestration.domain.entities import Plan
from deos.modules.orchestration.domain.errors import (
    PlanSignatureInvalid,
    PlanSignerUntrusted,
)
from deos.modules.orchestration.domain.signing import (
    PlanPackPayload,
    verify_signature,
)

__all__ = [
    "InMemoryTrustStorePlanVetter",
    "LocalTrustStorePlanVetter",
    "NoOpPlanVetter",
    "PlanVetter",
]


class PlanVetter(abc.ABC):
    """Port — every implementation must be idempotent and side-effect free."""

    @abc.abstractmethod
    async def vet(self, plan: Plan) -> None:
        """Verify ``plan``.  Raise on failure; return ``None`` on success."""


def _payload_of(plan: Plan) -> PlanPackPayload:
    meta = dict(plan.metadata or {})
    return PlanPackPayload(
        name=plan.name,
        version=str(meta.get("version", "1.0.0")),
        description=plan.description,
        plan_dsl=dict(plan.entry_dsl),
        allowed_tenants=tuple(sorted(str(x) for x in meta.get("allowed_tenants", ()))),
        schedule=str(meta.get("schedule", "")),
        default_timeout_seconds=int(meta.get("default_timeout_seconds", 60)),
    )


class LocalTrustStorePlanVetter(PlanVetter):
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
            label="plan",
            signer_untrusted_exc=PlanSignerUntrusted,
        )

    @property
    def trust_dir(self) -> Path:
        return self._trust_dir

    @property
    def trust_key_count(self) -> int:
        return len(self._keys)

    async def vet(self, plan: Plan) -> None:
        if not plan.signature:
            if self._require_signature:
                raise PlanSignatureInvalid(f"plan {plan.name} has no signature")
            return
        key = self._keys.get(plan.signer_key_id)
        if key is None:
            raise PlanSignerUntrusted(
                f"signing key {plan.signer_key_id!r} not in trust store "
                f"{self._trust_dir}"
            )
        try:
            verify_signature(
                _payload_of(plan),
                signature_b64=plan.signature,
                public_key=key,
            )
        except InvalidSignature as exc:
            raise PlanSignatureInvalid(
                f"signature for plan {plan.name} failed verification"
            ) from exc


class InMemoryTrustStorePlanVetter(PlanVetter):
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

    async def vet(self, plan: Plan) -> None:
        if not plan.signature:
            if self._require_signature:
                raise PlanSignatureInvalid(f"plan {plan.name} has no signature")
            return
        key = self._keys.get(plan.signer_key_id)
        if key is None:
            raise PlanSignerUntrusted(
                f"signing key {plan.signer_key_id!r} not in trust store"
            )
        try:
            verify_signature(
                _payload_of(plan),
                signature_b64=plan.signature,
                public_key=key,
            )
        except InvalidSignature as exc:
            raise PlanSignatureInvalid(
                f"signature for plan {plan.name} failed verification"
            ) from exc


class NoOpPlanVetter(PlanVetter):
    """Accept every plan — only for ``disabled`` mode and unit tests."""

    async def vet(self, plan: Plan) -> None:
        return None
