"""Ports the application layer depends on.

Concrete adapters live in ``adapter/``; tests use in-memory fakes from
``tests/unit/_in_memory.py``.  Each port is satisfied by exactly one
production adapter (or in-memory fake in tests).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable
from uuid import UUID

from eos_schema.ids import (
    PlanId,
    TenantId,
    UserId,
    WorkflowRunId,
    WorkspaceId,
)

from deos.modules.orchestration.domain.entities import Plan, StepRun, WorkflowRun

__all__ = [
    "ConditionEvaluatorPort",
    "OrchestrationEventPublisher",
    "PlanRepository",
    "SkillDispatchPort",
    "StepRunRepository",
    "SubAgentPort",
    "TemplateRendererPort",
    "ToolDispatchPort",
    "WorkflowRunRepository",
]


# ── Persistence ──────────────────────────────────────────────────────────


@runtime_checkable
class PlanRepository(Protocol):
    """Persistence for :class:`Plan` aggregates."""

    async def get(
        self, *, tenant_id: TenantId, plan_id: PlanId
    ) -> Plan | None: ...

    async def get_by_name(
        self, *, tenant_id: TenantId, name: str
    ) -> Plan | None: ...

    async def list(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Plan]: ...

    async def add(self, plan: Plan) -> Plan: ...

    async def delete(self, *, tenant_id: TenantId, plan_id: PlanId) -> bool: ...


@runtime_checkable
class WorkflowRunRepository(Protocol):
    """Persistence + idempotency for :class:`WorkflowRun`."""

    async def get(
        self, *, tenant_id: TenantId, run_id: WorkflowRunId
    ) -> WorkflowRun | None: ...

    async def get_by_idempotency_key(
        self, *, tenant_id: TenantId, idempotency_key: str
    ) -> WorkflowRun | None: ...

    async def list(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        plan_id: PlanId | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[WorkflowRun]: ...

    async def add(self, run: WorkflowRun) -> WorkflowRun: ...

    async def update(self, run: WorkflowRun) -> WorkflowRun: ...


@runtime_checkable
class StepRunRepository(Protocol):
    """Persistence for :class:`StepRun` rows."""

    async def add(self, step: StepRun) -> StepRun: ...

    async def update(self, step: StepRun) -> StepRun: ...

    async def list_for_run(
        self, *, tenant_id: TenantId, run_id: WorkflowRunId
    ) -> list[StepRun]: ...


# ── Dispatch ports ───────────────────────────────────────────────────────


@dataclass(slots=True, frozen=True)
class SubAgentResult:
    """Output shape of :class:`SubAgentPort.run_turn_to_completion`."""

    final_message: str
    turn_id: UUID
    input_tokens: int = 0
    output_tokens: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)


@runtime_checkable
class SubAgentPort(Protocol):
    """Adapter the executor uses to drive an agent_runtime turn.

    Implemented by :class:`deos.modules.agent_runtime.adapter.orchestration.subagent_adapter.SubAgentAdapter`
    in P7-7.  Returns a structured result, not the streaming chunk
    sequence — the executor needs the final answer in one shot.
    """

    async def run_turn_to_completion(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        owner_id: UserId,
        agent_id: UUID,
        agent_version: str,
        user_input: str,
        model_override: str | None = None,
        timeout_seconds: int = 60,
    ) -> SubAgentResult: ...


@runtime_checkable
class ToolDispatchPort(Protocol):
    """Adapter the executor uses to call :class:`ToolService`."""

    async def invoke_tool(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        actor_id: UserId,
        tool_name: str,
        arguments: dict[str, Any],
        timeout_seconds: int = 60,
    ) -> dict[str, Any]: ...


@runtime_checkable
class SkillDispatchPort(Protocol):
    """Adapter the executor uses to call :class:`SkillService`."""

    async def invoke_skill(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        actor_id: UserId,
        skill_name: str,
        skill_version: str | None,
        arguments: dict[str, Any],
        timeout_seconds: int = 60,
    ) -> dict[str, Any]: ...


# ── Expression ports ─────────────────────────────────────────────────────


@runtime_checkable
class TemplateRendererPort(Protocol):
    """Renders ``${...}`` placeholders against a context dict.

    v1 supports two prefixes: ``variables.*`` (run-level inputs) and
    ``steps.<id>.output.*`` (step output lookup).  Anything else raises
    :class:`PlanValidationError`.
    """

    def render(
        self,
        *,
        template: str,
        context: dict[str, Any],
    ) -> str: ...

    def render_object(
        self,
        *,
        template_obj: Any,
        context: dict[str, Any],
    ) -> Any: ...


@runtime_checkable
class ConditionEvaluatorPort(Protocol):
    """Evaluates a ``when`` expression against a context.

    v1 supports a tiny expression language (equality / comparison /
    ``in`` / ``contains`` / truthy) with NO function calls and NO
    attribute access beyond literal map lookups.  No ``eval``.
    """

    def evaluate(
        self,
        *,
        expression: str,
        context: dict[str, Any],
    ) -> Any: ...


# ── Eventing ─────────────────────────────────────────────────────────────


@runtime_checkable
class OrchestrationEventPublisher(Protocol):
    """Publishes orchestration events onto the in-process bus."""

    async def publish(self, event: object) -> None: ...