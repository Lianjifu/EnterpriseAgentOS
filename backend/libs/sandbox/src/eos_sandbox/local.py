"""Local subprocess sandbox for dev + tests.

Runs the command directly via asyncio.create_subprocess_exec. No isolation;
intended for trusted developer environments and CI.

For production: swap in DockerSandbox.
"""

from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncIterator
from typing import Any

from eos_kernel.errors import ExternalServiceError

from eos_sandbox.sandbox import (
    Sandbox,
    SandboxEvent,
    SandboxMode,
    SandboxRunSpec,
    SandboxRunStatus,
)


async def _read_pipe(
    proc: asyncio.subprocess.Process,
    run_id: Any,
    stream: str,
    queue: asyncio.Queue[SandboxEvent | None],
    seq_holder: list[int],
) -> None:
    """Read one pipe into the shared queue, then send a sentinel."""
    assert getattr(proc, stream) is not None
    while True:
        line = await getattr(proc, stream).readline()  # type: ignore[union-attr]
        if not line:
            await queue.put(None)
            return
        seq_holder[0] += 1
        await queue.put(
            SandboxEvent(
                run_id=run_id,
                status=SandboxRunStatus.RUNNING,
                stream=stream,
                data=line.decode("utf-8", errors="replace"),
                seq=seq_holder[0],
            )
        )


class LocalSandbox(Sandbox):
    mode = SandboxMode.LOCAL

    def __init__(self) -> None:
        self._procs: dict[Any, asyncio.subprocess.Process] = {}

    async def start(self, spec: SandboxRunSpec) -> Any:
        if not spec.command:
            raise ExternalServiceError("empty command", code="SANDBOX_EMPTY_COMMAND")
        proc = await asyncio.create_subprocess_exec(
            *spec.command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={**os.environ, **spec.env},
            cwd=spec.working_dir,
        )
        self._procs[spec.run_id] = proc
        return spec.run_id

    async def stream(  # type: ignore[override]
        self, run_id: Any
    ) -> AsyncIterator[SandboxEvent]:
        proc = self._procs.get(run_id)
        if proc is None or proc.stdout is None or proc.stderr is None:
            return
        queue: asyncio.Queue[SandboxEvent | None] = asyncio.Queue()
        seq_holder = [0]
        readers = [
            asyncio.create_task(_read_pipe(proc, run_id, "stdout", queue, seq_holder)),
            asyncio.create_task(_read_pipe(proc, run_id, "stderr", queue, seq_holder)),
        ]
        done = 0
        try:
            while done < 2:
                ev = await queue.get()
                if ev is None:
                    done += 1
                    continue
                yield ev
        finally:
            for t in readers:
                if not t.done():
                    t.cancel()

    async def cancel(self, run_id: Any) -> None:
        proc = self._procs.get(run_id)
        if proc and proc.returncode is None:
            proc.terminate()
            try:
                await asyncio.wait_for(proc.wait(), timeout=5)
            except TimeoutError:
                proc.kill()

    async def wait(self, run_id: Any) -> SandboxEvent:
        proc = self._procs[run_id]
        await proc.wait()
        status = (
            SandboxRunStatus.SUCCEEDED
            if proc.returncode == 0
            else SandboxRunStatus.FAILED
        )
        return SandboxEvent(
            run_id=run_id,
            status=status,
            stream="system",
            data=f"exit={proc.returncode}",
            seq=-1,
        )

    async def shutdown(self) -> None:
        for p in list(self._procs.values()):
            if p.returncode is None:
                p.terminate()
        self._procs.clear()
