"""Unit tests for skill domain layer."""

from __future__ import annotations

import pytest
from conftest import (  # type: ignore[import-not-found]
    make_skill_id,
    make_tenant,
    make_user,
    make_workspace,
)

from deos.modules.skill.domain.entities import (
    NetworkPolicy,
    SkillInstall,
    SkillInstallStatus,
    SkillInvocation,
    SkillInvocationStatus,
    SkillPackage,
)
from deos.modules.skill.domain.errors import (
    InvalidSkillSpec,
    SkillInvocationAlreadyTerminal,
    SkillVersionMismatch,
)


def _pkg(**overrides: object) -> SkillPackage:
    kw = {
        "tenant_id": make_tenant(),
        "workspace_id": make_workspace(),
        "name": "echo",
        "version": "1.0.0",
        "entrypoint": "python",
        "image": "python:3.12-slim",
    }
    kw.update(overrides)  # type: ignore[arg-type]
    return SkillPackage.create(**kw)  # type: ignore[arg-type]


def test_package_create_validates_name_length() -> None:
    with pytest.raises(InvalidSkillSpec):
        _pkg(name="")
    with pytest.raises(InvalidSkillSpec):
        _pkg(name="a" * 129)


def test_package_create_validates_timeout_range() -> None:
    with pytest.raises(InvalidSkillSpec):
        _pkg(timeout_seconds=0)
    with pytest.raises(InvalidSkillSpec):
        _pkg(timeout_seconds=31)


def test_package_create_validates_version_range() -> None:
    with pytest.raises(InvalidSkillSpec):
        _pkg(version="")


def test_package_create_default_values() -> None:
    p = _pkg()
    assert p.version_lock == 1
    assert p.enabled is True
    assert p.network_policy == NetworkPolicy.DEFAULT
    assert p.timeout_seconds == 30


def test_package_update_bumps_version_lock() -> None:
    p = _pkg()
    p2 = p.update(description="new")
    assert p2.version_lock == 2
    assert p.version_lock == 1  # original immutable


def test_package_update_version_mismatch_raises_412() -> None:
    p = _pkg()
    p2 = p.update(description="new")
    with pytest.raises(SkillVersionMismatch) as exc:
        p.update(expected_version_lock=p2.version_lock, description="x")
    assert exc.value.code == "SKILL_VERSION_MISMATCH"


def test_package_update_invalid_timeout_raises_422() -> None:
    p = _pkg()
    with pytest.raises(InvalidSkillSpec):
        p.update(timeout_seconds=100)


def test_package_disable_keeps_history() -> None:
    p = _pkg()
    disabled = p.disable()
    assert disabled.enabled is False
    assert p.enabled is True


def test_install_succeed_jti() -> None:
    install = SkillInstall.create(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        package_id=make_skill_id(),
        package_version_lock=1,
        installed_by=make_user(),
    )
    installed = install.succeed(jti="abc123")
    assert installed.status == SkillInstallStatus.INSTALLED
    assert installed.run_token_jti == "abc123"


def test_install_fail_records_reason() -> None:
    install = SkillInstall.create(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        package_id=make_skill_id(),
        package_version_lock=1,
        installed_by=make_user(),
    )
    failed = install.fail(reason="boom")
    assert failed.status == SkillInstallStatus.FAILED
    assert "boom" in failed.run_token_jti


def test_invocation_state_machine_happy_path() -> None:
    inv = SkillInvocation.create(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        install_id=__import__("uuid").uuid4(),
        package_id=make_skill_id(),
        arguments={"x": 1},
    )
    inv2 = inv.start(__import__("uuid").uuid4())
    assert inv2.status == SkillInvocationStatus.STARTING
    inv3 = inv2.mark_running()
    assert inv3.status == SkillInvocationStatus.RUNNING
    inv4 = inv3.complete(
        result={"ok": True},
        latency_ms=10,
        stdout_tail="hi",
        stderr_tail="",
    )
    assert inv4.status == SkillInvocationStatus.SUCCEEDED
    assert inv4.latency_ms == 10


def test_invocation_cannot_start_twice() -> None:
    inv = SkillInvocation.create(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        install_id=__import__("uuid").uuid4(),
        package_id=make_skill_id(),
    )
    inv2 = inv.start(__import__("uuid").uuid4())
    inv3 = inv2.mark_running()
    inv4 = inv3.complete(result={}, latency_ms=1, stdout_tail="", stderr_tail="")
    with pytest.raises(SkillInvocationAlreadyTerminal):
        inv4.cancel(stdout_tail="", stderr_tail="")


def test_invocation_timeout_keeps_running_terminal() -> None:
    inv = SkillInvocation.create(
        tenant_id=make_tenant(),
        workspace_id=make_workspace(),
        install_id=__import__("uuid").uuid4(),
        package_id=make_skill_id(),
    )
    inv2 = inv.start(__import__("uuid").uuid4())
    inv3 = inv2.mark_running()
    inv4 = inv3.timeout(latency_ms=30000, stdout_tail="", stderr_tail="")
    assert inv4.status == SkillInvocationStatus.TIMED_OUT
    assert inv4.error_code == "SANDBOX_TIMEOUT"
