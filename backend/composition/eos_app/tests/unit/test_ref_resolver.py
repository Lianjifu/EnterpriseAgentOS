"""Tests for the boot-time ``EOS_*_REF`` → ``EOS_*`` translator.

The translator mutates ``os.environ`` in place, so each test must
snapshot + restore via :func:`monkeypatch` (pytest already isolates the
process, but we still want explicit cleanup so a failed assertion
doesn't leak into the next test).
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path
from uuid import UUID

import pytest

from deos.composition.ref_resolver import (
    _BOOT_ACTOR,
    resolve_ref_env,
    resolve_ref_env_sync,
)


@pytest.fixture(autouse=True)
def _isolate_eos_env(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Purge every ``EOS_*`` env var before each test.

    The resolver mutates ``os.environ`` directly (via ``os.environ[...] =
    ...``), which is outside monkeypatch's tracking.  Without an explicit
    purge, a csi resolution in test A (``EOS_DATABASE_URL=hunter2``)
    leaks into test B's environment.

    The fixture runs BEFORE monkeypatch.setenv() calls in the test body,
    so test bodies can still set ``EOS_FOO_REF`` cleanly and rely on
    monkeypatch teardown to undo.  Real prod env (no ``EOS_*`` vars set)
    is unaffected.
    """
    for key in [k for k in os.environ if k.startswith("EOS_")]:
        monkeypatch.delenv(key, raising=False)
    yield


# ── scenario: csi: scheme (the A4/CSI prod path) ────────────────────────────


@pytest.mark.asyncio
async def test_csi_ref_resolved_into_bare_env_var(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    (tmp_path / "EOS_DB_PASSWORD").write_text("hunter2\n")
    monkeypatch.setenv("EOS_CSI_VAULT_ROOT", str(tmp_path))
    monkeypatch.setenv("EOS_DATABASE_URL_REF", "csi:EOS_DB_PASSWORD")

    count = await resolve_ref_env()

    assert count == 1
    assert os.environ["EOS_DATABASE_URL"] == "hunter2"


@pytest.mark.asyncio
async def test_csi_missing_mount_raises_runtime_error(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("EOS_CSI_VAULT_ROOT", str(tmp_path))
    monkeypatch.setenv("EOS_JWT_SECRET_REF", "csi:EOS_JWT_SECRET_NEVER_MOUNTED")

    with pytest.raises(RuntimeError, match="EOS_JWT_SECRET_REF"):
        await resolve_ref_env()


# ── scenario: file: scheme (dev / staging mounts) ──────────────────────────


@pytest.mark.asyncio
async def test_file_ref_reads_value(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    secret = tmp_path / "secret.txt"
    secret.write_text("opaque-blob\n")
    monkeypatch.setenv("EOS_MODEL_MASTER_KEY_REF", f"file:{secret}")

    count = await resolve_ref_env()
    assert count == 1
    assert os.environ["EOS_MODEL_MASTER_KEY"] == "opaque-blob"


# ── scenario: env: scheme (indirection through process env) ───────────────


@pytest.mark.asyncio
async def test_env_ref_picks_up_named_env_var(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("INNER_OPENAI_KEY", "sk-from-env")
    monkeypatch.setenv("EOS_OPENAI_API_KEY_REF", "env:INNER_OPENAI_KEY")

    count = await resolve_ref_env()
    assert count == 1
    assert os.environ["EOS_OPENAI_API_KEY"] == "sk-from-env"


# ── scenario: noop / unknown scheme is left untouched ─────────────────────


@pytest.mark.asyncio
async def test_unknown_scheme_is_skipped(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("EOS_DATABASE_URL_REF", "future-scheme:nope")
    count = await resolve_ref_env()
    assert count == 0
    assert "EOS_DATABASE_URL" not in os.environ


# ── scenario: env vars not matching the pattern are untouched ──────────────


@pytest.mark.asyncio
async def test_non_eos_ref_vars_untouched(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PATH", "/usr/bin")  # not EOS_*_REF
    monkeypatch.setenv("FOO_BAR_REF", "csi:whatever")  # not EOS_*
    count = await resolve_ref_env()
    assert count == 0
    assert os.environ["PATH"] == "/usr/bin"


# ── scenario: multiple REFs in one boot pass ───────────────────────────────


@pytest.mark.asyncio
async def test_multiple_refs_all_resolved(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    (tmp_path / "K1").write_text("v1\n")
    (tmp_path / "K2").write_text("v2\n")
    monkeypatch.setenv("EOS_CSI_VAULT_ROOT", str(tmp_path))
    monkeypatch.setenv("EOS_A_REF", "csi:K1")
    monkeypatch.setenv("EOS_B_REF", "csi:K2")
    monkeypatch.setenv("INNER_C", "v3")
    monkeypatch.setenv("EOS_C_REF", "env:INNER_C")

    count = await resolve_ref_env()
    assert count == 3
    assert os.environ["EOS_A"] == "v1"
    assert os.environ["EOS_B"] == "v2"
    assert os.environ["EOS_C"] == "v3"


# ── sync wrapper drives the async resolver via asyncio.run ────────────────


def test_sync_wrapper_returns_same_count(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    (tmp_path / "S").write_text("sync\n")
    monkeypatch.setenv("EOS_CSI_VAULT_ROOT", str(tmp_path))
    monkeypatch.setenv("EOS_RUN_TOKEN_SECRET_REF", "csi:S")

    count = resolve_ref_env_sync()
    assert count == 1
    assert os.environ["EOS_RUN_TOKEN_SECRET"] == "sync"


# ── _BOOT_ACTOR is a fixed system actor ────────────────────────────────────


def test_boot_actor_has_placeholder_tenant() -> None:
    assert isinstance(_BOOT_ACTOR.tenant_id, UUID)
    assert _BOOT_ACTOR.principal_id is None
    assert _BOOT_ACTOR.roles == frozenset()
