"""Model module — application ports (Protocol).

Adapters live in ``adapter/{persistence, crypto, llm, http}``. The
application layer never imports adapters; the composition container
wires concrete implementations at startup.

This module deliberately keeps the port surface small: only the
operations the application layer needs. Everything else (SQL
Alchemy ORM specifics, LLMClient subclasses, etc.) stays in adapters.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Protocol, runtime_checkable
from uuid import UUID

from eos_llm import ChatRequest, ChatResponse, LLMClient
from eos_schema.ids import (
    CredentialId,
    ModelId,
    RoutingPolicyId,
    TenantId,
)
from eos_vault.actor import ActorContext

from deos.modules.model.domain.entities import (
    Model,
    ModelCredential,
    QuotaCounter,
    RoutingPolicy,
)

# ── Repositories ───────────────────────────────────────────────────────────


@runtime_checkable
class ModelRepository(Protocol):
    async def add(self, model: Model) -> None: ...

    async def get(self, *, tenant_id: TenantId, model_id: ModelId) -> Model | None: ...

    async def get_by_name(self, *, tenant_id: TenantId, name: str) -> Model | None: ...

    async def list(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: UUID | None = None,
        enabled_only: bool = False,
        limit: int = 100,
    ) -> list[Model]: ...

    async def update(self, model: Model) -> None: ...

    async def delete(self, *, tenant_id: TenantId, model_id: ModelId) -> bool: ...


@runtime_checkable
class CredentialRepository(Protocol):
    async def add(self, credential: ModelCredential) -> None: ...

    async def get(
        self, *, tenant_id: TenantId, credential_id: CredentialId
    ) -> ModelCredential | None: ...

    async def list(
        self, *, tenant_id: TenantId, limit: int = 100
    ) -> list[ModelCredential]: ...

    async def update(self, credential: ModelCredential) -> None: ...

    async def delete(
        self, *, tenant_id: TenantId, credential_id: CredentialId
    ) -> bool: ...


@runtime_checkable
class RoutingPolicyRepository(Protocol):
    async def add(self, policy: RoutingPolicy) -> None: ...

    async def get(
        self, *, tenant_id: TenantId, policy_id: RoutingPolicyId
    ) -> RoutingPolicy | None: ...

    async def get_for_model(
        self, *, tenant_id: TenantId, model_id: ModelId
    ) -> RoutingPolicy | None: ...

    async def list(
        self, *, tenant_id: TenantId, limit: int = 100
    ) -> list[RoutingPolicy]: ...


@runtime_checkable
class QuotaCounterRepository(Protocol):
    """Per-(tenant, model, window_start) usage counter.

    ``increment`` runs an atomic UPDATE ... RETURNING so concurrent
    callers can't overshoot the configured cap. ``get_window_usage``
    is a single SUM for the pre-check.
    """

    async def get(
        self,
        *,
        tenant_id: TenantId,
        model_id: ModelId,
        window_start: datetime,
    ) -> QuotaCounter | None: ...

    async def increment(
        self,
        *,
        tenant_id: TenantId,
        model_id: ModelId,
        window_start: datetime,
        input_tokens: int,
        output_tokens: int,
    ) -> QuotaCounter: ...

    async def get_window_usage(
        self,
        *,
        tenant_id: TenantId,
        model_id: ModelId,
        window_start: datetime,
    ) -> int: ...


# ── Cipher (encrypt / decrypt credentials) ────────────────────────────────


@runtime_checkable
class CredentialCipher(Protocol):
    """Encrypt / decrypt ModelCredential.api_key payloads.

    Backed by ``eos_vault.crypto.aes_gcm`` in production; tests can
    inject a no-op cipher or a deterministic one for assertions.
    """

    def encrypt(
        self,
        plaintext: bytes,
        *,
        aad: bytes | None = None,
    ) -> bytes: ...

    def decrypt(
        self,
        blob: bytes,
        *,
        aad: bytes | None = None,
    ) -> bytes: ...

    @property
    def key_version(self) -> int: ...


# ── LLM client factory ────────────────────────────────────────────────────


@runtime_checkable
class ModelClientFactory(Protocol):
    """Build an LLMClient for a (Model + decrypted credential) pair.

    The credential is supplied already decrypted; the factory itself
    never holds plaintext keys — it returns the client bound to the
    upstream ``base_url`` / ``api_key`` from the credential payload.
    """

    def build(
        self,
        *,
        model: Model,
        api_key: str,
        base_url: str | None,
    ) -> LLMClient: ...


# ── Infrastructure (clock / ids / publisher) ──────────────────────────────


@runtime_checkable
class ClockPort(Protocol):
    def now(self) -> datetime: ...


@runtime_checkable
class IdGeneratorPort(Protocol):
    def new_id(self) -> UUID: ...


@runtime_checkable
class ModelEventPublisher(Protocol):
    async def publish(self, topic: str, payload: dict[str, Any]) -> None: ...


# ── Chat invoker (used by step-5 LLMPort adapter) ─────────────────────────


@runtime_checkable
class ChatInvoker(Protocol):
    """The async shape ``LLMPort`` calls into when routing by model_id.

    Implemented by ``ModelService.invoke``. Kept separate from the
    repositories so that ``agent_runtime`` doesn't have to import the
    concrete service type.
    """

    async def invoke(
        self,
        *,
        actor: ActorContext,
        model_id: ModelId,
        req: ChatRequest,
    ) -> ChatResponse: ...


__all__ = [
    "ChatInvoker",
    "ClockPort",
    "CredentialCipher",
    "CredentialRepository",
    "IdGeneratorPort",
    "ModelClientFactory",
    "ModelEventPublisher",
    "ModelRepository",
    "QuotaCounterRepository",
    "RoutingPolicyRepository",
]
