"""Unit tests for ``modules/model.domain.entities`` + errors + events.

No async; pure domain construction + validation.
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

import pytest
from eos_schema.ids import (
    CredentialId,
    ModelId,
    RoutingPolicyId,
    TenantId,
    WorkspaceId,
)

from deos.modules.model.domain.entities import (
    QuotaCounter,
    bucket_start,
    make_credential,
    make_model,
    make_routing_policy,
)
from deos.modules.model.domain.errors import (
    CredentialNotFound,
    InvalidModelSpec,
    ModelAlreadyExists,
    ModelDisabled,
    ModelError,
    ModelNotFound,
    QuotaExceeded,
    RoutingPolicyNotFound,
)
from deos.modules.model.domain.events import (
    ModelCredentialRotated,
    ModelInvoked,
    ModelQuotaExceeded,
    ModelRegistered,
)
from deos.modules.model.domain.value_objects import (
    ModelProvider,
    RoutingStrategy,
)

TID = TenantId(UUID(int=1))
WID = WorkspaceId(UUID(int=2))
UID = UUID(int=3)
MID = ModelId(UUID(int=10))
CID = CredentialId(UUID(int=11))
RID = RoutingPolicyId(UUID(int=12))


# ── make_model ─────────────────────────────────────────────────────────────


def test_make_model_assigns_id_and_timestamps() -> None:
    m = make_model(
        tenant_id=TID,
        workspace_id=None,
        name="gpt4o",
        provider=ModelProvider.OPENAI,
        upstream_model="gpt-4o",
    )
    assert isinstance(m.id, UUID)
    assert m.name == "gpt4o"
    assert m.upstream_model == "gpt-4o"
    assert m.provider == ModelProvider.OPENAI
    assert m.enabled is True
    assert m.credential_id is None
    assert m.routing_policy_id is None


def test_make_model_validates_name_length() -> None:
    with pytest.raises(ValueError):
        make_model(
            tenant_id=TID,
            workspace_id=None,
            name="",
            provider=ModelProvider.MOCK,
            upstream_model="m",
        )
    with pytest.raises(ValueError):
        make_model(
            tenant_id=TID,
            workspace_id=None,
            name="x" * 257,
            provider=ModelProvider.MOCK,
            upstream_model="m",
        )


def test_make_model_validates_upstream_length() -> None:
    with pytest.raises(ValueError):
        make_model(
            tenant_id=TID,
            workspace_id=None,
            name="ok",
            provider=ModelProvider.MOCK,
            upstream_model="",
        )


def test_make_model_attaches_credential_and_policy() -> None:
    m = make_model(
        tenant_id=TID,
        workspace_id=WID,
        name="claude",
        provider=ModelProvider.ANTHROPIC,
        upstream_model="claude-sonnet-4.5",
        credential_id=CID,
        routing_policy_id=RID,
    )
    assert m.credential_id == CID
    assert m.routing_policy_id == RID
    assert m.workspace_id == WID


def test_make_model_accepts_explicit_id_and_now() -> None:
    ts = datetime(2026, 9, 22, tzinfo=UTC)
    m = make_model(
        tenant_id=TID,
        workspace_id=None,
        name="m",
        provider=ModelProvider.MOCK,
        upstream_model="echo",
        model_id=MID,
        now=ts,
    )
    assert m.id == MID
    assert m.created_at == ts
    assert m.updated_at == ts


# ── Model.with_* ──────────────────────────────────────────────────────────


def test_model_with_enabled_updates_timestamp() -> None:
    m0 = make_model(
        tenant_id=TID,
        workspace_id=None,
        name="m",
        provider=ModelProvider.MOCK,
        upstream_model="echo",
        now=datetime(2026, 1, 1, tzinfo=UTC),
    )
    m1 = m0.with_enabled(False)
    assert m1.enabled is False
    assert m1.id == m0.id
    assert m1.created_at == m0.created_at
    assert m1.updated_at > m0.updated_at


def test_model_with_credential() -> None:
    m0 = make_model(
        tenant_id=TID,
        workspace_id=None,
        name="m",
        provider=ModelProvider.MOCK,
        upstream_model="echo",
    )
    m1 = m0.with_credential(CID)
    assert m1.credential_id == CID
    assert m0.credential_id is None


def test_model_with_routing_policy() -> None:
    m0 = make_model(
        tenant_id=TID,
        workspace_id=None,
        name="m",
        provider=ModelProvider.MOCK,
        upstream_model="echo",
    )
    m1 = m0.with_routing_policy(RID)
    assert m1.routing_policy_id == RID


# ── make_credential ───────────────────────────────────────────────────────


def test_make_credential_round_trip() -> None:
    c = make_credential(
        tenant_id=TID,
        provider=ModelProvider.OPENAI,
        label="prod-openai",
        encrypted_payload=b"\x00" * 64,
    )
    assert c.tenant_id == TID
    assert c.provider == ModelProvider.OPENAI
    assert c.label == "prod-openai"
    assert c.key_version == 1
    assert c.rotated_at is None


def test_make_credential_validates_label_and_payload() -> None:
    with pytest.raises(ValueError):
        make_credential(
            tenant_id=TID,
            provider=ModelProvider.OPENAI,
            label="",
            encrypted_payload=b"x",
        )
    with pytest.raises(ValueError):
        make_credential(
            tenant_id=TID,
            provider=ModelProvider.OPENAI,
            label="ok",
            encrypted_payload=b"",
        )


def test_credential_with_rotated_updates_timestamp_and_version() -> None:
    c0 = make_credential(
        tenant_id=TID,
        provider=ModelProvider.OPENAI,
        label="prod",
        encrypted_payload=b"old",
        now=datetime(2026, 1, 1, tzinfo=UTC),
    )
    c1 = c0.with_rotated(encrypted_payload=b"new", key_version=2)
    assert c1.encrypted_payload == b"new"
    assert c1.key_version == 2
    assert c1.rotated_at is not None
    assert c1.rotated_at > c0.created_at
    assert c1.id == c0.id


# ── make_routing_policy ──────────────────────────────────────────────────


def test_make_routing_policy_priority_requires_primary() -> None:
    with pytest.raises(ValueError):
        make_routing_policy(
            tenant_id=TID,
            strategy=RoutingStrategy.PRIORITY,
            primary_model_id=None,
        )


def test_make_routing_policy_round_trip() -> None:
    p = make_routing_policy(
        tenant_id=TID,
        strategy=RoutingStrategy.COST_OPTIM,
        primary_model_id=MID,
        failover_model_ids=[MID, MID],
        selection_rules={"cost_per_1k_max": 0.01},
    )
    assert p.strategy == RoutingStrategy.COST_OPTIM
    assert p.primary_model_id == MID
    assert len(p.failover_model_ids) == 2
    assert p.selection_rules["cost_per_1k_max"] == 0.01


def test_routing_policy_defaults() -> None:
    p = make_routing_policy(
        tenant_id=TID,
        strategy=RoutingStrategy.TENANT_DEFAULT,
    )
    assert p.primary_model_id is None
    assert p.failover_model_ids == []
    assert p.selection_rules == {}
    assert p.version_lock == 1


# ── QuotaCounter ──────────────────────────────────────────────────────────


def test_quota_counter_total_tokens() -> None:
    qc = QuotaCounter(
        tenant_id=TID,
        model_id=MID,
        window_start=datetime(2026, 9, 22, 12, 0, tzinfo=UTC),
        input_tokens=10,
        output_tokens=20,
        requests=3,
    )
    assert qc.total_tokens() == 30


def test_quota_counter_defaults_zero() -> None:
    qc = QuotaCounter(
        tenant_id=TID,
        model_id=MID,
        window_start=datetime(2026, 9, 22, 12, 0, tzinfo=UTC),
    )
    assert qc.input_tokens == 0
    assert qc.output_tokens == 0
    assert qc.requests == 0


# ── bucket_start ──────────────────────────────────────────────────────────


def test_bucket_start_minute() -> None:
    ts = datetime(2026, 9, 22, 12, 34, 56, 789, tzinfo=UTC)
    assert bucket_start(ts, "minute") == datetime(2026, 9, 22, 12, 34, tzinfo=UTC)


def test_bucket_start_hour() -> None:
    ts = datetime(2026, 9, 22, 12, 34, 56, tzinfo=UTC)
    assert bucket_start(ts, "hour") == datetime(2026, 9, 22, 12, tzinfo=UTC)


def test_bucket_start_day() -> None:
    ts = datetime(2026, 9, 22, 12, 34, tzinfo=UTC)
    assert bucket_start(ts, "day") == datetime(2026, 9, 22, tzinfo=UTC)


def test_bucket_start_naive_assumes_utc() -> None:
    ts = datetime(2026, 9, 22, 12, 34, 56)  # noqa: DTZ001 — naive input is the test premise
    assert bucket_start(ts, "minute").tzinfo == UTC


def test_bucket_start_rejects_unknown_window() -> None:
    with pytest.raises(ValueError):
        bucket_start(datetime.now(UTC), "week")


# ── error hierarchy ───────────────────────────────────────────────────────


def test_errors_inherit_app_error() -> None:
    from eos_kernel.errors import AppError

    for cls in (
        ModelError,
        ModelNotFound,
        ModelAlreadyExists,
        ModelDisabled,
        CredentialNotFound,
        RoutingPolicyNotFound,
        QuotaExceeded,
        InvalidModelSpec,
    ):
        assert issubclass(cls, AppError), cls


def test_quota_exceeded_returns_429() -> None:
    err = QuotaExceeded("cap hit", code="QUOTA_EXCEEDED")
    assert err.status == 429


def test_model_disabled_returns_403() -> None:
    err = ModelDisabled("model off", code="MODEL_DISABLED")
    assert err.status == 403


def test_model_already_exists_returns_409() -> None:
    err = ModelAlreadyExists("dup", code="MODEL_ALREADY_EXISTS")
    assert err.status == 409


def test_invalid_model_spec_returns_422() -> None:
    err = InvalidModelSpec("bad", code="INVALID_MODEL_SPEC")
    assert err.status == 422


def test_not_found_errors_return_404() -> None:
    for cls in (ModelNotFound, CredentialNotFound, RoutingPolicyNotFound):
        assert cls("missing", code=cls.code).status == 404


# ── events ────────────────────────────────────────────────────────────────


def test_model_registered_topic_and_payload() -> None:
    e = ModelRegistered(
        tenant_id=TID,
        actor_id=None,
        model_id=MID,
        provider="openai",
        upstream_model="gpt-4o",
    )
    assert e.TOPIC == "model.registered"
    payload = e.to_payload()
    assert payload["model_id"] == str(MID)
    assert payload["provider"] == "openai"
    assert payload["actor_id"] is None


def test_model_invoked_payload_round_trip() -> None:
    e = ModelInvoked(
        tenant_id=TID,
        actor_id=None,
        model_id=MID,
        provider="openai",
        input_tokens=10,
        output_tokens=20,
        latency_ms=123,
        status="ok",
        error_code=None,
    )
    assert e.TOPIC == "model.invoked"
    p = e.to_payload()
    assert p["input_tokens"] == 10
    assert p["latency_ms"] == 123
    assert p["status"] == "ok"


def test_model_quota_exceeded_payload() -> None:
    e = ModelQuotaExceeded(
        tenant_id=TID,
        actor_id=None,
        model_id=MID,
        window_start=datetime(2026, 9, 22, 12, tzinfo=UTC),
        used_tokens=100_000,
        cap_tokens=100_000,
    )
    assert e.TOPIC == "model.quota_exceeded"
    p = e.to_payload()
    assert p["used_tokens"] == 100_000


def test_model_credential_rotated_payload() -> None:
    e = ModelCredentialRotated(
        tenant_id=TID,
        actor_id=None,
        credential_id=CID,
        provider="openai",
        key_version=2,
    )
    assert e.TOPIC == "model.credential_rotated"
    assert e.to_payload()["key_version"] == 2
