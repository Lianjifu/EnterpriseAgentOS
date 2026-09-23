"""Unit tests for ``ModelService`` (register / invoke / rotate / list)."""

from __future__ import annotations

from uuid import UUID

import pytest
from _in_memory import (
    CollectingPublisher,
    EchoClientFactory,
    FixedClock,
    InMemoryCipher,
    InMemoryCredentialRepository,
    InMemoryModelRepository,
    InMemoryQuotaCounterRepository,
    InMemoryRoutingPolicyRepository,
    SequenceIds,
)
from eos_llm import ChatMessage, ChatRequest
from eos_schema.ids import (
    CredentialId,
    ModelId,
    RoutingPolicyId,
    TenantId,
    UserId,
    WorkspaceId,
)
from eos_vault.actor import ActorContext

from deos.modules.model.application.services import (
    DEFAULT_QUOTA_WINDOW,
    ModelService,
    _build_envelope,
    _split_envelope,
)
from deos.modules.model.domain.entities import (
    bucket_start,
    make_routing_policy,
)
from deos.modules.model.domain.errors import (
    CredentialNotFound,
    ModelAlreadyExists,
    ModelDisabled,
    ModelError,
    ModelNotFound,
    QuotaExceeded,
    RoutingPolicyNotFound,
)
from deos.modules.model.domain.value_objects import (
    ModelProvider,
    RoutingStrategy,
)

TID = TenantId(UUID(int=1))
WID = WorkspaceId(UUID(int=2))
UID = UserId(UUID(int=3))


def _actor() -> ActorContext:
    return ActorContext(
        tenant_id=TID,
        workspace_id=WID,
        principal_id=UID,
        roles=frozenset({"workspace_member"}),
    )


def _build_service() -> tuple[ModelService, dict]:
    model_repo = InMemoryModelRepository()
    credential_repo = InMemoryCredentialRepository()
    routing_repo = InMemoryRoutingPolicyRepository()
    quota_repo = InMemoryQuotaCounterRepository()
    factory = EchoClientFactory()
    cipher = InMemoryCipher()
    clock = FixedClock()
    ids = SequenceIds()
    publisher = CollectingPublisher()

    svc = ModelService(
        model_repo=model_repo,
        credential_repo=credential_repo,
        routing_repo=routing_repo,
        quota_repo=quota_repo,
        client_factory=factory,
        cipher=cipher,
        clock=clock,
        ids=ids,
        publisher=publisher,
    )
    return svc, {
        "model_repo": model_repo,
        "credential_repo": credential_repo,
        "routing_repo": routing_repo,
        "quota_repo": quota_repo,
        "factory": factory,
        "cipher": cipher,
        "clock": clock,
        "ids": ids,
        "publisher": publisher,
    }


# ── envelope helpers ─────────────────────────────────────────────────────


def test_envelope_round_trip() -> None:
    ct = b"ciphertext-bytes"
    env = _build_envelope(ct, "https://api.openai.com")
    payload, url = _split_envelope(env)
    assert payload == ct
    assert url == "https://api.openai.com"


def test_envelope_without_base_url() -> None:
    env = _build_envelope(b"abc", None)
    payload, url = _split_envelope(env)
    assert payload == b"abc"
    assert url is None


# ── register ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_register_creates_model_and_publishes_event() -> None:
    svc, ctx = _build_service()
    model = await svc.register(
        actor=_actor(),
        name="gpt4o",
        provider=ModelProvider.OPENAI,
        upstream_model="gpt-4o",
    )
    assert isinstance(model.id, UUID)
    assert model.name == "gpt4o"
    assert model.upstream_model == "gpt-4o"
    assert (await ctx["model_repo"].get(tenant_id=TID, model_id=model.id)) == model
    topics = [t for t, _ in ctx["publisher"].published]
    assert "model.registered" in topics


@pytest.mark.asyncio
async def test_register_duplicate_name_raises() -> None:
    svc, _ = _build_service()
    await svc.register(
        actor=_actor(),
        name="gpt4o",
        provider=ModelProvider.OPENAI,
        upstream_model="gpt-4o",
    )
    with pytest.raises(ModelAlreadyExists):
        await svc.register(
            actor=_actor(),
            name="gpt4o",
            provider=ModelProvider.OPENAI,
            upstream_model="gpt-4o",
        )


@pytest.mark.asyncio
async def test_register_credential_encrypts_payload() -> None:
    svc, ctx = _build_service()
    cred = await svc.register_credential(
        actor=_actor(),
        provider=ModelProvider.OPENAI,
        label="prod",
        api_key="sk-abc123",
        base_url="https://api.openai.com",
    )
    assert isinstance(cred.id, UUID)
    # Cipher was called
    assert ctx["cipher"].encrypted == [b"sk-abc123"]
    # Payload starts with ENC: (test cipher marker)
    assert cred.encrypted_payload.startswith(b"ENC:")
    # base_url packed after NUL
    assert cred.encrypted_payload.endswith(b"https://api.openai.com")


@pytest.mark.asyncio
async def test_register_credential_without_base_url() -> None:
    svc, _ctx = _build_service()
    cred = await svc.register_credential(
        actor=_actor(),
        provider=ModelProvider.ANTHROPIC,
        label="claude-prod",
        api_key="sk-ant-x",
    )
    assert cred.encrypted_payload == b"ENC:sk-ant-x"


# ── rotate credential ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_rotate_credential_updates_payload_and_publishes() -> None:
    svc, ctx = _build_service()
    cred = await svc.register_credential(
        actor=_actor(),
        provider=ModelProvider.OPENAI,
        label="prod",
        api_key="sk-old",
        base_url="https://api.openai.com",
    )
    rotated = await svc.rotate_credential(
        actor=_actor(), credential_id=cred.id, new_api_key="sk-new"
    )
    assert rotated.encrypted_payload.startswith(b"ENC:sk-new")
    assert rotated.rotated_at is not None
    assert rotated.key_version == 1
    topics = [t for t, _ in ctx["publisher"].published]
    assert "model.credential_rotated" in topics


@pytest.mark.asyncio
async def test_rotate_missing_credential_raises() -> None:
    svc, _ = _build_service()
    with pytest.raises(CredentialNotFound):
        await svc.rotate_credential(
            actor=_actor(),
            credential_id=CredentialId(UUID(int=999)),
            new_api_key="x",
        )


# ── invoke ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_invoke_happy_path_increments_quota_and_publishes() -> None:
    svc, ctx = _build_service()
    cred = await svc.register_credential(
        actor=_actor(),
        provider=ModelProvider.OPENAI,
        label="prod",
        api_key="sk-abc",
        base_url="https://api.openai.com",
    )
    model = await svc.register(
        actor=_actor(),
        name="gpt4o",
        provider=ModelProvider.OPENAI,
        upstream_model="gpt-4o",
        credential_id=cred.id,
    )
    req = ChatRequest(
        model="gpt-4o",
        messages=[ChatMessage(role="user", content="hello")],
    )
    resp = await svc.invoke(actor=_actor(), model_id=model.id, req=req)
    assert resp.message.role == "assistant"
    assert resp.message.content == "hello"
    # Echo client: usage matches payload length
    assert resp.usage.input_tokens == len("hello")
    # Quota incremented
    used = await ctx["quota_repo"].get_window_usage(
        tenant_id=TID,
        model_id=model.id,
        window_start=bucket_start(ctx["clock"].now(), DEFAULT_QUOTA_WINDOW),
    )
    assert used == 10  # 5 input + 5 output
    # LLMClient was built with decrypted key + base_url
    assert ctx["factory"].builds == [("sk-abc", "https://api.openai.com")]
    # Event published
    topics = [t for t, _ in ctx["publisher"].published]
    assert "model.invoked" in topics


@pytest.mark.asyncio
async def test_invoke_unknown_model_raises() -> None:
    svc, _ = _build_service()
    with pytest.raises(ModelNotFound):
        await svc.invoke(
            actor=_actor(),
            model_id=ModelId(UUID(int=999)),
            req=ChatRequest(model="x", messages=[]),
        )


@pytest.mark.asyncio
async def test_invoke_disabled_model_raises() -> None:
    svc, ctx = _build_service()
    cred = await svc.register_credential(
        actor=_actor(),
        provider=ModelProvider.OPENAI,
        label="prod",
        api_key="sk-abc",
    )
    model = await svc.register(
        actor=_actor(),
        name="gpt4o",
        provider=ModelProvider.OPENAI,
        upstream_model="gpt-4o",
        credential_id=cred.id,
    )
    disabled = model.with_enabled(False)
    await ctx["model_repo"].update(disabled)
    with pytest.raises(ModelDisabled):
        await svc.invoke(
            actor=_actor(),
            model_id=model.id,
            req=ChatRequest(model="x", messages=[]),
        )


@pytest.mark.asyncio
async def test_invoke_missing_credential_raises() -> None:
    svc, _ = _build_service()
    model = await svc.register(
        actor=_actor(),
        name="gpt4o",
        provider=ModelProvider.OPENAI,
        upstream_model="gpt-4o",
    )
    with pytest.raises(CredentialNotFound):
        await svc.invoke(
            actor=_actor(),
            model_id=model.id,
            req=ChatRequest(model="x", messages=[]),
        )


@pytest.mark.asyncio
async def test_invoke_quota_exceeded_raises_before_llm_call() -> None:
    svc, ctx = _build_service()
    cred = await svc.register_credential(
        actor=_actor(),
        provider=ModelProvider.OPENAI,
        label="prod",
        api_key="sk-abc",
    )
    policy = make_routing_policy(
        tenant_id=TID,
        strategy=RoutingStrategy.PRIORITY,
        primary_model_id=ModelId(UUID(int=10)),
        selection_rules={"quota_cap_per_minute": 50},
    )
    await ctx["routing_repo"].add(policy)
    model = await svc.register(
        actor=_actor(),
        name="gpt4o",
        provider=ModelProvider.OPENAI,
        upstream_model="gpt-4o",
        credential_id=cred.id,
        routing_policy_id=policy.id,
    )
    # Pre-fill quota to cap
    await ctx["quota_repo"].increment(
        tenant_id=TID,
        model_id=model.id,
        window_start=bucket_start(ctx["clock"].now(), DEFAULT_QUOTA_WINDOW),
        input_tokens=30,
        output_tokens=20,
    )
    with pytest.raises(QuotaExceeded):
        await svc.invoke(
            actor=_actor(),
            model_id=model.id,
            req=ChatRequest(model="x", messages=[]),
        )
    # LLM client never invoked
    assert ctx["factory"].client.calls == []


@pytest.mark.asyncio
async def test_invoke_quota_exceeded_publishes_event() -> None:
    svc, ctx = _build_service()
    cred = await svc.register_credential(
        actor=_actor(),
        provider=ModelProvider.OPENAI,
        label="prod",
        api_key="sk-abc",
    )
    policy = make_routing_policy(
        tenant_id=TID,
        strategy=RoutingStrategy.PRIORITY,
        primary_model_id=ModelId(UUID(int=10)),
        selection_rules={"quota_cap_per_minute": 10},
    )
    await ctx["routing_repo"].add(policy)
    model = await svc.register(
        actor=_actor(),
        name="gpt4o",
        provider=ModelProvider.OPENAI,
        upstream_model="gpt-4o",
        credential_id=cred.id,
        routing_policy_id=policy.id,
    )
    await ctx["quota_repo"].increment(
        tenant_id=TID,
        model_id=model.id,
        window_start=bucket_start(ctx["clock"].now(), DEFAULT_QUOTA_WINDOW),
        input_tokens=10,
        output_tokens=0,
    )
    with pytest.raises(QuotaExceeded):
        await svc.invoke(
            actor=_actor(),
            model_id=model.id,
            req=ChatRequest(model="x", messages=[]),
        )
    topics = [t for t, _ in ctx["publisher"].published]
    assert "model.quota_exceeded" in topics


@pytest.mark.asyncio
async def test_invoke_routing_policy_missing_raises() -> None:
    svc, _ctx = _build_service()
    cred = await svc.register_credential(
        actor=_actor(),
        provider=ModelProvider.OPENAI,
        label="prod",
        api_key="sk-abc",
    )
    model = await svc.register(
        actor=_actor(),
        name="gpt4o",
        provider=ModelProvider.OPENAI,
        upstream_model="gpt-4o",
        credential_id=cred.id,
        routing_policy_id=RoutingPolicyId(UUID(int=99)),
    )
    with pytest.raises(RoutingPolicyNotFound):
        await svc.invoke(
            actor=_actor(),
            model_id=model.id,
            req=ChatRequest(model="x", messages=[]),
        )


@pytest.mark.asyncio
async def test_invoke_publishes_error_event_on_llm_failure() -> None:
    svc, ctx = _build_service()
    cred = await svc.register_credential(
        actor=_actor(),
        provider=ModelProvider.OPENAI,
        label="prod",
        api_key="sk-abc",
    )
    model = await svc.register(
        actor=_actor(),
        name="gpt4o",
        provider=ModelProvider.OPENAI,
        upstream_model="gpt-4o",
        credential_id=cred.id,
    )
    ctx["factory"].client.fail_next = True
    with pytest.raises(ModelError):
        await svc.invoke(
            actor=_actor(),
            model_id=model.id,
            req=ChatRequest(model="x", messages=[]),
        )
    topics_payloads = [(t, p) for t, p in ctx["publisher"].published]
    invoked_payloads = [p for t, p in topics_payloads if t == "model.invoked"]
    assert invoked_payloads
    assert invoked_payloads[-1]["status"] == "error"


@pytest.mark.asyncio
async def test_invoke_cross_tenant_returns_not_found() -> None:
    svc, _ = _build_service()
    cred = await svc.register_credential(
        actor=_actor(),
        provider=ModelProvider.OPENAI,
        label="prod",
        api_key="sk-abc",
    )
    model = await svc.register(
        actor=_actor(),
        name="gpt4o",
        provider=ModelProvider.OPENAI,
        upstream_model="gpt-4o",
        credential_id=cred.id,
    )
    other_actor = ActorContext(
        tenant_id=TenantId(UUID(int=99)),
        workspace_id=WID,
        principal_id=UID,
        roles=frozenset({"workspace_member"}),
    )
    with pytest.raises(ModelNotFound):
        await svc.invoke(
            actor=other_actor,
            model_id=model.id,
            req=ChatRequest(model="x", messages=[]),
        )


# ── list ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_models_filters_by_workspace_and_enabled() -> None:
    svc, _ = _build_service()
    await svc.register(
        actor=_actor(),
        name="ws-a",
        provider=ModelProvider.OPENAI,
        upstream_model="gpt-4o",
        workspace_id=WorkspaceId(UUID(int=100)),
    )
    await svc.register(
        actor=_actor(),
        name="ws-b",
        provider=ModelProvider.OPENAI,
        upstream_model="gpt-4o",
        workspace_id=WorkspaceId(UUID(int=200)),
    )
    await svc.register(
        actor=_actor(),
        name="tenant-default",
        provider=ModelProvider.OPENAI,
        upstream_model="gpt-4o",
    )
    # Workspace 100 sees only itself + tenant-default
    actor_ws100 = ActorContext(
        tenant_id=TID,
        workspace_id=WorkspaceId(UUID(int=100)),
        principal_id=UID,
        roles=frozenset({"workspace_member"}),
    )
    listed = await svc.list_models(actor=actor_ws100)
    names = {m.name for m in listed}
    assert names == {"ws-a", "tenant-default"}


@pytest.mark.asyncio
async def test_list_models_enabled_only() -> None:
    svc, ctx = _build_service()
    m = await svc.register(
        actor=_actor(),
        name="m",
        provider=ModelProvider.OPENAI,
        upstream_model="gpt-4o",
    )
    disabled = m.with_enabled(False)
    await ctx["model_repo"].update(disabled)
    listed = await svc.list_models(actor=_actor(), enabled_only=True)
    assert listed == []
    listed_all = await svc.list_models(actor=_actor())
    assert len(listed_all) == 1
