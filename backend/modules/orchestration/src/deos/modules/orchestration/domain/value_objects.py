"""Orchestration value objects + Plan DSL literal types.

The DSL itself lives in :mod:`deos.modules.orchestration.application.dsl`
— this module only carries the runtime-evaluated enums + simple limit
value objects (no pydantic; pydantic is reserved for the DSL boundary).
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

MAX_TOTAL_STEPS = 256
MIN_TOTAL_STEPS = 1
MAX_DSL_BYTES = 64 * 1024  # 64 KiB
MAX_STEP_TIMEOUT_SECONDS = 600
DEFAULT_STEP_TIMEOUT_SECONDS = 60
MIN_STEP_TIMEOUT_SECONDS = 1


class StepKind(StrEnum):
    """Discriminator for the Plan DSL discriminated union.

    Maps 1:1 to the seven :class:`PlanStepDSL` variants in
    :mod:`application.dsl`.  Used as ``kind`` field on :class:`StepRun`
    so storage stays self-describing.
    """

    AGENT = "agent"
    TOOL = "tool"
    SKILL = "skill"
    SUBPLAN = "subplan"
    PARALLEL = "parallel"
    CONDITIONAL = "conditional"
    SEQUENCE = "sequence"


class WorkflowRunStatus(StrEnum):
    """Lifecycle of a single :class:`WorkflowRun`."""

    PENDING = "pending"  # row created; executor not yet kicked off
    RUNNING = "running"  # executor dispatched
    SUCCEEDED = "succeeded"  # terminal: entry returned without error
    FAILED = "failed"  # terminal: any step failed or evaluator denied
    CANCELED = "canceled"  # terminal: cancel_run called mid-flight
    TIMED_OUT = "timed_out"  # terminal: step exceeded its timeout


class StepRunStatus(StrEnum):
    """Lifecycle of a single :class:`StepRun`."""

    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    SKIPPED = "skipped"  # conditional branch not taken / fail_fast sibling
    TIMED_OUT = "timed_out"


@dataclass(slots=True, frozen=True)
class StepLimits:
    """Hard caps enforced by the executor at every dispatch boundary.

    ``max_total_steps`` is decremented by the executor on every step
    entered (including recursion through ``subplan``); a run that would
    exceed it raises :class:`WorkflowTooLarge` before any LLM call.
    """

    max_total_steps: int = MAX_TOTAL_STEPS
    step_timeout_seconds: int = DEFAULT_STEP_TIMEOUT_SECONDS

    def __post_init__(self) -> None:
        if not MIN_TOTAL_STEPS <= self.max_total_steps <= MAX_TOTAL_STEPS:
            raise ValueError(
                f"StepLimits.max_total_steps must be in "
                f"[{MIN_TOTAL_STEPS}, {MAX_TOTAL_STEPS}], got {self.max_total_steps}"
            )
        if (
            not MIN_STEP_TIMEOUT_SECONDS
            <= self.step_timeout_seconds
            <= MAX_STEP_TIMEOUT_SECONDS
        ):
            raise ValueError(
                f"StepLimits.step_timeout_seconds must be in "
                f"[{MIN_STEP_TIMEOUT_SECONDS}, {MAX_STEP_TIMEOUT_SECONDS}], "
                f"got {self.step_timeout_seconds}"
            )


__all__ = [
    "DEFAULT_STEP_TIMEOUT_SECONDS",
    "MAX_DSL_BYTES",
    "MAX_STEP_TIMEOUT_SECONDS",
    "MAX_TOTAL_STEPS",
    "MIN_STEP_TIMEOUT_SECONDS",
    "MIN_TOTAL_STEPS",
    "StepKind",
    "StepLimits",
    "StepRunStatus",
    "WorkflowRunStatus",
]
