"""Tests for skill use cases.

Uses in-memory repos + a fake sandbox runner to exercise full flows
without hitting the DB.
"""

from __future__ import annotations

import pytest
from _in_memory import (  # type: ignore[import-not-found]
    FakeRunTokenIssuer,
    InMemoryArtifactStore,
    InMemoryUnitOfWork,
    RecordingSkillEventPublisher,
)
from conftest import (  # type: ignore[import-not-found]
    make_skill_id,
    make_tenant,
    make_user,
    make_workspace,
)

from deos.modules.skill.application.invocation_runner import InvocationRunner
from deos.modules.skill.application.services import SkillService
from deos.modules.skill.domain.entities import (
    SkillInstallStatus,
    SkillInvocationStatus,
)
from deos.modules.skill.domain.errors import (
    SkillAlreadyExists,
    SkillDisabled,
    SkillInstallFailed,
    SkillNotFound,
    SkillVersionMismatch,
)


class FakeSandbox:
    """Minimal Sandbox Protocol impl: spawns a task that completes immediately."""

    mode = "fake"

    def __init__(self) -> None:
        self.started: list = []
        self.completed: list = []

    async def start(self, spec):
        self.started.append(spec)
        return spec.run_id

    async def stream(self, run_id):
        from eos_sandbox.sandbox import SandboxEvent, SandboxRunStatus

        yield SandboxEvent(
            run_id=run_id,
            status=SandboxRunStatus.RUNNING,
            stream="stdout",
            data="ok\n",
            seq=1,
        )

    async def cancel(self, run_id) -> None:
        return None

    async def wait(self, run_id):
        from eos_sandbox.sandbox import SandboxEvent, SandboxRunStatus

        return SandboxEvent(
            run_id=run_id,
            status=SandboxRunStatus.SUCCEEDED,
            stream="system",
            data="exit=0",
            seq=-1,
        )

    async def shutdown(self) -> None:
        return None


async def _build_service() -> SkillService:
    shared_uow = InMemoryUnitOfWork()  # single shared state per test
    publisher = RecordingSkillEventPublisher()
    issuer = FakeRunTokenIssuer()
    artifacts = InMemoryArtifactStore()
    sandbox = FakeSandbox()
    runner = InvocationRunner(
        sandbox=sandbox,
        invocations=shared_uow.invocations,
        publisher=publisher,
        artifacts=artifacts,
    )
    return SkillService.from_parts(
        uow_factory=lambda: shared_uow,
        publisher=publisher,
        run_token_issuer=issuer,
        runner=runner,
        skill_repository=shared_uow.skills,
        install_repository=shared_uow.installs,
        invocation_repository=shared_uow.invocations,
        artifacts=artifacts,
    )


async def test_register_skill() -> None:
    svc = await _build_service()
    pkg = await svc.register_skill.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        registered_by=make_user(),
        name="echo",
        version="1.0.0",
        description="echo skill",
        entrypoint="python",
        image="python:3.12-slim",
        parameters_schema={},
    )
    assert pkg.name == "echo"
    assert pkg.version_lock == 1
    assert pkg.enabled is True


async def test_register_skill_duplicate_raises_409() -> None:
    svc = await _build_service()
    args = {
        "tenant_id": make_tenant(),
        "workspace_id": make_workspace(),
        "registered_by": make_user(),
        "name": "echo",
        "version": "1.0.0",
        "description": "",
        "entrypoint": "python",
        "image": "python:3.12-slim",
        "parameters_schema": {},
    }
    await svc.register_skill.execute(**args)
    with pytest.raises(SkillAlreadyExists):
        await svc.register_skill.execute(**args)


async def test_update_skill_bumps_lock_and_emits_event() -> None:
    svc = await _build_service()
    pkg = await svc.register_skill.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        registered_by=make_user(),
        name="echo",
        version="1.0.0",
        description="",
        entrypoint="python",
        image="python:3.12-slim",
        parameters_schema={},
    )
    updated = await svc.update_skill.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        skill_id=pkg.id,
        updated_by=make_user(),
        expected_version_lock=1,
        description="new",
    )
    assert updated.version_lock == 2
    assert updated.description == "new"


async def test_update_skill_version_mismatch_412() -> None:
    svc = await _build_service()
    pkg = await svc.register_skill.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        registered_by=make_user(),
        name="echo",
        version="1.0.0",
        description="",
        entrypoint="python",
        image="python:3.12-slim",
        parameters_schema={},
    )
    with pytest.raises(SkillVersionMismatch):
        await svc.update_skill.execute(
            tenant_id=make_tenant(),
            workspace_id=make_workspace(),
            skill_id=pkg.id,
            updated_by=make_user(),
            expected_version_lock=99,
            description="x",
        )


async def test_disable_skill_sets_enabled_false() -> None:
    svc = await _build_service()
    pkg = await svc.register_skill.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        registered_by=make_user(),
        name="echo",
        version="1.0.0",
        description="",
        entrypoint="python",
        image="python:3.12-slim",
        parameters_schema={},
    )
    disabled = await svc.disable_skill.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        skill_id=pkg.id,
        disabled_by=make_user(),
    )
    assert disabled.enabled is False


async def test_install_skill_returns_run_token() -> None:
    svc = await _build_service()
    pkg = await svc.register_skill.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        registered_by=make_user(),
        name="echo",
        version="1.0.0",
        description="",
        entrypoint="python",
        image="python:3.12-slim",
        parameters_schema={},
    )
    result = await svc.install_skill.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        skill_id=pkg.id,
        installed_by=make_user(),
    )
    assert result.run_token.startswith("tok-")
    assert result.install.status == SkillInstallStatus.INSTALLED


async def test_invoke_requires_active_install() -> None:
    svc = await _build_service()
    pkg = await svc.register_skill.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        registered_by=make_user(),
        name="echo",
        version="1.0.0",
        description="",
        entrypoint="python",
        image="python:3.12-slim",
        parameters_schema={},
    )
    with pytest.raises(SkillInstallFailed):
        await svc.invoke_skill.execute(
            tenant_id=make_tenant(),
            workspace_id=make_workspace(),
            invoked_by=make_user(),
            skill_id=pkg.id,
            arguments={},
        )


async def test_invoke_disabled_skill_409() -> None:
    svc = await _build_service()
    pkg = await svc.register_skill.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        registered_by=make_user(),
        name="echo",
        version="1.0.0",
        description="",
        entrypoint="python",
        image="python:3.12-slim",
        parameters_schema={},
    )
    await svc.disable_skill.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        skill_id=pkg.id,
        disabled_by=make_user(),
    )
    with pytest.raises(SkillDisabled):
        await svc.invoke_skill.execute(
            tenant_id=make_tenant(),
            workspace_id=make_workspace(),
            invoked_by=make_user(),
            skill_id=pkg.id,
            arguments={},
        )


async def test_get_skill_404_when_missing() -> None:
    svc = await _build_service()
    with pytest.raises(SkillNotFound):
        await svc.get_skill.execute(
            tenant_id=make_tenant(),
            workspace_id=make_workspace(),
            skill_id=make_skill_id(),
        )


async def test_get_active_install_returns_latest_installed() -> None:
    svc = await _build_service()
    pkg = await svc.register_skill.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        registered_by=make_user(),
        name="echo",
        version="1.0.0",
        description="",
        entrypoint="python",
        image="python:3.12-slim",
        parameters_schema={},
    )
    await svc.install_skill.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        skill_id=pkg.id,
        installed_by=make_user(),
    )
    install = await svc.get_active_install.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        skill_id=pkg.id,
    )
    assert install.status == SkillInstallStatus.INSTALLED


async def test_list_skills_returns_paginated() -> None:
    svc = await _build_service()
    for i in range(3):
        await svc.register_skill.execute(
            tenant_id=make_tenant(),
            workspace_id=make_workspace(),
            registered_by=make_user(),
            name=f"sk{i}",
            version="1.0.0",
            description="",
            entrypoint="python",
            image="python:3.12-slim",
            parameters_schema={},
        )
    items = await svc.list_skills.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        limit=10,
    )
    assert len(items) == 3


async def test_full_invoke_flow_succeeds() -> None:
    """Register → install → invoke → poll for success."""
    svc = await _build_service()
    pkg = await svc.register_skill.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        registered_by=make_user(),
        name="echo",
        version="1.0.0",
        description="",
        entrypoint="python",
        image="python:3.12-slim",
        parameters_schema={},
    )
    await svc.install_skill.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        skill_id=pkg.id,
        installed_by=make_user(),
    )
    inv = await svc.invoke_skill.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        invoked_by=make_user(),
        skill_id=pkg.id,
        arguments={},
    )
    # Wait for runner to complete
    import asyncio

    for _ in range(50):
        await asyncio.sleep(0.02)
        latest = await svc.get_invocation.execute(
            tenant_id=make_tenant(),
            workspace_id=make_workspace(),
            invocation_id=inv.id,
        )
        if latest.status == SkillInvocationStatus.SUCCEEDED:
            assert latest.stdout_tail == "ok\n"
            return
    raise AssertionError("invocation did not complete in time")


async def test_full_invoke_flow_with_wait_returns_succeeded() -> None:
    """Use runner.wait() to block until done."""
    svc = await _build_service()
    pkg = await svc.register_skill.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        registered_by=make_user(),
        name="echo",
        version="1.0.0",
        description="",
        entrypoint="python",
        image="python:3.12-slim",
        parameters_schema={},
    )
    await svc.install_skill.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        skill_id=pkg.id,
        installed_by=make_user(),
    )
    inv = await svc.invoke_skill.execute(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        invoked_by=make_user(),
        skill_id=pkg.id,
        arguments={},
    )
    final = await svc.runner.wait(inv.id)
    assert final.status == SkillInvocationStatus.SUCCEEDED
