"""Unit tests for the orchestration domain layer (P7-5).

Covers:

- :class:`Plan` / :class:`WorkflowRun` / :class:`StepRun` invariants
  and ``with_status`` immutability.
- :class:`PlanDSL` discriminated union — 7 step kinds + validation +
  JSON round-trip.
- :class:`StringTemplateRenderer` — variables + step output + nested
  path + error paths.
- :class:`SafeConditionEvaluator` — operators + short-circuit + paths.
- In-memory repositories — list / add / idempotency / cross-tenant
  isolation.
"""

from __future__ import annotations

from uuid import uuid4

import pytest
from _orchestration_unit_in_memory import (
    InMemoryPlanRepository,
    InMemoryStepRunRepository,
    InMemoryWorkflowRunRepository,
)
from eos_schema.ids import (
    PlanId,
    TenantId,
    UserId,
    WorkflowRunId,
    WorkspaceId,
)

from deos.modules.orchestration.application.conditions import (
    SafeConditionEvaluator,
)
from deos.modules.orchestration.application.dsl import (
    AgentStepDSL,
    ConditionalStepDSL,
    ParallelStepDSL,
    PlanDSL,
    SequenceStepDSL,
    SkillStepDSL,
    SubPlanStepDSL,
    ToolStepDSL,
    assert_dsl_size,
    plan_dsl_to_json_size,
)
from deos.modules.orchestration.application.template import (
    StringTemplateRenderer,
)
from deos.modules.orchestration.domain.entities import (
    Plan,
    StepRun,
    WorkflowRun,
)
from deos.modules.orchestration.domain.errors import (
    IdempotencyKeyConflict,
    PlanNameConflict,
    PlanValidationError,
)
from deos.modules.orchestration.domain.value_objects import (
    StepKind,
    StepLimits,
    StepRunStatus,
    WorkflowRunStatus,
)

# ── helpers ──────────────────────────────────────────────────────────────


def _ids() -> tuple[TenantId, WorkspaceId, UserId]:
    return TenantId(uuid4()), WorkspaceId(uuid4()), UserId(uuid4())


# ── Plan entity ──────────────────────────────────────────────────────────


def test_plan_create_rejects_empty_name() -> None:
    tid, wid, uid = _ids()
    with pytest.raises(ValueError, match="non-empty"):
        Plan.create(
            tenant_id=tid,
            workspace_id=wid,
            name="",
            description="",
            entry_dsl={"entry": {}},
            max_total_steps=10,
            created_by=uid,
        )


def test_plan_create_rejects_zero_max_total_steps() -> None:
    tid, wid, uid = _ids()
    with pytest.raises(ValueError, match="max_total_steps"):
        Plan.create(
            tenant_id=tid,
            workspace_id=wid,
            name="x",
            description="",
            entry_dsl={"entry": {}},
            max_total_steps=0,
            created_by=uid,
        )


def test_plan_create_stores_metadata() -> None:
    tid, wid, uid = _ids()
    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name="p",
        description="d",
        entry_dsl={"entry": {}},
        max_total_steps=10,
        metadata={"env": "prod"},
        created_by=uid,
    )
    assert plan.metadata == {"env": "prod"}
    assert plan.step_limits().max_total_steps == 10


# ── WorkflowRun entity ───────────────────────────────────────────────────


def test_workflow_run_starts_pending() -> None:
    tid, wid, _ = _ids()
    run = WorkflowRun.create(
        tenant_id=tid,
        workspace_id=wid,
        plan_id=PlanId(uuid4()),
        plan_dsl_snapshot={"entry": {}},
    )
    assert run.status == WorkflowRunStatus.PENDING
    assert run.started_at is None
    assert run.final_output is None
    assert not run.is_terminal()


def test_workflow_run_with_status_marks_terminal() -> None:
    tid, wid, _ = _ids()
    run = WorkflowRun.create(
        tenant_id=tid,
        workspace_id=wid,
        plan_id=PlanId(uuid4()),
        plan_dsl_snapshot={"entry": {}},
    )
    finished = run.with_status(
        WorkflowRunStatus.SUCCEEDED,
        final_output={"answer": 42},
    )
    assert finished.status == WorkflowRunStatus.SUCCEEDED
    assert finished.is_terminal()
    assert finished.final_output == {"answer": 42}


def test_workflow_run_rejects_long_idempotency_key() -> None:
    tid, wid, _ = _ids()
    with pytest.raises(ValueError, match="idempotency_key"):
        WorkflowRun.create(
            tenant_id=tid,
            workspace_id=wid,
            plan_id=PlanId(uuid4()),
            plan_dsl_snapshot={"entry": {}},
            idempotency_key="x" * 200,
        )


# ── StepRun entity ───────────────────────────────────────────────────────


def test_step_run_starts_running() -> None:
    tid = TenantId(uuid4())
    run_id = WorkflowRunId(uuid4())
    step = StepRun.start(
        tenant_id=tid,
        run_id=run_id,
        step_id="s1",
        kind=StepKind.AGENT,
    )
    assert step.status == StepRunStatus.RUNNING
    assert step.started_at is not None
    assert step.finished_at is None


def test_step_run_with_status_records_latency() -> None:
    tid = TenantId(uuid4())
    run_id = WorkflowRunId(uuid4())
    step = StepRun.start(
        tenant_id=tid,
        run_id=run_id,
        step_id="s1",
        kind=StepKind.TOOL,
    )
    done = step.with_status(
        StepRunStatus.SUCCEEDED,
        output={"x": 1},
        latency_ms=15,
    )
    assert done.status == StepRunStatus.SUCCEEDED
    assert done.output == {"x": 1}
    assert done.latency_ms == 15


# ── StepLimits ───────────────────────────────────────────────────────────


def test_step_limits_rejects_oversized_max_total_steps() -> None:
    with pytest.raises(ValueError, match="max_total_steps"):
        StepLimits(max_total_steps=10_000)


# ── DSL: 7 step kinds ────────────────────────────────────────────────────


def _agent_payload(agent_id: str, step_id: str = "a1") -> dict:
    return {
        "kind": "agent",
        "step_id": step_id,
        "agent_id": agent_id,
        "agent_version": "1.0.0",
        "user_input_template": "hi ${variables.topic}",
    }


def test_dsl_agent_step() -> None:
    plan = PlanDSL.model_validate(
        {
            "name": "p",
            "entry": _agent_payload(str(uuid4())),
        }
    )
    assert isinstance(plan.entry, AgentStepDSL)
    assert plan.entry.kind == StepKind.AGENT


def test_dsl_tool_step() -> None:
    plan = PlanDSL.model_validate(
        {
            "name": "p",
            "entry": {
                "kind": "tool",
                "step_id": "t1",
                "tool_name": "echo",
                "arguments_template": {"text": "hello"},
            },
        }
    )
    assert isinstance(plan.entry, ToolStepDSL)


def test_dsl_skill_step() -> None:
    plan = PlanDSL.model_validate(
        {
            "name": "p",
            "entry": {
                "kind": "skill",
                "step_id": "s1",
                "skill_name": "summarize",
                "skill_version": "1.0.0",
                "arguments_template": {"text": "x"},
            },
        }
    )
    assert isinstance(plan.entry, SkillStepDSL)


def test_dsl_subplan_step() -> None:
    plan = PlanDSL.model_validate(
        {
            "name": "p",
            "entry": {
                "kind": "subplan",
                "step_id": "sub",
                "sub_plan": {
                    "name": "child",
                    "entry": _agent_payload(str(uuid4())),
                },
                "variables": {"x": 1},
            },
        }
    )
    assert isinstance(plan.entry, SubPlanStepDSL)
    assert plan.entry.sub_plan.name == "child"


def test_dsl_sequence_step() -> None:
    plan = PlanDSL.model_validate(
        {
            "name": "p",
            "entry": {
                "kind": "sequence",
                "step_id": "seq",
                "steps": [
                    _agent_payload(str(uuid4()), "a"),
                    _agent_payload(str(uuid4()), "b"),
                ],
            },
        }
    )
    assert isinstance(plan.entry, SequenceStepDSL)
    assert len(plan.entry.steps) == 2


def test_dsl_parallel_step() -> None:
    plan = PlanDSL.model_validate(
        {
            "name": "p",
            "entry": {
                "kind": "parallel",
                "step_id": "par",
                "branches": [
                    {"kind": "tool", "step_id": "t1", "tool_name": "x",
                     "arguments_template": {}},
                    {"kind": "tool", "step_id": "t2", "tool_name": "y",
                     "arguments_template": {}},
                ],
                "fail_fast": False,
            },
        }
    )
    assert isinstance(plan.entry, ParallelStepDSL)
    assert plan.entry.fail_fast is False


def test_dsl_conditional_step() -> None:
    plan = PlanDSL.model_validate(
        {
            "name": "p",
            "entry": {
                "kind": "conditional",
                "step_id": "cond",
                "when": {"expression": "variables.vip == true"},
                "branches": {
                    "true": _agent_payload(str(uuid4()), "vip"),
                    "false": _agent_payload(str(uuid4()), "std"),
                },
                "default_branch": "false",
            },
        }
    )
    assert isinstance(plan.entry, ConditionalStepDSL)


# ── DSL validation ───────────────────────────────────────────────────────


def test_dsl_rejects_extra_field() -> None:
    with pytest.raises(Exception):  # noqa: B017  (pydantic ValidationError family)
        PlanDSL.model_validate(
            {
                "name": "p",
                "entry": _agent_payload(str(uuid4())),
                "unknown": 1,
            }
        )


def test_dsl_rejects_duplicate_step_id() -> None:
    with pytest.raises(Exception):  # noqa: B017
        PlanDSL.model_validate(
            {
                "name": "p",
                "entry": {
                    "kind": "sequence",
                    "step_id": "seq",
                    "steps": [
                        _agent_payload(str(uuid4()), "dup"),
                        _agent_payload(str(uuid4()), "dup"),
                    ],
                },
            }
        )


def test_dsl_rejects_invalid_step_id_pattern() -> None:
    with pytest.raises(Exception):  # noqa: B017
        PlanDSL.model_validate(
            {
                "name": "p",
                "entry": _agent_payload(str(uuid4()), "1-bad-id"),
            }
        )


def test_dsl_conditional_default_branch_must_be_in_branches() -> None:
    with pytest.raises(Exception):  # noqa: B017
        PlanDSL.model_validate(
            {
                "name": "p",
                "entry": {
                    "kind": "conditional",
                    "step_id": "c",
                    "when": {"expression": "x == 1"},
                    "branches": {
                        "true": _agent_payload(str(uuid4()), "t"),
                    },
                    "default_branch": "missing",
                },
            }
        )


def test_dsl_json_round_trip() -> None:
    payload = {
        "name": "round",
        "entry": {
            "kind": "parallel",
            "step_id": "par",
            "fail_fast": True,
            "branches": [
                _agent_payload(str(uuid4()), "a"),
                _agent_payload(str(uuid4()), "b"),
            ],
        },
    }
    plan = PlanDSL.model_validate(payload)
    serialized = plan.model_dump(mode="json")
    re_parsed = PlanDSL.model_validate(serialized)
    assert re_parsed.name == "round"
    assert isinstance(re_parsed.entry, ParallelStepDSL)
    assert len(re_parsed.entry.branches) == 2


def test_dsl_size_enforced() -> None:
    """A DSL > MAX_DSL_BYTES (64 KiB) raises PlanValidationError."""
    big = "x" * 70_000
    payload = {
        "name": "big",
        "entry": {
            "kind": "agent",
            "step_id": "a1",
            "agent_id": str(uuid4()),
            "agent_version": "1.0.0",
            "user_input_template": big,
        },
    }
    size = plan_dsl_to_json_size(payload)
    assert size > 64 * 1024
    with pytest.raises(PlanValidationError, match="max"):
        assert_dsl_size(payload)


# ── Template renderer ────────────────────────────────────────────────────


def test_template_renders_variables_only() -> None:
    r = StringTemplateRenderer()
    assert (
        r.render(
            template="topic=${variables.topic}",
            context={"variables": {"topic": "RAG"}},
        )
        == "topic=RAG"
    )


def test_template_renders_step_output() -> None:
    r = StringTemplateRenderer()
    out = r.render(
        template="prev=${steps.a.output.text}",
        context={
            "variables": {},
            "steps": {"a": {"output": {"text": "ok"}}},
        },
    )
    assert out == "prev=ok"


def test_template_renders_object_recursively() -> None:
    r = StringTemplateRenderer()
    out = r.render_object(
        template_obj={
            "a": "${variables.x}",
            "b": ["${variables.y}", 1, None, True],
            "c": {"nested": "${variables.z}"},
        },
        context={"variables": {"x": "X", "y": "Y", "z": "Z"}},
    )
    assert out == {"a": "X", "b": ["Y", 1, None, True], "c": {"nested": "Z"}}


def test_template_rejects_unknown_prefix() -> None:
    r = StringTemplateRenderer()
    with pytest.raises(PlanValidationError):
        r.render(
            template="${evil.thing}",
            context={"variables": {}},
        )


def test_template_rejects_missing_variable() -> None:
    r = StringTemplateRenderer()
    with pytest.raises(PlanValidationError):
        r.render(
            template="${variables.missing}",
            context={"variables": {}},
        )


# ── Condition evaluator ─────────────────────────────────────────────────


def test_condition_eq_true() -> None:
    e = SafeConditionEvaluator()
    assert e.evaluate(
        expression="variables.vip == true",
        context={"variables": {"vip": True}},
    )


def test_condition_in_list() -> None:
    e = SafeConditionEvaluator()
    assert e.evaluate(
        expression="variables.tier in ['gold', 'platinum']",
        context={"variables": {"tier": "gold"}},
    )


def test_condition_contains_substring() -> None:
    e = SafeConditionEvaluator()
    assert e.evaluate(
        expression='variables.msg contains "hello"',
        context={"variables": {"msg": "say hello there"}},
    )


def test_condition_short_circuit_or() -> None:
    """If the left side is truthy the right side is not evaluated; we
    confirm that by referencing an undefined identifier on the right.
    """
    e = SafeConditionEvaluator()
    assert e.evaluate(
        expression="true or undefined.path == 1",
        context={"variables": {}},
    )


def test_condition_rejects_eval_looking_input() -> None:
    e = SafeConditionEvaluator()
    with pytest.raises(Exception):  # noqa: B017
        e.evaluate(
            expression="__import__('os').system('rm -rf /')",
            context={"variables": {}},
        )


def test_condition_rejects_undefined_identifier() -> None:
    e = SafeConditionEvaluator()
    with pytest.raises(Exception):  # noqa: B017
        e.evaluate(
            expression="undefined == 1",
            context={"variables": {}},
        )


# ── Repositories (in-memory) ─────────────────────────────────────────────


async def test_plan_repo_round_trip() -> None:
    repo = InMemoryPlanRepository()
    tid, wid, uid = _ids()
    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name="alpha",
        description="",
        entry_dsl={"entry": _agent_payload(str(uuid4()))},
        max_total_steps=10,
        created_by=uid,
    )
    await repo.add(plan)
    got = await repo.get(tenant_id=tid, plan_id=plan.id)
    assert got is not None
    assert got.name == "alpha"

    listed = await repo.list(tenant_id=tid, workspace_id=wid)
    assert any(p.id == plan.id for p in listed)


async def test_plan_repo_name_conflict() -> None:
    repo = InMemoryPlanRepository()
    tid, wid, uid = _ids()
    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name="dup",
        description="",
        entry_dsl={"entry": _agent_payload(str(uuid4()))},
        max_total_steps=10,
        created_by=uid,
    )
    await repo.add(plan)
    with pytest.raises(PlanNameConflict):
        await repo.add(plan)


async def test_plan_repo_cross_tenant_isolation() -> None:
    repo = InMemoryPlanRepository()
    tid_a, wid_a, uid_a = _ids()
    tid_b, _, _ = _ids()
    plan_a = Plan.create(
        tenant_id=tid_a,
        workspace_id=wid_a,
        name="p",
        description="",
        entry_dsl={"entry": _agent_payload(str(uuid4()))},
        max_total_steps=10,
        created_by=uid_a,
    )
    await repo.add(plan_a)
    cross = await repo.get(tenant_id=tid_b, plan_id=plan_a.id)
    assert cross is None


async def test_workflow_run_repo_idempotency() -> None:
    repo = InMemoryWorkflowRunRepository()
    tid, wid, _ = _ids()
    run_a = WorkflowRun.create(
        tenant_id=tid,
        workspace_id=wid,
        plan_id=PlanId(uuid4()),
        plan_dsl_snapshot={"entry": {}},
        idempotency_key="k1",
    )
    await repo.add(run_a)
    run_b = WorkflowRun.create(
        tenant_id=tid,
        workspace_id=wid,
        plan_id=PlanId(uuid4()),
        plan_dsl_snapshot={"entry": {}},
        idempotency_key="k1",
    )
    with pytest.raises(IdempotencyKeyConflict):
        await repo.add(run_b)


async def test_workflow_run_repo_lookup_by_idempotency_key() -> None:
    repo = InMemoryWorkflowRunRepository()
    tid, wid, _ = _ids()
    run = WorkflowRun.create(
        tenant_id=tid,
        workspace_id=wid,
        plan_id=PlanId(uuid4()),
        plan_dsl_snapshot={"entry": {}},
        idempotency_key="k",
    )
    await repo.add(run)
    found = await repo.get_by_idempotency_key(
        tenant_id=tid, idempotency_key="k"
    )
    assert found is not None
    assert found.id == run.id


async def test_step_run_repo_round_trip() -> None:
    repo = InMemoryStepRunRepository()
    tid = TenantId(uuid4())
    run_id = WorkflowRunId(uuid4())
    step = StepRun.start(
        tenant_id=tid,
        run_id=run_id,
        step_id="s",
        kind=StepKind.AGENT,
    )
    await repo.add(step)
    done = step.with_status(StepRunStatus.SUCCEEDED, output={"x": 1})
    await repo.update(done)
    rows = await repo.list_for_run(tenant_id=tid, run_id=run_id)
    assert len(rows) == 1
    assert rows[0].status == StepRunStatus.SUCCEEDED


__all__: list[str] = []