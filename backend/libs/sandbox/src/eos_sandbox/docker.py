"""Docker sandbox — production skill runtime (aiodocker).

The interface matches the abstract `Sandbox` Protocol; `start` runs a
single `docker run --rm` instance, `stream` follows its combined
stdout/stderr, `cancel` kills + removes the container, `wait` blocks on
its exit code. `aiodocker` is imported lazily inside `start` so
import-only environments (lint, CI without Docker) still pass.

The container name embeds `spec.run_id.hex[:12]` so leftover containers
from a crashed process are easy to spot and reap via `docker ps -a`.
"""

from __future__ import annotations

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


def _map_network(policy: str) -> str:
    if policy == "none":
        return "none"
    if policy == "unrestricted":
        return "host"
    return "bridge"


class DockerSandbox(Sandbox):
    mode = SandboxMode.DOCKER

    def __init__(
        self, *, docker_url: str | None = None, image_pull_timeout: float = 60.0
    ) -> None:
        self._docker_url = docker_url
        self._image_pull_timeout = image_pull_timeout
        self._containers: dict[Any, Any] = {}

    async def start(self, spec: SandboxRunSpec) -> Any:
        try:
            import aiodocker
        except ImportError as e:
            raise ExternalServiceError(
                "aiodocker is required for DockerSandbox",
                code="DOCKER_SDK_MISSING",
            ) from e

        try:
            async with aiodocker.Docker(url=self._docker_url) as client:
                container = await client.containers.run(  # type: ignore[call-arg]
                    name=f"eos-{spec.run_id.hex[:12]}",
                    image=spec.image,
                    command=list(spec.command),
                    environment=spec.env or {},
                    working_dir=spec.working_dir,
                    network=_map_network(spec.network_policy),
                    host_config=_build_host_config(spec),
                )
        except Exception as e:
            raise ExternalServiceError(
                f"docker start failed: {e}", code="DOCKER_START_FAILED"
            ) from e

        self._containers[spec.run_id] = container
        return spec.run_id

    async def stream(  # type: ignore[override]
        self, run_id: Any
    ) -> AsyncIterator[SandboxEvent]:
        container = self._containers.get(run_id)
        if container is None:
            return
        seq = 0
        try:
            async for line in container.log(
                stdout=True, stderr=True, follow=True, stream=True
            ):
                stream = "stderr" if getattr(line, "stream", 1) == 2 else "stdout"
                yield SandboxEvent(
                    run_id=run_id,
                    status=SandboxRunStatus.RUNNING,
                    stream=stream,
                    data=(
                        line.data.decode("utf-8", errors="replace")
                        if isinstance(line.data, (bytes, bytearray))
                        else str(line.data)
                    ),
                    seq=seq,
                )
                seq += 1
        except Exception:  # noqa: BLE001
            return

    async def cancel(self, run_id: Any) -> None:
        container = self._containers.get(run_id)
        if container is None:
            return
        try:
            await container.kill()
        except Exception:  # noqa: BLE001, S110
            pass
        try:
            await container.delete(force=True)
        except Exception:  # noqa: BLE001, S110
            pass

    async def wait(self, run_id: Any) -> SandboxEvent:
        container = self._containers[run_id]
        result = await container.wait()
        code = int(result.get("StatusCode", 1)) if isinstance(result, dict) else 1
        status = SandboxRunStatus.SUCCEEDED if code == 0 else SandboxRunStatus.FAILED
        return SandboxEvent(
            run_id=run_id,
            status=status,
            stream="system",
            data=f"exit={code}",
            seq=-1,
        )

    async def shutdown(self) -> None:
        for c in list(self._containers.values()):
            try:
                await c.delete(force=True)
            except Exception:  # noqa: BLE001, S110
                pass
        self._containers.clear()


def _build_host_config(spec: SandboxRunSpec) -> dict[str, Any]:
    """Translate SandboxRunSpec limits into aiodocker's HostConfig dict.

    aiodocker passes HostConfig straight through to the Docker daemon.
    Memory is given in bytes; CPU quota is fractional CPUs.
    """
    config: dict[str, Any] = {"AutoRemove": True}
    if spec.cpu_quota is not None:
        config["NanoCpus"] = int(spec.cpu_quota * 1e9)
    if spec.memory_bytes is not None:
        config["Memory"] = int(spec.memory_bytes)
    return config
