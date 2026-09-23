"""Sandbox Protocol + types."""

from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Protocol
from uuid import UUID


class SandboxMode(StrEnum):
    LOCAL = "local"
    DOCKER = "docker"
    E2B = "e2b"


class SandboxRunStatus(StrEnum):
    QUEUED = "queued"
    STARTING = "starting"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMED_OUT = "timed_out"


@dataclass(slots=True, frozen=True)
class SandboxRunSpec:
    """One execution request. Lives < sandbox timeout."""

    run_id: UUID
    tenant_id: UUID
    workspace_id: UUID
    skill_id: UUID
    command: tuple[str, ...]
    env: dict[str, str] = field(default_factory=dict)
    working_dir: str | None = None
    timeout_seconds: int = 300
    network_policy: str = "default"  # default | none | unrestricted
    cpu_quota: float | None = None
    memory_bytes: int | None = None
    image: str = "python:3.12-slim"


@dataclass(slots=True, frozen=True)
class SandboxEvent:
    """One emission from a running sandbox. Stream of these = the run."""

    run_id: UUID
    status: SandboxRunStatus
    stream: str  # "stdout" | "stderr" | "system"
    data: str
    seq: int


class Sandbox(Protocol):
    mode: SandboxMode

    async def start(self, spec: SandboxRunSpec) -> UUID: ...
    async def stream(self, run_id: UUID) -> AsyncIterator[SandboxEvent]: ...
    async def cancel(self, run_id: UUID) -> None: ...
    async def wait(self, run_id: UUID) -> SandboxEvent: ...
    async def shutdown(self) -> None: ...
