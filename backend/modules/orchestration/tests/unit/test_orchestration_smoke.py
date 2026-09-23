"""Smoke test — verify Plan DSL + template renderer + condition evaluator
parse correctly.  Full unit tests live in test_orchestration_domain.py
(P7-5).
"""

from __future__ import annotations

from deos.modules.orchestration.application.conditions import (
    SafeConditionEvaluator,
)
from deos.modules.orchestration.application.dsl import PlanDSL
from deos.modules.orchestration.application.template import (
    StringTemplateRenderer,
)
from deos.modules.orchestration.domain.value_objects import StepKind

_PLAN_PAYLOAD = {
    "name": "smoke",
    "description": "test",
    "variables": {"topic": "RAG"},
    "max_total_steps": 8,
    "entry": {
        "kind": "sequence",
        "step_id": "pipeline",
        "steps": [
            {
                "kind": "agent",
                "step_id": "gather",
                "agent_id": "00000000-0000-0000-0000-000000000001",
                "agent_version": "1.0.0",
                "user_input_template": "Research ${variables.topic}",
            },
            {
                "kind": "agent",
                "step_id": "followup",
                "agent_id": "00000000-0000-0000-0000-000000000002",
                "agent_version": "1.0.0",
                "user_input_template": "followup ${steps.gather.output.final_message}",
            },
        ],
    },
}


def test_plan_dsl_parses() -> None:
    plan = PlanDSL.model_validate(_PLAN_PAYLOAD)
    assert plan.name == "smoke"
    assert plan.entry.kind == StepKind.SEQUENCE
    assert len(plan.entry.steps) == 2
    assert plan.entry.steps[0].kind == StepKind.AGENT


def test_template_renders_variables_and_step_output() -> None:
    renderer = StringTemplateRenderer()
    ctx = {
        "variables": {"topic": "RAG"},
        "steps": {
            "gather": {"output": {"final_message": "facts"}},
        },
    }
    out = renderer.render(
        template="Research ${variables.topic}; followup ${steps.gather.output.final_message}",
        context=ctx,
    )
    assert out == "Research RAG; followup facts"


def test_condition_evaluator() -> None:
    evaluator = SafeConditionEvaluator()
    assert (
        evaluator.evaluate(
            expression="variables.vip == true",
            context={"variables": {"vip": True}},
        )
        is True
    )
    assert (
        evaluator.evaluate(
            expression="variables.tier in ['gold','platinum']",
            context={"variables": {"tier": "gold"}},
        )
        is True
    )
    assert (
        evaluator.evaluate(
            expression="variables.score > 50 and not variables.archived",
            context={"variables": {"score": 80, "archived": False}},
        )
        is True
    )


__all__: list[str] = []
