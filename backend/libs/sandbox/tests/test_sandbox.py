"""Tests for sandbox (run_token + local + spec shape)."""

from __future__ import annotations

import asyncio
import sys
from uuid import uuid4

import pytest
from eos_kernel.errors import AuthenticationError

from eos_sandbox.local import LocalSandbox
from eos_sandbox.run_token import issue_run_token, verify_run_token
from eos_sandbox.sandbox import SandboxRunSpec, SandboxRunStatus

SECRET = "test-secret"


def test_run_token_round_trip() -> None:
    tok = issue_run_token(
        secret=SECRET,
        skill_id=uuid4(),
        tenant_id=uuid4(),
        workspace_id=uuid4(),
        ttl_seconds=60,
    )
    parsed = verify_run_token(tok.raw, secret=SECRET)
    assert parsed.skill_id == tok.skill_id
    assert parsed.tenant_id == tok.tenant_id
    assert parsed.workspace_id == tok.workspace_id
    assert not parsed.is_expired


def test_run_token_bad_sig() -> None:
    tok = issue_run_token(
        secret=SECRET,
        skill_id=uuid4(),
        tenant_id=uuid4(),
        workspace_id=uuid4(),
    )
    with pytest.raises(AuthenticationError) as exc:
        verify_run_token(tok.raw + ".tamper", secret=SECRET)
    assert exc.value.code == "RUN_TOKEN_BAD_SIG"


def test_run_token_wrong_secret() -> None:
    tok = issue_run_token(
        secret=SECRET,
        skill_id=uuid4(),
        tenant_id=uuid4(),
        workspace_id=uuid4(),
    )
    with pytest.raises(AuthenticationError):
        verify_run_token(tok.raw, secret="different-secret")


def test_run_token_expired() -> None:
    tok = issue_run_token(
        secret=SECRET,
        skill_id=uuid4(),
        tenant_id=uuid4(),
        workspace_id=uuid4(),
        ttl_seconds=-1,
    )
    parsed = verify_run_token(tok.raw, secret=SECRET)
    assert parsed.is_expired


def test_run_token_malformed() -> None:
    with pytest.raises(AuthenticationError):
        verify_run_token("not-a-token", secret=SECRET)


# ── LocalSandbox ──────────────────────────────────────────────────────────────


def _spec(command: tuple[str, ...]) -> SandboxRunSpec:
    return SandboxRunSpec(
        run_id=uuid4(),
        tenant_id=uuid4(),
        workspace_id=uuid4(),
        skill_id=uuid4(),
        command=command,
    )


async def test_local_sandbox_happy_path_python() -> None:
    sb = LocalSandbox()
    spec = _spec((sys.executable, "-c", "print('hello')"))
    run_id = await sb.start(spec)
    events = [ev async for ev in sb.stream(run_id)]
    terminal = await sb.wait(run_id)
    assert any(ev.data.strip() == "hello" for ev in events)
    assert terminal.status == SandboxRunStatus.SUCCEEDED
    assert terminal.data == "exit=0"


async def test_local_sandbox_failure_exit_code() -> None:
    sb = LocalSandbox()
    spec = _spec((sys.executable, "-c", "import sys; sys.exit(7)"))
    run_id = await sb.start(spec)
    async for _ in sb.stream(run_id):
        pass
    terminal = await sb.wait(run_id)
    assert terminal.status == SandboxRunStatus.FAILED
    assert "7" in terminal.data


async def test_local_sandbox_stderr_interleaved() -> None:
    """Both stdout and stderr are streamed and tagged."""
    sb = LocalSandbox()
    spec = _spec(
        (
            sys.executable,
            "-c",
            "import sys; print('OUT'); sys.stderr.write('ERR\\n'); sys.stderr.flush()",
        )
    )
    run_id = await sb.start(spec)
    events = [ev async for ev in sb.stream(run_id)]
    streams = {ev.stream for ev in events}
    assert "stdout" in streams
    assert "stderr" in streams
    assert any(ev.stream == "stderr" and "ERR" in ev.data for ev in events)


async def test_local_sandbox_cancel_mid_stream() -> None:
    sb = LocalSandbox()
    spec = _spec(
        (
            sys.executable,
            "-c",
            "import time; [print(i) or time.sleep(0.5) for i in range(20)]",
        )
    )
    run_id = await sb.start(spec)

    async def consume_a_few() -> None:
        n = 0
        async for _ in sb.stream(run_id):
            n += 1
            if n >= 2:
                return

    consumer = asyncio.create_task(consume_a_few())
    await asyncio.sleep(0.1)
    await sb.cancel(run_id)
    await consumer
    # Proc should be gone or terminated.
    await sb.shutdown()


async def test_local_sandbox_spec_image_default() -> None:
    spec = _spec((sys.executable, "-c", "pass"))
    assert spec.image == "python:3.12-slim"


async def test_local_sandbox_spec_image_override() -> None:
    spec = SandboxRunSpec(
        run_id=uuid4(),
        tenant_id=uuid4(),
        workspace_id=uuid4(),
        skill_id=uuid4(),
        command=(sys.executable, "-c", "pass"),
        image="alpine:3.20",
    )
    assert spec.image == "alpine:3.20"
