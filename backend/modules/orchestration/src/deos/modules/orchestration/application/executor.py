"""WorkflowExecutor — walks a Plan DSL tree and dispatches each step.

Supports all seven :class:`PlanStepDSL` kinds:

- ``agent``      — :class:`SubAgentPort.run_turn_to_completion`
- ``tool``       — :class:`ToolDispatchPort.invoke_tool`
- ``skill``      — :class:`SkillDispatchPort.invoke_skill`
- ``subplan``    — recursive :class:`WorkflowExecutor.execute` with
                   ``step_counter`` carried
- ``sequence``   — sequential children, fail on first error
- ``parallel``   — :func:`asyncio.gather` with ``fail_fast`` semantics
- ``conditional``— :class:`ConditionEvaluatorPort.evaluate` chooses a
                   branch; ``default_branch`` is the fallback when the
                   evaluator throws or returns an unknown key

Bounded recursion: ``step_counter`` is decremented on every step entered
(including sub-plan recursion); when it would go negative the executor
raises :class:`WorkflowTooLarge` *before* dispatching.

Per-step timeout: ``asyncio.wait_for(...)`` wraps every dispatch with the
plan's ``step_timeout_seconds`` (default 60s, max 600s).  On timeout the
corresponding :class:`StepRun` is marked ``TIMED_OUT`` and the
:class:`WorkflowRun` is marked ``TIMED_OUT``.

Step output is captured into a context dict under ``steps.<step_id>.output``
so downstream steps can reference it via ``${steps.<id>.output.<key>}``.
The entry step's output becomes the run's ``final_output``.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Any
from uuid import UUID, uuid4

from eos_schema.ids import (
    PlanId,
    StepRunId,
    TenantId,
    UserId,
    WorkflowRunId,
    WorkspaceId,
)

from deos.modules.orchestration.application.dsl import (
    AgentStepDSL,
    ConditionalStepDSL,
    ParallelStepDSL,
    PlanDSL,
    PlanStepDSL,
    SequenceStepDSL,
    SkillStepDSL,
    SubPlanStepDSL,
    ToolStepDSL,
    assert_dsl_size,
)
from deos.modules.orchestration.application.ports import (
    ConditionEvaluatorPort,
    SkillDispatchPort,
    SubAgentPort,
    TemplateRendererPort,
    ToolDispatchPort,
)
from deos.modules.orchestration.domain.entities import (
    Plan,
    StepRun,
    WorkflowRun,
)
from deos.modules.orchestration.domain.errors import (
    InvalidConditionExpression,
    PlanValidationError,
    WorkflowExecutionFailed,
    WorkflowStepTimeout,
    WorkflowTooLarge,
)
from deos.modules.orchestration.domain.value_objects import (
    DEFAULT_STEP_TIMEOUT_SECONDS,
    MAX_TOTAL_STEPS,
    MIN_TOTAL_STEPS,
    StepKind,
    StepLimits,
    StepRunStatus,
    WorkflowRunStatus,
)

logger = logging.getLogger(__name__)


class _LeafFailure(Exception):
    """Internal carrier for a failed/timed-out leaf step.

    Holds the StepRun row that was already persisted so the executor's
    top-level can include it in the final :class:`WorkflowExecutionResult`.
    Re-raises the public OrchestrationError via ``.cause``.
    """

    def __init__(self, step_run: StepRun, cause: Exception) -> None:
        super().__init__(str(cause))
        self.step_run = step_run
        self.cause = cause


class _WrappedLeafFailure(Exception):
    """Top-level wrapper that retains the leaf StepRun across the
    recursive :meth:`_walk` call without losing the original public
    exception (which must still match ``isinstance(exc, WorkflowExecutionFailed)``
    in :meth:`execute`'s top-level catch).
    """

    def __init__(self, step_run: StepRun, public: Exception) -> None:
        super().__init__(str(public))
        self.step_run = step_run
        self.public = public


# ── Public result ────────────────────────────────────────────────────────


@dataclass(slots=True, frozen=True)
class WorkflowExecutionResult:
    """Return shape of :meth:`WorkflowExecutor.execute`."""

    final_output: dict[str, Any]
    step_runs: tuple[StepRun, ...]
    run: WorkflowRun


# ── Per-step ports bundle ─────────────────────────────────────────────────


@dataclass(slots=True)
class _Ports:
    sub_agent: SubAgentPort
    tool_dispatch: ToolDispatchPort
    skill_dispatch: SkillDispatchPort
    template_renderer: TemplateRendererPort
    condition_evaluator: ConditionEvaluatorPort


# ── Executor ──────────────────────────────────────────────────────────────


class WorkflowExecutor:
    """Walks a Plan DSL and emits StepRun rows + terminal WorkflowRun."""

    def __init__(
        self,
        *,
        sub_agent: SubAgentPort,
        tool_dispatch: ToolDispatchPort,
        skill_dispatch: SkillDispatchPort,
        template_renderer: TemplateRendererPort,
        condition_evaluator: ConditionEvaluatorPort,
        step_run_repository,  # StepRunRepository — typed lazily to avoid import cycle
        max_total_steps: int = MAX_TOTAL_STEPS,
        default_step_timeout_seconds: int = DEFAULT_STEP_TIMEOUT_SECONDS,
    ) -> None:
        if not MIN_TOTAL_STEPS <= max_total_steps <= MAX_TOTAL_STEPS:
            raise ValueError(
                f"max_total_steps must be in [{MIN_TOTAL_STEPS}, {MAX_TOTAL_STEPS}], "
                f"got {max_total_steps}"
            )
        if default_step_timeout_seconds < 1 or default_step_timeout_seconds > 600:
            raise ValueError(
                f"default_step_timeout_seconds must be in [1, 600], "
                f"got {default_step_timeout_seconds}"
            )
        self._ports = _Ports(
            sub_agent=sub_agent,
            tool_dispatch=tool_dispatch,
            skill_dispatch=skill_dispatch,
            template_renderer=template_renderer,
            condition_evaluator=condition_evaluator,
        )
        self._step_run_repository = step_run_repository
        self._limits = StepLimits(
            max_total_steps=max_total_steps,
            step_timeout_seconds=default_step_timeout_seconds,
        )

    # ── public entry point ────────────────────────────────────────────────

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        owner_id: UserId,
        run: WorkflowRun,
        plan: Plan,
        policy_guard: object | None = None,
    ) -> WorkflowExecutionResult:
        """Execute the plan and return the final output + step rows.

        Marks ``run`` RUNNING on entry; SUCCEEDED / FAILED / TIMED_OUT /
        CANCELED on exit.
        """
        # Snapshot the DSL — historical runs must survive later edits.
        snapshot = dict(run.plan_dsl_snapshot)
        assert_dsl_size(snapshot)
        plan_dsl = PlanDSL.model_validate(snapshot)

        # Optional governance gate.
        if policy_guard is not None and hasattr(policy_guard, "check_workflow"):
            await policy_guard.check_workflow(
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                plan=plan,
            )

        # Publish RUN.started (idempotent at the application layer).
        started = run.with_status(
            WorkflowRunStatus.RUNNING,
            started_at=_utcnow(),
        )
        all_step_runs: list[StepRun] = []
        try:
            ctx: dict[str, Any] = {
                "variables": dict(run.variables),
                "steps": {},
            }
            final_output, all_step_runs = await self._walk(
                step=plan_dsl.entry,
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                owner_id=owner_id,
                run=started,
                ctx=ctx,
                step_counter=self._limits.max_total_steps,
                parent_step_run_id=None,
                depth=0,
                default_timeout=self._limits.step_timeout_seconds,
                variables_root=dict(run.variables),
            )
            finished = started.with_status(
                WorkflowRunStatus.SUCCEEDED,
                final_output=final_output,
                finished_at=_utcnow(),
            )
        except _WrappedLeafFailure as wlf:
            all_step_runs.append(wlf.step_run)
            public = wlf.public
            if isinstance(public, WorkflowStepTimeout):
                logger.warning(
                    "workflow run timed out run_id=%s reason=%s",
                    started.id,
                    str(public),
                )
                finished = started.with_status(
                    WorkflowRunStatus.TIMED_OUT,
                    error_code=public.code,
                    finished_at=_utcnow(),
                )
            elif isinstance(public, WorkflowTooLarge):
                logger.warning("workflow run too large run_id=%s", started.id)
                finished = started.with_status(
                    WorkflowRunStatus.FAILED,
                    error_code=public.code,
                    finished_at=_utcnow(),
                )
            else:
                logger.warning(
                    "workflow run failed run_id=%s error=%s",
                    started.id,
                    public.code if hasattr(public, "code") else "INTERNAL_ERROR",
                )
                finished = started.with_status(
                    WorkflowRunStatus.FAILED,
                    error_code=(
                        public.code
                        if hasattr(public, "code")
                        else "WORKFLOW_EXECUTION_FAILED"
                    ),
                    finished_at=_utcnow(),
                )
        except WorkflowStepTimeout as exc:
            logger.warning(
                "workflow run timed out run_id=%s reason=%s",
                started.id,
                exc.message,
            )
            finished = started.with_status(
                WorkflowRunStatus.TIMED_OUT,
                error_code=exc.code,
                finished_at=_utcnow(),
            )
        except WorkflowTooLarge as exc:
            logger.warning("workflow run too large run_id=%s", started.id)
            finished = started.with_status(
                WorkflowRunStatus.FAILED,
                error_code=exc.code,
                finished_at=_utcnow(),
            )
        except WorkflowExecutionFailed as exc:
            logger.warning(
                "workflow run failed run_id=%s error=%s",
                started.id,
                exc.code,
            )
            finished = started.with_status(
                WorkflowRunStatus.FAILED,
                error_code=exc.code,
                finished_at=_utcnow(),
            )

        return WorkflowExecutionResult(
            final_output=finished.final_output or {},
            step_runs=tuple(all_step_runs),
            run=finished,
        )

    # ── walker ────────────────────────────────────────────────────────────

    async def _walk(
        self,
        *,
        step: PlanStepDSL,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        owner_id: UserId,
        run: WorkflowRun,
        ctx: dict[str, Any],
        step_counter: int,
        parent_step_run_id: StepRunId | None,
        depth: int,
        default_timeout: int,
        variables_root: dict[str, Any],
    ) -> tuple[dict[str, Any], list[StepRun]]:
        if step_counter <= 0:
            raise WorkflowTooLarge(
                "workflow exceeded max_total_steps "
                f"({self._limits.max_total_steps})"
            )

        if step.kind == "sequence":
            assert isinstance(step, SequenceStepDSL)
            return await self._exec_sequence(
                step=step,
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                owner_id=owner_id,
                run=run,
                ctx=ctx,
                step_counter=step_counter,
                parent_step_run_id=parent_step_run_id,
                depth=depth,
                default_timeout=default_timeout,
                variables_root=variables_root,
            )
        if step.kind == "parallel":
            assert isinstance(step, ParallelStepDSL)
            return await self._exec_parallel(
                step=step,
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                owner_id=owner_id,
                run=run,
                ctx=ctx,
                step_counter=step_counter,
                parent_step_run_id=parent_step_run_id,
                depth=depth,
                default_timeout=default_timeout,
                variables_root=variables_root,
            )
        if step.kind == "conditional":
            assert isinstance(step, ConditionalStepDSL)
            return await self._exec_conditional(
                step=step,
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                owner_id=owner_id,
                run=run,
                ctx=ctx,
                step_counter=step_counter,
                parent_step_run_id=parent_step_run_id,
                depth=depth,
                default_timeout=default_timeout,
                variables_root=variables_root,
            )
        if step.kind == "subplan":
            assert isinstance(step, SubPlanStepDSL)
            return await self._exec_subplan(
                step=step,
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                owner_id=owner_id,
                run=run,
                ctx=ctx,
                step_counter=step_counter,
                parent_step_run_id=parent_step_run_id,
                depth=depth,
                default_timeout=default_timeout,
                variables_root=variables_root,
            )
        # leaf kinds: dispatch via the per-kind helper
        try:
            return await self._dispatch_leaf(
                step=step,
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                owner_id=owner_id,
                run=run,
                ctx=ctx,
                step_counter=step_counter,
                parent_step_run_id=parent_step_run_id,
                depth=depth,
                default_timeout=default_timeout,
            )
        except _LeafFailure as lf:
            # The leaf already persisted its own StepRun; surface it on
            # the result and re-raise the public error so the executor's
            # top-level converts the run to a terminal status.
            raise _WrappedLeafFailure(lf.step_run, lf.cause) from lf

    # ── sequence ──────────────────────────────────────────────────────────

    async def _exec_sequence(
        self,
        *,
        step: SequenceStepDSL,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        owner_id: UserId,
        run: WorkflowRun,
        ctx: dict[str, Any],
        step_counter: int,
        parent_step_run_id: StepRunId | None,
        depth: int,
        default_timeout: int,
        variables_root: dict[str, Any],
    ) -> tuple[dict[str, Any], list[StepRun]]:
        # The sequence itself is not a leaf — it has no output of its own.
        # We do NOT emit a StepRun for it; downstream steps can still
        # reference children by their step_ids.
        all_rows: list[StepRun] = []
        last_output: dict[str, Any] = {}
        remaining = step_counter
        for child in step.steps:
            if remaining <= 0:
                raise WorkflowTooLarge(
                    "workflow exceeded max_total_steps "
                    f"({self._limits.max_total_steps})"
                )
            try:
                child_output, child_rows = await self._walk(
                    step=child,
                    tenant_id=tenant_id,
                    workspace_id=workspace_id,
                    owner_id=owner_id,
                    run=run,
                    ctx=ctx,
                    step_counter=remaining,
                    parent_step_run_id=parent_step_run_id,
                    depth=depth,
                    default_timeout=default_timeout,
                    variables_root=variables_root,
                )
            except _WrappedLeafFailure as wlf:
                # surface the leaf row alongside siblings that already
                # ran; re-raise the original public error so the
                # executor's top-level catch sees WorkflowExecutionFailed
                # / WorkflowStepTimeout / WorkflowTooLarge.
                all_rows.append(wlf.step_run)
                raise wlf.public from wlf
            remaining -= 1
            all_rows.extend(child_rows)
            last_output = child_output
        return last_output, all_rows

    # ── parallel ──────────────────────────────────────────────────────────

    async def _exec_parallel(
        self,
        *,
        step: ParallelStepDSL,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        owner_id: UserId,
        run: WorkflowRun,
        ctx: dict[str, Any],
        step_counter: int,
        parent_step_run_id: StepRunId | None,
        depth: int,
        default_timeout: int,
        variables_root: dict[str, Any],
    ) -> tuple[dict[str, Any], list[StepRun]]:
        # Each branch counts as 1 step + its children
        if step_counter <= 0:
            raise WorkflowTooLarge(
                "workflow exceeded max_total_steps "
                f"({self._limits.max_total_steps})"
            )

        async def _run_one(
            child: PlanStepDSL,
        ) -> tuple[dict[str, Any], list[StepRun]]:
            return await self._walk(
                step=child,
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                owner_id=owner_id,
                run=run,
                ctx=ctx,
                step_counter=step_counter - 1,
                parent_step_run_id=parent_step_run_id,
                depth=depth,
                default_timeout=default_timeout,
                variables_root=variables_root,
            )

        results = await asyncio.gather(
            *(_run_one(b) for b in step.branches),
            return_exceptions=not step.fail_fast,
        )
        merged_outputs: dict[str, Any] = {}
        all_rows: list[StepRun] = []
        for r in results:
            if isinstance(r, BaseException):
                # When fail_fast=True, asyncio.gather raises immediately
                # — we never reach here.  When fail_fast=False, gather
                # returns the exception object; we unwrap and record
                # the leaf row if present.
                if step.fail_fast:
                    raise r
                if isinstance(r, _WrappedLeafFailure):
                    all_rows.append(r.step_run)
                continue
            output, rows = r
            all_rows.extend(rows)
            if output:
                merged_outputs.update(output)
        return merged_outputs, all_rows

    # ── conditional ───────────────────────────────────────────────────────

    async def _exec_conditional(
        self,
        *,
        step: ConditionalStepDSL,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        owner_id: UserId,
        run: WorkflowRun,
        ctx: dict[str, Any],
        step_counter: int,
        parent_step_run_id: StepRunId | None,
        depth: int,
        default_timeout: int,
        variables_root: dict[str, Any],
    ) -> tuple[dict[str, Any], list[StepRun]]:
        if step_counter <= 0:
            raise WorkflowTooLarge(
                "workflow exceeded max_total_steps "
                f"({self._limits.max_total_steps})"
            )
        chosen_key: str | None = None
        try:
            raw = self._ports.condition_evaluator.evaluate(
                expression=step.when.expression,
                context=ctx,
            )
            chosen_key = _coerce_branch_key(raw)
        except InvalidConditionExpression:
            chosen_key = None

        if chosen_key not in step.branches:
            chosen_key = step.default_branch

        if chosen_key is None or chosen_key not in step.branches:
            # no branch matches → SKIPPED row, empty output
            return {}, []

        try:
            return await self._walk(
                step=step.branches[chosen_key],
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                owner_id=owner_id,
                run=run,
                ctx=ctx,
                step_counter=step_counter - 1,
                parent_step_run_id=parent_step_run_id,
                depth=depth,
                default_timeout=default_timeout,
                variables_root=variables_root,
            )
        except _WrappedLeafFailure as wlf:
            raise wlf.public from wlf

    # ── subplan ───────────────────────────────────────────────────────────

    async def _exec_subplan(
        self,
        *,
        step: SubPlanStepDSL,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        owner_id: UserId,
        run: WorkflowRun,
        ctx: dict[str, Any],
        step_counter: int,
        parent_step_run_id: StepRunId | None,
        depth: int,
        default_timeout: int,
        variables_root: dict[str, Any],
    ) -> tuple[dict[str, Any], list[StepRun]]:
        if step_counter <= 0:
            raise WorkflowTooLarge(
                "workflow exceeded max_total_steps "
                f"({self._limits.max_total_steps})"
            )
        if depth >= 16:
            raise WorkflowTooLarge(
                f"subplan recursion exceeded max depth (16) at step {step.step_id}"
            )

        # Emit a "parent" StepRun row that the child entries hang off of.
        sub_step_run = StepRun.start(
            tenant_id=tenant_id,
            run_id=run.id,
            step_id=step.step_id,
            kind=StepKind.SUBPLAN,
            parent_step_run_id=parent_step_run_id,
            depth=depth,
        )
        sub_step_run = await self._step_run_repository.add(sub_step_run)

        merged_vars = {**variables_root, **step.variables}
        sub_ctx: dict[str, Any] = {
            "variables": merged_vars,
            "steps": {},
        }
        try:
            output, child_rows = await self._walk(
                step=step.sub_plan.entry,
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                owner_id=owner_id,
                run=run,
                ctx=sub_ctx,
                step_counter=step_counter - 1,
                parent_step_run_id=sub_step_run.id,
                depth=depth + 1,
                default_timeout=default_timeout,
                variables_root=merged_vars,
            )
        except _WrappedLeafFailure as wlf:
            # Surface leaf row, then mark subplan FAILED, re-raise
            err_code = getattr(wlf.public, "code", "WORKFLOW_EXECUTION_FAILED")
            sub_step_run = await self._step_run_repository.update(
                sub_step_run.with_status(
                    StepRunStatus.FAILED,
                    error_code=err_code,
                    finished_at=_utcnow(),
                    latency_ms=0,
                )
            )
            await self._publish_step_completed(
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                run_id=run.id,
                step_run=sub_step_run,
            )
            raise wlf.public from wlf
        except Exception as exc:
            err_code = getattr(exc, "code", "WORKFLOW_EXECUTION_FAILED")
            sub_step_run = await self._step_run_repository.update(
                sub_step_run.with_status(
                    StepRunStatus.FAILED,
                    error_code=err_code,
                    finished_at=_utcnow(),
                    latency_ms=0,
                )
            )
            raise

        sub_step_run = await self._step_run_repository.update(
            sub_step_run.with_status(
                StepRunStatus.SUCCEEDED,
                output=output,
                finished_at=_utcnow(),
                latency_ms=0,
            )
        )
        # The subplan's own output is visible to outer steps as
        # ``steps.<subplan_step_id>.output.*``.
        ctx["steps"].setdefault(step.step_id, {"output": {}})
        ctx["steps"][step.step_id]["output"] = dict(output)
        all_rows = [sub_step_run, *child_rows]
        return output, all_rows

    # ── leaf dispatch ─────────────────────────────────────────────────────

    async def _dispatch_leaf(
        self,
        *,
        step: PlanStepDSL,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        owner_id: UserId,
        run: WorkflowRun,
        ctx: dict[str, Any],
        step_counter: int,
        parent_step_run_id: StepRunId | None,
        depth: int,
        default_timeout: int,
    ) -> tuple[dict[str, Any], list[StepRun]]:
        if step_counter <= 0:
            raise WorkflowTooLarge(
                "workflow exceeded max_total_steps "
                f"({self._limits.max_total_steps})"
            )

        timeout = default_timeout
        input_rendered: dict[str, Any] = {}
        kind = step.kind
        if kind == "agent":
            assert isinstance(step, AgentStepDSL)
            timeout = step.timeout_seconds or default_timeout
            input_rendered = {"user_input": step.user_input_template}
        elif kind == "tool":
            assert isinstance(step, ToolStepDSL)
            timeout = step.timeout_seconds or default_timeout
            input_rendered = {"arguments_template": step.arguments_template}
        elif kind == "skill":
            assert isinstance(step, SkillStepDSL)
            timeout = step.timeout_seconds or default_timeout
            input_rendered = {
                "skill_name": step.skill_name,
                "arguments_template": step.arguments_template,
            }
        else:  # pragma: no cover — guarded by discriminated union
            raise PlanValidationError(
                f"step kind {kind!r} cannot be dispatched as a leaf"
            )

        step_run = StepRun.start(
            tenant_id=tenant_id,
            run_id=run.id,
            step_id=step.step_id,
            kind=StepKind(kind),
            input_rendered=input_rendered,
            parent_step_run_id=parent_step_run_id,
            depth=depth,
        )
        step_run = await self._step_run_repository.add(step_run)

        started = time.monotonic()
        try:
            output = await asyncio.wait_for(
                self._dispatch_one(
                    step=step,
                    tenant_id=tenant_id,
                    workspace_id=workspace_id,
                    owner_id=owner_id,
                    ctx=ctx,
                ),
                timeout=timeout,
            )
        except TimeoutError as exc:
            latency = int((time.monotonic() - started) * 1000)
            timed_out = step_run.with_status(
                StepRunStatus.TIMED_OUT,
                error_code="WORKFLOW_STEP_TIMEOUT",
                finished_at=_utcnow(),
                latency_ms=latency,
            )
            timed_out = await self._step_run_repository.update(timed_out)
            raise _LeafFailure(timed_out, WorkflowStepTimeout(
                f"step {step.step_id!r} timed out after {timeout}s"
            )) from exc
        except Exception as exc:
            latency = int((time.monotonic() - started) * 1000)
            err_code = getattr(exc, "code", "WORKFLOW_EXECUTION_FAILED")
            failed = step_run.with_status(
                StepRunStatus.FAILED,
                error_code=err_code,
                finished_at=_utcnow(),
                latency_ms=latency,
            )
            failed = await self._step_run_repository.update(failed)
            if isinstance(exc, WorkflowExecutionFailed):
                raise _LeafFailure(failed, exc) from exc
            raise _LeafFailure(
                failed,
                WorkflowExecutionFailed(
                    f"step {step.step_id!r} failed: {exc}"
                ),
            ) from exc

        latency = int((time.monotonic() - started) * 1000)
        succeeded = step_run.with_status(
            StepRunStatus.SUCCEEDED,
            output=output,
            finished_at=_utcnow(),
            latency_ms=latency,
        )
        succeeded = await self._step_run_repository.update(succeeded)
        ctx["steps"].setdefault(step.step_id, {"output": {}})
        ctx["steps"][step.step_id]["output"] = dict(output)
        return output, [succeeded]

    async def _dispatch_one(
        self,
        *,
        step: PlanStepDSL,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        owner_id: UserId,
        ctx: dict[str, Any],
    ) -> dict[str, Any]:
        kind = step.kind
        if kind == "agent":
            assert isinstance(step, AgentStepDSL)
            rendered_input = self._ports.template_renderer.render(
                template=step.user_input_template,
                context=ctx,
            )
            result = await self._ports.sub_agent.run_turn_to_completion(
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                owner_id=owner_id,
                agent_id=UUID(str(step.agent_id)),
                agent_version=step.agent_version,
                user_input=rendered_input,
                model_override=step.model_override,
                timeout_seconds=step.timeout_seconds or self._limits.step_timeout_seconds,
            )
            return {
                "final_message": result.final_message,
                "turn_id": str(result.turn_id),
                "input_tokens": result.input_tokens,
                "output_tokens": result.output_tokens,
            }
        if kind == "tool":
            assert isinstance(step, ToolStepDSL)
            rendered_args = self._ports.template_renderer.render_object(
                template_obj=step.arguments_template,
                context=ctx,
            )
            return await self._ports.tool_dispatch.invoke_tool(
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                actor_id=owner_id,
                tool_name=step.tool_name,
                arguments=rendered_args,
                timeout_seconds=step.timeout_seconds or self._limits.step_timeout_seconds,
            )
        if kind == "skill":
            assert isinstance(step, SkillStepDSL)
            rendered_args = self._ports.template_renderer.render_object(
                template_obj=step.arguments_template,
                context=ctx,
            )
            return await self._ports.skill_dispatch.invoke_skill(
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                actor_id=owner_id,
                skill_name=step.skill_name,
                skill_version=step.skill_version,
                arguments=rendered_args,
                timeout_seconds=step.timeout_seconds or self._limits.step_timeout_seconds,
            )
        raise PlanValidationError(
            f"step kind {kind!r} is not a leaf (got {type(step).__name__})"
        )

    # ── events (use case owns publication) ─────────────────────────────────
    # The executor itself does not take an OrchestrationEventPublisher;
    # the use case wrapper publishes WorkflowRunStarted before invoke()
    # and WorkflowRunCompleted / WorkflowStepCompleted as the executor's
    # callbacks fire.  These two no-op hooks exist so the executor can
    # call them on terminal subplan / parallel paths without a hard
    # dependency on a publisher port.  Subclasses (in tests) or the
    # use case may monkey-patch them.
    async def _publish_step_completed(self, **_kw: Any) -> None:
        return None

    async def _publish_run_completed(self, **_kw: Any) -> None:
        return None


def _utcnow():
    from datetime import UTC, datetime

    return datetime.now(UTC)


_BRANCH_KEY_TRUE = {"true", "True", "yes", "1"}
_BRANCH_KEY_FALSE = {"false", "False", "no", "0"}


def _coerce_branch_key(raw: object) -> str | None:
    """Map an evaluator result to a branch key.

    Booleans coerce to ``"true"`` / ``"false"`` (the conventional DSL
    branch names).  Numbers map to their string form.  Strings pass
    through (with ``"True"`` / ``"False"`` normalized).  ``None`` and
    anything else returns ``None`` so the caller falls back to
    ``default_branch``.
    """
    if raw is None:
        return None
    if isinstance(raw, bool):
        return "true" if raw else "false"
    if isinstance(raw, (int, float)):
        return str(raw)
    if isinstance(raw, str):
        if raw in _BRANCH_KEY_TRUE:
            return "true"
        if raw in _BRANCH_KEY_FALSE:
            return "false"
        return raw
    return None


__all__ = [
    "WorkflowExecutionResult",
    "WorkflowExecutor",
]


# Silences "unused import" for the IDs that are only used for typing.
_ = (PlanId, StepRunId, TenantId, UserId, WorkflowRunId, WorkspaceId, uuid4)