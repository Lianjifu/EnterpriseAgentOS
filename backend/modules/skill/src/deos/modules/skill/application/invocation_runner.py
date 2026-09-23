"""InvocationRunner — in-process asyncio task registry.

Owns the live `Sandbox` + the per-invocation task map. The state-machine
happy path is:

  start() → sandbox.start() → invocation.start(run_id) →
            _run() → invocation.mark_running() → stream → wait →
            complete()/timeout()/fail()/cancel()

`wait()` is used by the synchronous (`?wait=true`) HTTP variant; it
translates an `asyncio.TimeoutError` into `SandboxTimeout` (504).
`cancel()` is idempotent: missing task/run_id is a no-op.
"""

from __future__ import annotations

import asyncio
import json
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from eos_sandbox.sandbox import (
    Sandbox,
    SandboxEvent,
    SandboxRunSpec,
    SandboxRunStatus,
)
from eos_schema.ids import SkillInvocationId

from deos.modules.skill.application.ports import (
    SkillArtifactStore,
    SkillEventPublisher,
    SkillInvocationRepository,
)
from deos.modules.skill.domain.entities import (
    SkillInstall,
    SkillInvocation,
    SkillInvocationStatus,
    SkillPackage,
)
from deos.modules.skill.domain.errors import SandboxTimeout
from deos.modules.skill.domain.events import (
    SkillInvocationCompleted,
    SkillInvocationStarted,
)


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _tail(text: str, cap: int) -> str:
    if cap <= 0:
        return ""
    if len(text) <= cap:
        return text
    return text[-cap:]


def _latency_ms(started_at: datetime) -> int:
    return max(int((time.time() - started_at.timestamp()) * 1000), 0)


@dataclass(slots=True)
class StdoutStderrTails:
    cap: int
    stdout: str = ""
    stderr: str = ""

    def append(self, event: SandboxEvent) -> None:
        if event.stream == "stdout":
            self.stdout = _tail(self.stdout + event.data, self.cap)
        elif event.stream == "stderr":
            self.stderr = _tail(self.stderr + event.data, self.cap)


@dataclass(slots=True)
class InvocationRunner:
    sandbox: Sandbox
    invocations: SkillInvocationRepository
    publisher: SkillEventPublisher
    artifacts: SkillArtifactStore
    default_timeout_seconds: int = 30
    tail_cap_bytes: int = 4096

    _tasks: dict[SkillInvocationId, asyncio.Task[None]] = field(default_factory=dict)
    _run_ids: dict[SkillInvocationId, UUID] = field(default_factory=dict)
    _tenants: dict[SkillInvocationId, Any] = field(default_factory=dict)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    async def start(
        self,
        *,
        invocation: SkillInvocation,
        package: SkillPackage,
        install: SkillInstall,
    ) -> None:
        run_id = uuid4()
        timeout_s = min(package.timeout_seconds, self.default_timeout_seconds)
        argv = invocation.arguments.get("__argv") or ()
        command: tuple[str, ...] = (package.entrypoint, *argv)
        env = {
            "EOS_SKILL_ID": str(package.id),
            "EOS_INSTALL_ID": str(install.id),
            "EOS_INVOCATION_ID": str(invocation.id),
            "EOS_TENANT_ID": str(invocation.tenant_id),
            "EOS_WORKSPACE_ID": str(invocation.workspace_id),
            "EOS_RUN_TOKEN_JTI": install.run_token_jti or "",
            "EOS_ARGUMENTS_JSON": json.dumps(invocation.arguments),
        }
        spec = SandboxRunSpec(
            run_id=run_id,
            tenant_id=invocation.tenant_id,
            workspace_id=invocation.workspace_id,
            skill_id=package.id,
            image=package.image,
            command=command,
            env=env,
            working_dir=None,
            timeout_seconds=timeout_s,
            network_policy=package.network_policy.value,
            cpu_quota=package.cpu_quota,
            memory_bytes=package.memory_bytes,
        )

        started = invocation.start(run_id)
        await self.invocations.update(started)

        sandbox_run_id = await self.sandbox.start(spec)
        async with self._lock:
            self._run_ids[invocation.id] = sandbox_run_id
            self._tenants[invocation.id] = invocation.tenant_id

        task = asyncio.create_task(
            self._run(
                invocation=started,
                package=package,
                install=install,
                run_id=sandbox_run_id,
                timeout_seconds=timeout_s,
            ),
            name=f"skill-invocation-{invocation.id}",
        )
        async with self._lock:
            self._tasks[invocation.id] = task
        task.add_done_callback(lambda _t: self._cleanup(invocation.id))

    async def _run(
        self,
        *,
        invocation: SkillInvocation,
        package: SkillPackage,
        install: SkillInstall,
        run_id: UUID,
        timeout_seconds: int,
    ) -> None:
        try:
            inv = invocation.mark_running()
            await self.invocations.update(inv)
            await self.publisher.publish(
                SkillInvocationStarted(
                    skill_id=package.id,
                    install_id=install.id,
                    invocation_id=invocation.id,
                    tenant_id=invocation.tenant_id,
                    workspace_id=invocation.workspace_id,
                    sandbox_run_id=run_id,
                )
            )
        except asyncio.CancelledError:
            await self._mark_cancelled(invocation, package, run_id, "")
            raise

        tails = StdoutStderrTails(cap=self.tail_cap_bytes)
        try:
            async for event in self.sandbox.stream(run_id):  # type: ignore[attr-defined]
                tails.append(event)
                inv = await self.invocations.update(
                    inv.with_tails(stdout_tail=tails.stdout, stderr_tail=tails.stderr)
                )
        except asyncio.CancelledError:
            await self._mark_cancelled(invocation, package, run_id, tails.stdout)
            raise

        try:
            terminal = await asyncio.wait_for(
                self.sandbox.wait(run_id), timeout=timeout_seconds + 1
            )
        except TimeoutError as exc:
            timed_out = invocation.timeout(
                stdout_tail=tails.stdout, stderr_tail=tails.stderr
            )
            await self.invocations.update(timed_out)
            await self.publisher.publish(
                SkillInvocationCompleted(
                    skill_id=package.id,
                    invocation_id=invocation.id,
                    tenant_id=invocation.tenant_id,
                    workspace_id=invocation.workspace_id,
                    status=SkillInvocationStatus.TIMED_OUT,
                    latency_ms=_latency_ms(invocation.started_at),
                    error_code="SANDBOX_TIMEOUT",
                )
            )
            await self._try_cancel_sandbox(run_id)
            raise SandboxTimeout(
                f"sandbox exceeded {timeout_seconds}s",
                code="SANDBOX_TIMEOUT",
            ) from exc

        latency_ms = _latency_ms(invocation.started_at)
        if terminal.status == SandboxRunStatus.SUCCEEDED:
            result = {
                "stdout": tails.stdout,
                "stderr": tails.stderr,
                "exit": 0,
            }
            artifact_uri = await self._persist_artifact(
                invocation=invocation,
                payload=result,
            )
            completed = invocation.complete(
                result=result,
                latency_ms=latency_ms,
                stdout_tail=tails.stdout,
                stderr_tail=tails.stderr,
                artifact_uri=artifact_uri,
            )
            await self.invocations.update(completed)
            await self.publisher.publish(
                SkillInvocationCompleted(
                    skill_id=package.id,
                    invocation_id=invocation.id,
                    tenant_id=invocation.tenant_id,
                    workspace_id=invocation.workspace_id,
                    status=SkillInvocationStatus.SUCCEEDED,
                    latency_ms=latency_ms,
                    artifact_uri=artifact_uri,
                )
            )
            return

        failed = invocation.fail(
            error_code="SKILL_EXECUTION_FAILED",
            error_message=terminal.data or "sandbox failed",
            latency_ms=latency_ms,
            stdout_tail=tails.stdout,
            stderr_tail=tails.stderr,
        )
        await self.invocations.update(failed)
        await self.publisher.publish(
            SkillInvocationCompleted(
                skill_id=package.id,
                invocation_id=invocation.id,
                tenant_id=invocation.tenant_id,
                workspace_id=invocation.workspace_id,
                status=SkillInvocationStatus.FAILED,
                latency_ms=latency_ms,
                error_code=failed.error_code,
            )
        )

    async def cancel(self, invocation_id: SkillInvocationId) -> None:
        async with self._lock:
            run_id = self._run_ids.get(invocation_id)
            task = self._tasks.get(invocation_id)
        if run_id is not None:
            await self._try_cancel_sandbox(run_id)
        if task is not None and not task.done():
            task.cancel()
            try:
                await asyncio.wait_for(
                    asyncio.shield(task), timeout=self.default_timeout_seconds + 5
                )
            except (TimeoutError, asyncio.CancelledError):
                pass
            except Exception:  # pragma: no cover  # noqa: BLE001, S110
                pass

    async def wait(self, invocation_id: SkillInvocationId) -> SkillInvocation:
        async with self._lock:
            task = self._tasks.get(invocation_id)
            tenant_id = self._tenants.get(invocation_id)
        if task is not None:
            try:
                await asyncio.wait_for(
                    asyncio.shield(task),
                    timeout=self.default_timeout_seconds + 5,
                )
            except TimeoutError as exc:
                raise SandboxTimeout(
                    f"wait timed out after {self.default_timeout_seconds + 5}s",
                    code="SANDBOX_TIMEOUT",
                ) from exc
        if tenant_id is None:
            persisted = await self.invocations.get_by_id(invocation_id=invocation_id)
            if persisted is None:
                raise SandboxTimeout(
                    f"unknown invocation {invocation_id}",
                    code="SANDBOX_TIMEOUT",
                )
            return persisted
        return await self.invocations.get(
            tenant_id=tenant_id, invocation_id=invocation_id
        )

    def _cleanup(self, invocation_id: SkillInvocationId) -> None:
        self._tasks.pop(invocation_id, None)
        self._run_ids.pop(invocation_id, None)
        self._tenants.pop(invocation_id, None)

    async def _mark_cancelled(
        self,
        invocation: SkillInvocation,
        package: SkillPackage,
        run_id: UUID,
        stdout_tail: str,
    ) -> None:
        try:
            cancelled = invocation.cancel(stdout_tail=stdout_tail, stderr_tail="")
            await self.invocations.update(cancelled)
        except Exception:  # noqa: BLE001
            return
        try:
            await self.publisher.publish(
                SkillInvocationCompleted(
                    skill_id=package.id,
                    invocation_id=invocation.id,
                    tenant_id=invocation.tenant_id,
                    workspace_id=invocation.workspace_id,
                    status=SkillInvocationStatus.CANCELLED,
                    latency_ms=_latency_ms(invocation.started_at),
                    error_code="SKILL_CANCELLED",
                )
            )
        except Exception:  # pragma: no cover - best-effort  # noqa: BLE001, S110
            pass
        await self._try_cancel_sandbox(run_id)

    async def _try_cancel_sandbox(self, run_id: UUID) -> None:
        try:
            await self.sandbox.cancel(run_id)
        except Exception:  # pragma: no cover - best-effort  # noqa: BLE001, S110
            pass

    async def _persist_artifact(
        self,
        *,
        invocation: SkillInvocation,
        payload: dict,
    ) -> str | None:
        try:
            data = json.dumps(payload, default=str).encode("utf-8")
            return await self.artifacts.put(
                tenant_id=invocation.tenant_id,
                workspace_id=invocation.workspace_id,
                key=f"invocations/{invocation.id}",
                data=data,
                content_type="application/json",
            )
        except Exception:  # pragma: no cover - artifact is optional  # noqa: BLE001
            return None


__all__ = ["InvocationRunner", "StdoutStderrTails"]
