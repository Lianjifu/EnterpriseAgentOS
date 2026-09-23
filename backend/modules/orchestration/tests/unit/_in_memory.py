"""In-memory test doubles for the orchestration module.

- :class:`InMemoryPlanRepository` — dict-backed PlanRepository.
- :class:`InMemoryWorkflowRunRepository` — dict-backed; idempotency_key
  collisions raise ``PlanNameConflict`` (mapped from
  ``IDEMPOTENCY_KEY_IN_USE`` in the executor).
- :class:`InMemoryStepRunRepository` — list-backed per-run.
- :class:`RecordingSubAgentPort` / :class:`RecordingToolDispatchPort` /
  :class:`RecordingSkillDispatchPort` — record calls, return canned
  outputs.
- :class:`RecordingEventPublisher` — appends events to a list.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

from eos_schema.ids import (
    PlanId,
    TenantId,
    UserId,
    WorkflowRunId,
    WorkspaceId,
)

from deos.modules.orchestration.application.ports import (
    OrchestrationEventPublisher,
    PlanRepository,
    StepRunRepository,
    SubAgentPort,
    SubAgentResult,
    ToolDispatchPort,
    WorkflowRunRepository,
)
from deos.modules.orchestration.domain.entities import Plan, StepRun, WorkflowRun

# ── Plan repository ──────────────────────────────────────────────────────


class InMemoryPlanRepository(PlanRepository):
    def __init__(self) -> None:
        self._by_id: dict[tuple[TenantId, PlanId], Plan] = {}
        self._by_name: dict[tuple[TenantId, str], PlanId] = {}

    async def get(self, *, tenant_id: TenantId, plan_id: PlanId) -> Plan | None:
        return self._by_id.get((tenant_id, plan_id))

    async def get_by_name(self, *, tenant_id: TenantId, name: str) -> Plan | None:
        pid = self._by_name.get((tenant_id, name))
        if pid is None:
            return None
        return self._by_id.get((tenant_id, pid))

    async def list(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Plan]:
        plans = sorted(
            (
                p
                for (tid, _), p in self._by_id.items()
                if tid == tenant_id and p.workspace_id == workspace_id
            ),
            key=lambda p: p.created_at,
            reverse=True,
        )
        return plans[offset : offset + limit]

    async def add(self, plan: Plan) -> Plan:
        key = (plan.tenant_id, plan.name)
        if key in self._by_name:
            from deos.modules.orchestration.domain.errors import PlanNameConflict

            raise PlanNameConflict(f"plan name {plan.name!r} already exists in tenant")
        self._by_id[(plan.tenant_id, plan.id)] = plan
        self._by_name[key] = plan.id
        return plan

    async def delete(self, *, tenant_id: TenantId, plan_id: PlanId) -> bool:
        plan = self._by_id.pop((tenant_id, plan_id), None)
        if plan is None:
            return False
        self._by_name.pop((tenant_id, plan.name), None)
        return True


# ── WorkflowRun repository ───────────────────────────────────────────────


class InMemoryWorkflowRunRepository(WorkflowRunRepository):
    def __init__(self) -> None:
        self._by_id: dict[tuple[TenantId, WorkflowRunId], WorkflowRun] = {}
        self._by_idem: dict[tuple[TenantId, str], WorkflowRunId] = {}

    async def get(
        self, *, tenant_id: TenantId, run_id: WorkflowRunId
    ) -> WorkflowRun | None:
        return self._by_id.get((tenant_id, run_id))

    async def get_by_idempotency_key(
        self, *, tenant_id: TenantId, idempotency_key: str
    ) -> WorkflowRun | None:
        rid = self._by_idem.get((tenant_id, idempotency_key))
        if rid is None:
            return None
        return self._by_id.get((tenant_id, rid))

    async def list(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        plan_id: PlanId | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[WorkflowRun]:
        rows = sorted(
            (
                r
                for (tid, _), r in self._by_id.items()
                if tid == tenant_id
                and r.workspace_id == workspace_id
                and (plan_id is None or r.plan_id == plan_id)
            ),
            key=lambda r: r.created_at,
            reverse=True,
        )
        return rows[offset : offset + limit]

    async def add(self, run: WorkflowRun) -> WorkflowRun:
        if run.idempotency_key is not None:
            idem = (run.tenant_id, run.idempotency_key)
            if idem in self._by_idem:
                from deos.modules.orchestration.domain.errors import (
                    IdempotencyKeyConflict,
                )

                raise IdempotencyKeyConflict(
                    f"idempotency_key {run.idempotency_key!r} already in use"
                )
            self._by_idem[idem] = run.id
        self._by_id[(run.tenant_id, run.id)] = run
        return run

    async def update(self, run: WorkflowRun) -> WorkflowRun:
        self._by_id[(run.tenant_id, run.id)] = run
        return run


# ── StepRun repository ───────────────────────────────────────────────────


class InMemoryStepRunRepository(StepRunRepository):
    def __init__(self) -> None:
        self._by_run: dict[tuple[TenantId, WorkflowRunId], list[StepRun]] = defaultdict(
            list
        )

    async def add(self, step: StepRun) -> StepRun:
        self._by_run[(step.tenant_id, step.run_id)].append(step)
        return step

    async def update(self, step: StepRun) -> StepRun:
        rows = self._by_run[(step.tenant_id, step.run_id)]
        for i, existing in enumerate(rows):
            if existing.id == step.id:
                rows[i] = step
                return step
        rows.append(step)
        return step

    async def list_for_run(
        self, *, tenant_id: TenantId, run_id: WorkflowRunId
    ) -> list[StepRun]:
        return list(self._by_run.get((tenant_id, run_id), ()))


# ── Dispatch ports ───────────────────────────────────────────────────────


@dataclass(slots=True)
class RecordingSubAgentPort(SubAgentPort):
    """Records every call and returns a canned result per ``agent_id``."""

    results: dict[str, SubAgentResult] = field(default_factory=dict)
    calls: list[dict[str, Any]] = field(default_factory=list)
    default_message: str = "agent-default-output"
    raise_exc: Exception | None = None

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
    ) -> SubAgentResult:
        self.calls.append(
            {
                "tenant_id": tenant_id,
                "workspace_id": workspace_id,
                "owner_id": owner_id,
                "agent_id": agent_id,
                "agent_version": agent_version,
                "user_input": user_input,
                "model_override": model_override,
                "timeout_seconds": timeout_seconds,
            }
        )
        if self.raise_exc is not None:
            raise self.raise_exc
        return self.results.get(
            str(agent_id),
            SubAgentResult(final_message=self.default_message, turn_id=uuid4_default()),
        )


def uuid4_default() -> UUID:
    from uuid import uuid4

    return uuid4()


@dataclass(slots=True)
class RecordingToolDispatchPort(ToolDispatchPort):
    results: dict[str, dict[str, Any]] = field(default_factory=dict)
    calls: list[dict[str, Any]] = field(default_factory=list)
    raise_exc: Exception | None = None

    async def invoke_tool(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        actor_id: UserId,
        tool_name: str,
        arguments: dict[str, Any],
        timeout_seconds: int = 60,
    ) -> dict[str, Any]:
        self.calls.append(
            {
                "tenant_id": tenant_id,
                "tool_name": tool_name,
                "arguments": arguments,
            }
        )
        if self.raise_exc is not None:
            raise self.raise_exc
        return self.results.get(tool_name, {"echo": arguments})


@dataclass(slots=True)
class RecordingSkillDispatchPort:
    """Same shape as RecordingToolDispatchPort but for skills."""

    results: dict[str, dict[str, Any]] = field(default_factory=dict)
    calls: list[dict[str, Any]] = field(default_factory=list)

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
    ) -> dict[str, Any]:
        self.calls.append(
            {
                "tenant_id": tenant_id,
                "skill_name": skill_name,
                "skill_version": skill_version,
                "arguments": arguments,
            }
        )
        return self.results.get(skill_name, {"invoked": arguments})


# ── Event publisher ──────────────────────────────────────────────────────


class RecordingEventPublisher(OrchestrationEventPublisher):
    def __init__(self) -> None:
        self.published: list[object] = []

    async def publish(self, event: object) -> None:
        self.published.append(event)


__all__: list[str] = []
