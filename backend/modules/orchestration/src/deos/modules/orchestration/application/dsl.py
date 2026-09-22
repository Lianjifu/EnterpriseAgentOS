"""Plan DSL — pydantic v2 discriminated union over 7 step kinds.

The DSL is the boundary contract for plan authoring:

- :class:`PlanDSL` — top-level object (``name`` / ``description`` /
  ``variables`` / ``max_total_steps`` / ``entry``)
- :class:`PlanStepDSL` — discriminated union on ``kind`` with seven
  variants: ``agent`` / ``tool`` / ``skill`` / ``subplan`` / ``parallel`` /
  ``conditional`` / ``sequence``
- :class:`ConditionalWhenSpec` — ``when`` clause for the conditional step
- :class:`StepOutput` — captures the produced structured output of a step
  (template-rendered into ``steps.<id>.output.*`` for downstream steps)

Templates are simple ``${...}`` placeholders rendered by
:class:`TemplateRendererPort` at run time.  See
:mod:`application.template` for the renderer.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from deos.modules.orchestration.domain.value_objects import (
    MAX_DSL_BYTES,
    MAX_TOTAL_STEPS,
    MIN_TOTAL_STEPS,
)

__all__ = [
    "AgentStepDSL",
    "ConditionalWhenSpec",
    "ParallelStepDSL",
    "PlanDSL",
    "PlanStepDSL",
    "SequenceStepDSL",
    "SkillStepDSL",
    "SubPlanStepDSL",
    "ToolStepDSL",
]


# ── Shared base ──────────────────────────────────────────────────────────


class _DSLBase(BaseModel):
    """Common strict config for every DSL class."""

    model_config = ConfigDict(
        extra="forbid",
        frozen=True,
        str_strip_whitespace=True,
        validate_assignment=True,
    )


# step_id is mandatory on every concrete variant so downstream steps can
# reference it via ``${steps.<step_id>.output.*}``.
_STEP_ID = Annotated[
    str,
    StringConstraints(min_length=1, max_length=128, pattern=r"^[A-Za-z_][A-Za-z0-9_]*$"),
]


# ── Concrete step kinds ──────────────────────────────────────────────────


class AgentStepDSL(_DSLBase):
    kind: Literal["agent"]
    step_id: _STEP_ID
    agent_id: str = Field(min_length=1, max_length=128)
    agent_version: str = Field(min_length=1, max_length=64)
    user_input_template: str = Field(min_length=1)
    model_override: str | None = Field(default=None, max_length=128)
    timeout_seconds: int | None = Field(default=None, ge=1, le=600)


class ToolStepDSL(_DSLBase):
    kind: Literal["tool"]
    step_id: _STEP_ID
    tool_name: str = Field(min_length=1, max_length=128)
    arguments_template: dict[str, Any]
    timeout_seconds: int | None = Field(default=None, ge=1, le=600)


class SkillStepDSL(_DSLBase):
    kind: Literal["skill"]
    step_id: _STEP_ID
    skill_name: str = Field(min_length=1, max_length=128)
    skill_version: str | None = Field(default=None, max_length=64)
    arguments_template: dict[str, Any]
    timeout_seconds: int | None = Field(default=None, ge=1, le=600)


class SubPlanStepDSL(_DSLBase):
    kind: Literal["subplan"]
    step_id: _STEP_ID
    sub_plan: PlanDSL
    variables: dict[str, Any] = Field(default_factory=dict)


class SequenceStepDSL(_DSLBase):
    kind: Literal["sequence"]
    step_id: _STEP_ID
    steps: list[PlanStepDSL] = Field(min_length=1)

    @model_validator(mode="after")
    def _no_nested_sequence_only(self) -> SequenceStepDSL:
        # Convenience: allow a sequence whose only step is another
        # sequence (we collapse at execute time).  But forbid a sequence
        # of length 0 — already enforced by min_length=1 above.
        return self


class ParallelStepDSL(_DSLBase):
    kind: Literal["parallel"]
    step_id: _STEP_ID
    branches: list[PlanStepDSL] = Field(min_length=1)
    fail_fast: bool = True


class ConditionalWhenSpec(_DSLBase):
    """The ``when`` clause for a :class:`ConditionalStepDSL`."""

    expression: str = Field(min_length=1, max_length=512)


class ConditionalStepDSL(_DSLBase):
    kind: Literal["conditional"]
    step_id: _STEP_ID
    when: ConditionalWhenSpec
    branches: dict[Annotated[str, StringConstraints(min_length=1, max_length=64)], PlanStepDSL]
    default_branch: str | None = Field(default=None, max_length=64)

    @model_validator(mode="after")
    def _default_branch_in_branches(self) -> ConditionalStepDSL:
        if self.default_branch is not None and self.default_branch not in self.branches:
            raise ValueError(
                f"ConditionalStepDSL.default_branch {self.default_branch!r} "
                f"must be a key in branches "
                f"({sorted(self.branches.keys())})"
            )
        return self


PlanStepDSL = Annotated[
    AgentStepDSL | ToolStepDSL | SkillStepDSL | SubPlanStepDSL | SequenceStepDSL | ParallelStepDSL | ConditionalStepDSL,
    Field(discriminator="kind"),
]
"""Discriminated union over the seven step kinds, keyed on ``kind``."""


class PlanDSL(_DSLBase):
    """Top-level plan payload.

    The DSL is intentionally serializable to JSON (no Python objects
    beyond dict / list / str / int / float / bool / None) so it can be
    stored as JSONB and round-tripped without loss.
    """

    name: Annotated[str, StringConstraints(min_length=1, max_length=256)]
    description: str = Field(default="", max_length=2048)
    variables: dict[str, Any] = Field(default_factory=dict)
    max_total_steps: int = Field(default=64, ge=MIN_TOTAL_STEPS, le=MAX_TOTAL_STEPS)
    metadata: dict[str, Any] = Field(default_factory=dict)
    entry: PlanStepDSL

    @field_validator("variables", "metadata")
    @classmethod
    def _json_safe_values(cls, v: dict[str, Any]) -> dict[str, Any]:
        # Variables + metadata may contain any JSON value but not bytes
        # or arbitrary Python objects.  Pydantic v2 handles the JSON
        # validation; we just reject bytes explicitly.
        for k, val in v.items():
            if isinstance(val, bytes):
                raise TypeError(f"PlanDSL.{k}[{k!r}] must not contain bytes")
        return v

    @model_validator(mode="after")
    def _entry_step_id_unique(self) -> PlanDSL:
        seen: set[str] = set()

        def _walk(step: PlanStepDSL) -> None:
            sid = getattr(step, "step_id", None)
            if sid is not None:
                if sid in seen:
                    raise ValueError(f"PlanDSL has duplicate step_id {sid!r}")
                seen.add(sid)
            if step.kind == "sequence":
                assert isinstance(step, SequenceStepDSL)
                for child in step.steps:
                    _walk(child)
            elif step.kind == "parallel":
                assert isinstance(step, ParallelStepDSL)
                for child in step.branches:
                    _walk(child)
            elif step.kind == "conditional":
                assert isinstance(step, ConditionalStepDSL)
                for child in step.branches.values():
                    _walk(child)
            elif step.kind == "subplan":
                assert isinstance(step, SubPlanStepDSL)
                _walk(step.sub_plan.entry)

        _walk(self.entry)
        return self


# Forward references must be rebuilt after the union is declared.
SequenceStepDSL.model_rebuild()
ParallelStepDSL.model_rebuild()
ConditionalStepDSL.model_rebuild()
SubPlanStepDSL.model_rebuild()


def plan_dsl_to_json_size(payload: dict[str, Any]) -> int:
    """Best-effort byte-size estimate for a DSL payload (post-validation).

    Used by the repository to enforce ``MAX_DSL_BYTES`` before persisting.
    """
    import json

    return len(json.dumps(payload, ensure_ascii=False, default=str))


def assert_dsl_size(payload: dict[str, Any]) -> None:
    """Raise :class:`PlanValidationError` if the payload exceeds MAX_DSL_BYTES."""
    from deos.modules.orchestration.domain.errors import PlanValidationError

    size = plan_dsl_to_json_size(payload)
    if size > MAX_DSL_BYTES:
        raise PlanValidationError(
            f"plan DSL payload is {size} bytes; max {MAX_DSL_BYTES}"
        )