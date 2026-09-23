"""OrchestrationService — composition root for orchestration use cases.

Mirrors :class:`KnowledgeService` from P7-2/4.  ``from_parts`` is the
factory the composition root uses to wire the per-request session.
"""

from __future__ import annotations

from dataclasses import dataclass

from deos.modules.orchestration.application.executor import WorkflowExecutor
from deos.modules.orchestration.application.ports import (
    ConditionEvaluatorPort,
    OrchestrationEventPublisher,
    PlanRepository,
    SkillDispatchPort,
    StepRunRepository,
    SubAgentPort,
    TemplateRendererPort,
    ToolDispatchPort,
    WorkflowRunRepository,
)
from deos.modules.orchestration.application.use_cases.cancel_run import (
    CancelRunUseCase,
)
from deos.modules.orchestration.application.use_cases.create_plan import (
    CreatePlanUseCase,
)
from deos.modules.orchestration.application.use_cases.list_plans import (
    GetPlanUseCase,
    ListPlansUseCase,
)
from deos.modules.orchestration.application.use_cases.list_runs import (
    GetRunUseCase,
    ListRunsUseCase,
)
from deos.modules.orchestration.application.use_cases.run_plan import (
    RunPlanUseCase,
)
from deos.modules.orchestration.application.vetter import PlanVetter
from deos.modules.orchestration.domain.value_objects import (
    DEFAULT_STEP_TIMEOUT_SECONDS,
    MAX_TOTAL_STEPS,
    StepLimits,
)


@dataclass(slots=True)
class OrchestrationService:
    plan_repository: PlanRepository
    run_repository: WorkflowRunRepository
    step_run_repository: StepRunRepository
    sub_agent: SubAgentPort
    tool_dispatch: ToolDispatchPort
    skill_dispatch: SkillDispatchPort
    template_renderer: TemplateRendererPort
    condition_evaluator: ConditionEvaluatorPort
    publisher: OrchestrationEventPublisher | None = None
    policy_guard: object | None = None
    max_total_steps: int = MAX_TOTAL_STEPS
    default_step_timeout_seconds: int = DEFAULT_STEP_TIMEOUT_SECONDS
    plan_vetter: PlanVetter | None = None

    create_plan: CreatePlanUseCase | None = None
    get_plan: GetPlanUseCase | None = None
    list_plans: ListPlansUseCase | None = None
    run_plan: RunPlanUseCase | None = None
    get_run: GetRunUseCase | None = None
    list_runs: ListRunsUseCase | None = None
    cancel_run: CancelRunUseCase | None = None

    def __post_init__(self) -> None:
        # validate bounds before building any use case
        StepLimits(
            max_total_steps=self.max_total_steps,
            step_timeout_seconds=self.default_step_timeout_seconds,
        )
        executor = WorkflowExecutor(
            sub_agent=self.sub_agent,
            tool_dispatch=self.tool_dispatch,
            skill_dispatch=self.skill_dispatch,
            template_renderer=self.template_renderer,
            condition_evaluator=self.condition_evaluator,
            step_run_repository=self.step_run_repository,
            max_total_steps=self.max_total_steps,
            default_step_timeout_seconds=self.default_step_timeout_seconds,
        )
        self.create_plan = CreatePlanUseCase(
            repository=self.plan_repository,
            publisher=self.publisher,
            policy_guard=self.policy_guard,
            vetter=self.plan_vetter,
        )
        self.get_plan = GetPlanUseCase(repository=self.plan_repository)
        self.list_plans = ListPlansUseCase(repository=self.plan_repository)
        self.run_plan = RunPlanUseCase(
            plan_repository=self.plan_repository,
            run_repository=self.run_repository,
            executor=executor,
            publisher=self.publisher,
            policy_guard=self.policy_guard,
        )
        self.get_run = GetRunUseCase(repository=self.run_repository)
        self.list_runs = ListRunsUseCase(repository=self.run_repository)
        self.cancel_run = CancelRunUseCase(
            repository=self.run_repository,
            publisher=self.publisher,
            policy_guard=self.policy_guard,
        )

    # ---- factory --------------------------------------------------------

    @classmethod
    def from_parts(
        cls,
        *,
        plan_repository: PlanRepository,
        run_repository: WorkflowRunRepository,
        step_run_repository: StepRunRepository,
        sub_agent: SubAgentPort,
        tool_dispatch: ToolDispatchPort,
        skill_dispatch: SkillDispatchPort,
        template_renderer: TemplateRendererPort,
        condition_evaluator: ConditionEvaluatorPort,
        publisher: OrchestrationEventPublisher | None = None,
        policy_guard: object | None = None,
        max_total_steps: int = MAX_TOTAL_STEPS,
        default_step_timeout_seconds: int = DEFAULT_STEP_TIMEOUT_SECONDS,
        plan_vetter: PlanVetter | None = None,
    ) -> OrchestrationService:
        return cls(
            plan_repository=plan_repository,
            run_repository=run_repository,
            step_run_repository=step_run_repository,
            sub_agent=sub_agent,
            tool_dispatch=tool_dispatch,
            skill_dispatch=skill_dispatch,
            template_renderer=template_renderer,
            condition_evaluator=condition_evaluator,
            publisher=publisher,
            policy_guard=policy_guard,
            max_total_steps=max_total_steps,
            default_step_timeout_seconds=default_step_timeout_seconds,
            plan_vetter=plan_vetter,
        )


__all__ = ["OrchestrationService"]
_ = DEFAULT_STEP_TIMEOUT_SECONDS  # re-export marker
