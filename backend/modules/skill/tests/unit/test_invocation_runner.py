"""Tests for InvocationRunner — happy path / timeout / cancel."""

from __future__ import annotations

import asyncio
import sys

import pytest
from _in_memory import (  # type: ignore[import-not-found]
    InMemoryArtifactStore,
    InMemoryInvocationRepository,
    InMemoryUnitOfWork,
    RecordingSkillEventPublisher,
)
from conftest import (  # type: ignore[import-not-found]
    make_tenant,
    make_workspace,
)
from eos_sandbox.sandbox import SandboxEvent, SandboxRunStatus

from deos.modules.skill.application.invocation_runner import (
    InvocationRunner,
    StdoutStderrTails,
)
from deos.modules.skill.domain.entities import (
    SkillInstall,
    SkillInvocation,
    SkillInvocationStatus,
    SkillPackage,
)
from deos.modules.skill.domain.errors import SandboxTimeout


class FastSandbox:
    """Sandbox that completes immediately with one stdout event."""

    mode = "fast"

    async def start(self, spec):
        return spec.run_id

    async def stream(self, run_id):
        yield SandboxEvent(
            run_id=run_id,
            status=SandboxRunStatus.RUNNING,
            stream="stdout",
            data="hi\n",
            seq=1,
        )

    async def cancel(self, run_id) -> None:
        return None

    async def wait(self, run_id):
        return SandboxEvent(
            run_id=run_id,
            status=SandboxRunStatus.SUCCEEDED,
            stream="system",
            data="exit=0",
            seq=-1,
        )

    async def shutdown(self) -> None:
        return None


class HangingSandbox:
    """Sandbox whose stream finishes but wait() hangs (triggers timeout in runner)."""

    mode = "hanging"

    def __init__(self) -> None:
        self._cancelled = False

    async def start(self, spec):
        return spec.run_id

    async def stream(self, run_id):
        yield SandboxEvent(
            run_id=run_id,
            status=SandboxRunStatus.RUNNING,
            stream="stdout",
            data="starting\n",
            seq=1,
        )

    async def cancel(self, run_id) -> None:
        self._cancelled = True

    async def wait(self, run_id):
        await asyncio.sleep(60)

    async def shutdown(self) -> None:
        self._cancelled = True


def _pkg() -> SkillPackage:
    return SkillPackage.create(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        name="echo",
        version="1.0.0",
        description="",
        entrypoint=sys.executable,
        image="python:3.12-slim",
        parameters_schema={},
        timeout_seconds=2,
    )


def _inv(pkg: SkillPackage) -> SkillInvocation:
    return SkillInvocation.create(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        install_id=__import__("uuid").uuid4(),
        package_id=pkg.id,
        arguments={},
    )


def _install(pkg: SkillPackage) -> SkillInstall:
    return SkillInstall.create(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        package_id=pkg.id,
        package_version_lock=1,
        installed_by=__import__("uuid").uuid4(),
    ).succeed(jti="jti-test")


async def test_runner_happy_path() -> None:
    uow = InMemoryUnitOfWork()
    pub = RecordingSkillEventPublisher()
    artifacts = InMemoryArtifactStore()
    runner = InvocationRunner(
        sandbox=FastSandbox(),
        invocations=uow.invocations,
        publisher=pub,
        artifacts=artifacts,
    )
    pkg = _pkg()
    inv = _inv(pkg)
    install = _install(pkg)
    await runner.start(invocation=inv, package=pkg, install=install)
    final = await runner.wait(inv.id)
    assert final.status == SkillInvocationStatus.SUCCEEDED
    assert final.stdout_tail == "hi\n"


async def test_runner_cancel_is_idempotent() -> None:
    uow = InMemoryUnitOfWork()
    pub = RecordingSkillEventPublisher()
    artifacts = InMemoryArtifactStore()
    runner = InvocationRunner(
        sandbox=FastSandbox(),
        invocations=uow.invocations,
        publisher=pub,
        artifacts=artifacts,
    )
    pkg = _pkg()
    inv = _inv(pkg)
    install = _install(pkg)
    await runner.start(invocation=inv, package=pkg, install=install)
    await asyncio.sleep(0)  # let the task actually start
    # Cancel may race with the FastSandbox finishing immediately. Either
    # SUCCEEDED (FastSandbox won) or CANCELLED (cancel won) is acceptable —
    # we just assert idempotency: cancel twice doesn't error and wait()
    # returns a terminal row.
    await runner.cancel(inv.id)
    await runner.cancel(inv.id)
    final = await runner.wait(inv.id)
    assert final.status in (
        SkillInvocationStatus.SUCCEEDED,
        SkillInvocationStatus.CANCELLED,
    )


async def test_runner_cancel_unknown_task_is_noop() -> None:
    runner = InvocationRunner(
        sandbox=FastSandbox(),
        invocations=InMemoryInvocationRepository(),
        publisher=RecordingSkillEventPublisher(),
        artifacts=InMemoryArtifactStore(),
    )
    await runner.cancel(__import__("uuid").uuid4())  # no error


async def test_runner_timeout_persists_status() -> None:
    uow = InMemoryUnitOfWork()
    pub = RecordingSkillEventPublisher()
    artifacts = InMemoryArtifactStore()
    sandbox = HangingSandbox()
    runner = InvocationRunner(
        sandbox=sandbox,
        invocations=uow.invocations,
        publisher=pub,
        artifacts=artifacts,
        default_timeout_seconds=1,
    )
    pkg = _pkg()
    inv = _inv(pkg)
    install = _install(pkg)
    await runner.start(invocation=inv, package=pkg, install=install)
    # Wait beyond default_timeout
    await asyncio.sleep(2.5)
    latest = await uow.invocations.get(tenant_id=make_tenant(), invocation_id=inv.id)
    assert latest.status == SkillInvocationStatus.TIMED_OUT
    assert latest.error_code == "SANDBOX_TIMEOUT"
    await sandbox.shutdown()


async def test_runner_wait_raises_sandbox_timeout_when_hung() -> None:
    uow = InMemoryUnitOfWork()
    pub = RecordingSkillEventPublisher()
    artifacts = InMemoryArtifactStore()
    sandbox = HangingSandbox()
    runner = InvocationRunner(
        sandbox=sandbox,
        invocations=uow.invocations,
        publisher=pub,
        artifacts=artifacts,
        default_timeout_seconds=1,
    )
    pkg = _pkg()
    inv = _inv(pkg)
    install = _install(pkg)
    await runner.start(invocation=inv, package=pkg, install=install)
    with pytest.raises(SandboxTimeout):
        await runner.wait(inv.id)
    await sandbox.shutdown()


def test_stdout_stderr_tails_caps_length() -> None:
    tails = StdoutStderrTails(cap=10)
    tails.append(
        SandboxEvent(
            run_id=__import__("uuid").uuid4(),
            status=SandboxRunStatus.RUNNING,
            stream="stdout",
            data="abcdefghijklmnop",
            seq=1,
        )
    )
    assert len(tails.stdout) == 10
    assert tails.stdout == "ghijklmnop"
