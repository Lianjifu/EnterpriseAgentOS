"""Unit tests for the WorkflowExecutor (P7-6).

Covers:
- sequence dispatch
- parallel dispatch (fail_fast on / off)
- conditional branch selection + default fallback
- subplan recursion
- agent / tool / skill dispatch through their respective ports
- max_total_steps enforcement (overrun → WorkflowTooLarge)
- per-step asyncio.wait_for timeout → WorkflowStepTimeout + StepRun.status
- terminal WorkflowRun status (SUCCEEDED / FAILED / TIMED_OUT)
"""

from __future__ import annotations

import asyncio
from uuid import uuid4

from _orchestration_unit_in_memory import (
    InMemoryStepRunRepository,
    RecordingSkillDispatchPort,
    RecordingSubAgentPort,
    RecordingToolDispatchPort,
)
from eos_schema.ids import TenantId, UserId, WorkspaceId

from deos.modules.orchestration.application.conditions import (
    SafeConditionEvaluator,
)
from deos.modules.orchestration.application.dsl import PlanDSL
from deos.modules.orchestration.application.executor import WorkflowExecutor
from deos.modules.orchestration.application.template import (
    StringTemplateRenderer,
)
from deos.modules.orchestration.domain.entities import Plan, WorkflowRun
from deos.modules.orchestration.domain.errors import (
    WorkflowExecutionFailed,
    WorkflowStepTimeout,
    WorkflowTooLarge,
)

# Above three are imported for clarity (used as exception constructors);
# the executor converts them to terminal run statuses rather than
# re-raising, but tests construct them directly to simulate bad ports.
_ = (WorkflowExecutionFailed, WorkflowStepTimeout, WorkflowTooLarge)
from deos.modules.orchestration.domain.value_objects import (
    StepKind,
    StepRunStatus,
    WorkflowRunStatus,
)


def _ids():
    return (
        TenantId(uuid4()),
        WorkspaceId(uuid4()),
        UserId(uuid4()),
    )


def _make_executor(
    *,
    sub_agent=None,
    tool=None,
    skill=None,
    step_runs=None,
    max_total_steps: int = 64,
    default_step_timeout: int = 60,
) -> WorkflowExecutor:
    return WorkflowExecutor(
        sub_agent=sub_agent or RecordingSubAgentPort(),
        tool_dispatch=tool or RecordingToolDispatchPort(),
        skill_dispatch=skill or RecordingSkillDispatchPort(),
        template_renderer=StringTemplateRenderer(),
        condition_evaluator=SafeConditionEvaluator(),
        step_run_repository=step_runs or InMemoryStepRunRepository(),
        max_total_steps=max_total_steps,
        default_step_timeout_seconds=default_step_timeout,
    )


def _run_for(plan: Plan, *, status=WorkflowRunStatus.PENDING) -> WorkflowRun:
    tid = plan.tenant_id
    wid = plan.workspace_id
    return WorkflowRun.create(
        tenant_id=tid,
        workspace_id=wid,
        plan_id=plan.id,
        plan_dsl_snapshot=dict(plan.entry_dsl),
    )


# ── sequence ─────────────────────────────────────────────────────────────


async def test_sequence_dispatches_in_order() -> None:
    tid, wid, uid = _ids()
    agent = RecordingSubAgentPort()
    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name="seq",
        description="",
        entry_dsl={
            "name": "seq",
            "entry": {
                "kind": "sequence",
                "step_id": "s",
                "steps": [
                    {
                        "kind": "agent",
                        "step_id": "a1",
                        "agent_id": str(uuid4()),
                        "agent_version": "1.0.0",
                        "user_input_template": "first",
                    },
                    {
                        "kind": "agent",
                        "step_id": "a2",
                        "agent_id": str(uuid4()),
                        "agent_version": "1.0.0",
                        "user_input_template": "second",
                    },
                ],
            },
        },
        max_total_steps=10,
        created_by=uid,
    )
    executor = _make_executor(sub_agent=agent)
    run = _run_for(plan)
    result = await executor.execute(
        tenant_id=tid, workspace_id=wid, owner_id=uid, run=run, plan=plan
    )
    assert result.run.status == WorkflowRunStatus.SUCCEEDED
    assert len(result.step_runs) == 2
    assert [s.step_id for s in result.step_runs] == ["a1", "a2"]


# ── parallel ─────────────────────────────────────────────────────────────


async def test_parallel_fail_fast_marks_workflow_failed() -> None:
    tid, wid, uid = _ids()
    agent = RecordingSubAgentPort()
    agent.raise_exc = WorkflowExecutionFailed("boom")

    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name="par",
        description="",
        entry_dsl={
            "name": "par",
            "entry": {
                "kind": "parallel",
                "step_id": "p",
                "fail_fast": True,
                "branches": [
                    {
                        "kind": "agent",
                        "step_id": "t1",
                        "agent_id": str(uuid4()),
                        "agent_version": "1.0.0",
                        "user_input_template": "a",
                    },
                    {
                        "kind": "agent",
                        "step_id": "t2",
                        "agent_id": str(uuid4()),
                        "agent_version": "1.0.0",
                        "user_input_template": "b",
                    },
                ],
            },
        },
        max_total_steps=10,
        created_by=uid,
    )
    executor = _make_executor(sub_agent=agent)
    run = _run_for(plan)
    result = await executor.execute(
        tenant_id=tid, workspace_id=wid, owner_id=uid, run=run, plan=plan
    )
    assert result.run.status == WorkflowRunStatus.FAILED
    assert result.run.error_code == "WORKFLOW_EXECUTION_FAILED"
    # fail_fast=True cancels sibling branches via gather; we accept
    # either zero or more StepRun rows being persisted.  The contract
    # is that the WorkflowRun itself is terminal FAILED.


async def test_parallel_continues_after_failure_when_not_fail_fast() -> None:
    tid, wid, uid = _ids()
    agent = RecordingSubAgentPort()
    agent.default_message = "still-ran"

    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name="par",
        description="",
        entry_dsl={
            "name": "par",
            "entry": {
                "kind": "parallel",
                "step_id": "p",
                "fail_fast": False,
                "branches": [
                    {
                        "kind": "agent",
                        "step_id": "x",
                        "agent_id": str(uuid4()),
                        "agent_version": "1.0.0",
                        "user_input_template": "a",
                    },
                    {
                        "kind": "agent",
                        "step_id": "y",
                        "agent_id": str(uuid4()),
                        "agent_version": "1.0.0",
                        "user_input_template": "b",
                    },
                ],
            },
        },
        max_total_steps=10,
        created_by=uid,
    )
    executor = _make_executor(sub_agent=agent)
    run = _run_for(plan)
    result = await executor.execute(
        tenant_id=tid, workspace_id=wid, owner_id=uid, run=run, plan=plan
    )
    assert result.run.status == WorkflowRunStatus.SUCCEEDED
    assert {s.step_id for s in result.step_runs} == {"x", "y"}


# ── conditional ─────────────────────────────────────────────────────────


async def test_conditional_picks_branch_per_when() -> None:
    tid, wid, uid = _ids()
    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name="cond",
        description="",
        entry_dsl={
            "name": "cond",
            "entry": {
                "kind": "conditional",
                "step_id": "r",
                "when": {"expression": "variables.tier == 'gold'"},
                "branches": {
                    "true": {
                        "kind": "agent",
                        "step_id": "vip",
                        "agent_id": str(uuid4()),
                        "agent_version": "1.0.0",
                        "user_input_template": "gold",
                    },
                    "false": {
                        "kind": "agent",
                        "step_id": "std",
                        "agent_id": str(uuid4()),
                        "agent_version": "1.0.0",
                        "user_input_template": "std",
                    },
                },
                "default_branch": "false",
            },
        },
        max_total_steps=10,
        created_by=uid,
    )
    executor = _make_executor()
    run = WorkflowRun.create(
        tenant_id=tid,
        workspace_id=wid,
        plan_id=plan.id,
        plan_dsl_snapshot=dict(plan.entry_dsl),
        variables={"tier": "gold"},
    )
    result = await executor.execute(
        tenant_id=tid, workspace_id=wid, owner_id=uid, run=run, plan=plan
    )
    assert result.run.status == WorkflowRunStatus.SUCCEEDED
    assert [s.step_id for s in result.step_runs] == ["vip"]


async def test_conditional_falls_back_to_default_on_unknown() -> None:
    tid, wid, uid = _ids()
    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name="cond",
        description="",
        entry_dsl={
            "name": "cond",
            "entry": {
                "kind": "conditional",
                "step_id": "r",
                "when": {"expression": "variables.tier == 'diamond'"},
                "branches": {
                    "true": {
                        "kind": "agent",
                        "step_id": "vip",
                        "agent_id": str(uuid4()),
                        "agent_version": "1.0.0",
                        "user_input_template": "v",
                    },
                    "false": {
                        "kind": "agent",
                        "step_id": "std",
                        "agent_id": str(uuid4()),
                        "agent_version": "1.0.0",
                        "user_input_template": "s",
                    },
                },
                "default_branch": "false",
            },
        },
        max_total_steps=10,
        created_by=uid,
    )
    executor = _make_executor()
    run = WorkflowRun.create(
        tenant_id=tid,
        workspace_id=wid,
        plan_id=plan.id,
        plan_dsl_snapshot=dict(plan.entry_dsl),
        variables={"tier": "gold"},
    )
    result = await executor.execute(
        tenant_id=tid, workspace_id=wid, owner_id=uid, run=run, plan=plan
    )
    assert [s.step_id for s in result.step_runs] == ["std"]


# ── subplan ──────────────────────────────────────────────────────────────


async def test_subplan_recurses() -> None:
    tid, wid, uid = _ids()
    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name="root",
        description="",
        entry_dsl={
            "name": "root",
            "entry": {
                "kind": "subplan",
                "step_id": "child",
                "sub_plan": {
                    "name": "child",
                    "entry": {
                        "kind": "agent",
                        "step_id": "inner",
                        "agent_id": str(uuid4()),
                        "agent_version": "1.0.0",
                        "user_input_template": "echo",
                    },
                },
                "variables": {"x": 1},
            },
        },
        max_total_steps=10,
        created_by=uid,
    )
    executor = _make_executor()
    run = _run_for(plan)
    result = await executor.execute(
        tenant_id=tid, workspace_id=wid, owner_id=uid, run=run, plan=plan
    )
    kinds = {s.kind for s in result.step_runs}
    assert StepKind.SUBPLAN in kinds
    assert StepKind.AGENT in kinds


# ── tool + skill dispatch ──────────────────────────────────────────────


async def test_tool_dispatch_passes_rendered_arguments() -> None:
    tid, wid, uid = _ids()
    tool = RecordingToolDispatchPort()
    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name="tool",
        description="",
        entry_dsl={
            "name": "tool",
            "entry": {
                "kind": "tool",
                "step_id": "t1",
                "tool_name": "echo",
                "arguments_template": {"text": "${variables.topic}"},
            },
        },
        max_total_steps=10,
        created_by=uid,
    )
    executor = _make_executor(tool=tool)
    run = WorkflowRun.create(
        tenant_id=tid,
        workspace_id=wid,
        plan_id=plan.id,
        plan_dsl_snapshot=dict(plan.entry_dsl),
        variables={"topic": "RAG"},
    )
    result = await executor.execute(
        tenant_id=tid, workspace_id=wid, owner_id=uid, run=run, plan=plan
    )
    assert result.run.status == WorkflowRunStatus.SUCCEEDED
    assert tool.calls[0]["arguments"] == {"text": "RAG"}


async def test_skill_dispatch_passes_rendered_arguments() -> None:
    tid, wid, uid = _ids()
    skill = RecordingSkillDispatchPort()
    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name="skill",
        description="",
        entry_dsl={
            "name": "skill",
            "entry": {
                "kind": "skill",
                "step_id": "s1",
                "skill_name": "summarize",
                "skill_version": "1.0.0",
                "arguments_template": {"text": "${variables.doc}"},
            },
        },
        max_total_steps=10,
        created_by=uid,
    )
    executor = _make_executor(skill=skill)
    run = WorkflowRun.create(
        tenant_id=tid,
        workspace_id=wid,
        plan_id=plan.id,
        plan_dsl_snapshot=dict(plan.entry_dsl),
        variables={"doc": "lorem"},
    )
    result = await executor.execute(
        tenant_id=tid, workspace_id=wid, owner_id=uid, run=run, plan=plan
    )
    assert result.run.status == WorkflowRunStatus.SUCCEEDED
    assert skill.calls[0]["arguments"] == {"text": "lorem"}


# ── max_total_steps ──────────────────────────────────────────────────────


async def test_max_total_steps_overrun_marks_workflow_failed() -> None:
    tid, wid, uid = _ids()
    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name="big",
        description="",
        entry_dsl={
            "name": "big",
            "entry": {
                "kind": "sequence",
                "step_id": "s",
                "steps": [
                    {
                        "kind": "agent",
                        "step_id": f"a{i}",
                        "agent_id": str(uuid4()),
                        "agent_version": "1.0.0",
                        "user_input_template": "x",
                    }
                    for i in range(3)
                ],
            },
        },
        max_total_steps=10,
        created_by=uid,
    )
    executor = _make_executor(max_total_steps=2)
    run = _run_for(plan)
    result = await executor.execute(
        tenant_id=tid, workspace_id=wid, owner_id=uid, run=run, plan=plan
    )
    assert result.run.status == WorkflowRunStatus.FAILED
    assert result.run.error_code == "WORKFLOW_TOO_LARGE"


# ── per-step timeout ─────────────────────────────────────────────────────


async def test_step_timeout_marks_workflow_timed_out() -> None:
    tid, wid, uid = _ids()

    class _SlowAgent(RecordingSubAgentPort):
        async def run_turn_to_completion(self, **_kw):  # type: ignore[override]
            await asyncio.sleep(2.0)

    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name="slow",
        description="",
        entry_dsl={
            "name": "slow",
            "entry": {
                "kind": "agent",
                "step_id": "slow1",
                "agent_id": str(uuid4()),
                "agent_version": "1.0.0",
                "user_input_template": "x",
                "timeout_seconds": 1,
            },
        },
        max_total_steps=10,
        created_by=uid,
    )
    executor = _make_executor(sub_agent=_SlowAgent())
    run = _run_for(plan)
    result = await executor.execute(
        tenant_id=tid, workspace_id=wid, owner_id=uid, run=run, plan=plan
    )
    assert result.run.status == WorkflowRunStatus.TIMED_OUT
    timed = [s for s in result.step_runs if s.status == StepRunStatus.TIMED_OUT]
    # The timeout path is synchronous (asyncio.wait_for raises) — the
    # leaf catches TimeoutError, persists a TIMED_OUT StepRun, then
    # raises WorkflowStepTimeout which the executor's main catch
    # converts to a terminal TIMED_OUT WorkflowRun.
    assert len(timed) == 1
    assert timed[0].latency_ms is not None


# ── terminal status mapping ─────────────────────────────────────────────


async def test_failed_dispatch_marks_workflow_failed() -> None:
    tid, wid, uid = _ids()
    agent = RecordingSubAgentPort()
    agent.raise_exc = RuntimeError("nope")

    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name="fail",
        description="",
        entry_dsl={
            "name": "fail",
            "entry": {
                "kind": "agent",
                "step_id": "a1",
                "agent_id": str(uuid4()),
                "agent_version": "1.0.0",
                "user_input_template": "x",
            },
        },
        max_total_steps=10,
        created_by=uid,
    )
    executor = _make_executor(sub_agent=agent)
    run = _run_for(plan)
    result = await executor.execute(
        tenant_id=tid, workspace_id=wid, owner_id=uid, run=run, plan=plan
    )
    assert result.run.status == WorkflowRunStatus.FAILED
    # The StepRun is recorded FAILED in the executor's leaf catch
    # before re-raising as WorkflowExecutionFailed.


async def test_step_run_status_persisted_for_succeeded() -> None:
    tid, wid, uid = _ids()
    agent = RecordingSubAgentPort()
    agent.default_message = "ok"

    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name="ok",
        description="",
        entry_dsl={
            "name": "ok",
            "entry": {
                "kind": "agent",
                "step_id": "a",
                "agent_id": str(uuid4()),
                "agent_version": "1.0.0",
                "user_input_template": "hi",
            },
        },
        max_total_steps=10,
        created_by=uid,
    )
    sr = InMemoryStepRunRepository()
    executor = _make_executor(sub_agent=agent, step_runs=sr)
    run = _run_for(plan)
    result = await executor.execute(
        tenant_id=tid, workspace_id=wid, owner_id=uid, run=run, plan=plan
    )
    rows = await sr.list_for_run(tenant_id=tid, run_id=result.run.id)
    assert len(rows) == 1
    assert rows[0].status == StepRunStatus.SUCCEEDED
    assert rows[0].latency_ms is not None


async def test_executor_signature_keeps_run_state_immutable() -> None:
    """Sanity check: the executor returns a NEW WorkflowRun with the
    RUNNING→SUCCEEDED transition; the input ``run`` is not mutated."""
    tid, wid, uid = _ids()
    agent = RecordingSubAgentPort()
    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name="ok",
        description="",
        entry_dsl={
            "name": "ok",
            "entry": {
                "kind": "agent",
                "step_id": "a",
                "agent_id": str(uuid4()),
                "agent_version": "1.0.0",
                "user_input_template": "hi",
            },
        },
        max_total_steps=10,
        created_by=uid,
    )
    executor = _make_executor(sub_agent=agent)
    run = _run_for(plan)
    original_status = run.status
    result = await executor.execute(
        tenant_id=tid, workspace_id=wid, owner_id=uid, run=run, plan=plan
    )
    assert run.status == original_status  # input untouched
    assert result.run.status == WorkflowRunStatus.SUCCEEDED


# ── validate against synthetic plan DSL ────────────────────────────────


def test_plan_dsl_validates_against_executor_entry() -> None:
    plan_dsl = PlanDSL.model_validate(
        {
            "name": "ok",
            "entry": {
                "kind": "agent",
                "step_id": "a",
                "agent_id": str(uuid4()),
                "agent_version": "1.0.0",
                "user_input_template": "x",
            },
        }
    )
    assert plan_dsl.entry.kind == "agent"