"""Lifespan + bootstrap helpers.

On boot, the lifespan:
  1. Configures logging + tracing + default LLM client.
  2. Builds the per-request IdentityService factory and stores it on
     `app.state.identity_factory` so the FastAPI dependency can resolve it.
  3. Seeds a default tenant + workspace + admin user when the DB is empty
     (dev/test only — see ``ensure_default_resources``).
  4. Starts the event bus.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from logging import getLogger
from uuid import UUID

from fastapi import FastAPI

from deos.composition.container import Container

_log = getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Boot/shutdown hooks."""
    container: Container = app.state.container

    # ── logging ──────────────────────────────────────────────────────────
    from eos_observability.logging import configure_logging

    configure_logging(
        level=container.settings.log_level, json=container.settings.log_json
    )

    # ── tracing ──────────────────────────────────────────────────────────
    if container.settings.otlp_endpoint:
        from eos_observability.tracing import configure_tracing

        configure_tracing(
            service_name="eos-app",
            otlp_endpoint=container.settings.otlp_endpoint,
            sample_rate=container.settings.traces_sample_rate,
        )

    # ── LLM default client ───────────────────────────────────────────────
    container.configure_llm_default()

    # ── per-request identity factory ─────────────────────────────────────
    from deos.modules.identity.adapter.persistence.repositories import (
        SqlAPIKeyRepository,
        SqlTenantRepository,
        SqlUserRepository,
        SqlWorkspaceRepository,
    )
    from deos.modules.identity.application.services import IdentityService

    class _IdentityFactoryRequest:
        def __init__(self, sf) -> None:  # type: ignore[no-untyped-def]
            self._sf = sf
            self._token_issuer = container.jwt_issuer()

        def for_session(self, session):  # type: ignore[no-untyped-def]
            return IdentityService(
                tenants=SqlTenantRepository(session),
                workspaces=SqlWorkspaceRepository(session),
                users=SqlUserRepository(session),
                api_keys=SqlAPIKeyRepository(session),
                hasher=container.hasher(),
                issuer=_TokenIssuerAdapter(self._token_issuer),
            )

    class _TokenIssuerAdapter:
        def __init__(self, issuer) -> None:  # type: ignore[no-untyped-def]
            self._issuer = issuer

        def issue(self, user, workspace_id):  # type: ignore[no-untyped-def]
            token, exp = self._issuer.issue_access_token(
                principal_id=user.id,
                tenant_id=user.tenant_id,
                workspace_id=workspace_id,
                roles=frozenset({"workspace_member"}),
            )
            return token, exp

    app.state.identity_factory = _IdentityFactoryRequest(container.session_factory())

    # ── per-request agent_runtime factory ────────────────────────────────
    from deos.modules.agent_runtime.adapter.events import (
        AgentRuntimeEventPublisher,
    )
    from deos.modules.agent_runtime.adapter.llm import LLMPortAdapter
    from deos.modules.agent_runtime.adapter.persistence.repositories import (
        SqlSessionRepository,
        SqlTurnRepository,
    )
    from deos.modules.agent_runtime.application.services import (
        AgentRuntimeService,
    )

    # P6: model_service may be None when EOS_MODEL_MASTER_KEY is unset
    # (e.g. legacy dev shells); LLMPortAdapter gracefully degrades to
    # the default LLMClient when model_service is absent.
    model_service = None
    try:
        model_service = container.model_service()
    except RuntimeError as exc:
        _log.warning("model_service disabled: %s", exc)

    class _AgentRuntimeFactory:
        def __init__(self) -> None:
            self._llm_client = container.llm_client()
            self._bus = container.bus()

        def for_session(self, session):  # type: ignore[no-untyped-def]
            llm = LLMPortAdapter(
                self._llm_client,
                model_service=model_service,
            )
            # Lazily resolve the per-request knowledge service and wrap it
            # in the agent_runtime's KnowledgePort adapter so RunTurnUseCase
            # can pull RAG context into the system prompt.
            from deos.modules.agent_runtime.adapter.knowledge import (
                KnowledgeServiceAdapter,
            )

            knowledge_adapter: object | None = None
            knowledge_factory = getattr(
                app.state, "knowledge_service_factory", None
            )
            if knowledge_factory is not None:
                try:
                    knowledge_adapter = KnowledgeServiceAdapter(
                        knowledge_factory.for_session()
                    )
                except Exception:  # pragma: no cover - defensive  # noqa: BLE001
                    _log.warning(
                        "knowledge adapter unavailable; turns will skip RAG",
                        exc_info=True,
                    )
                    knowledge_adapter = None

            return AgentRuntimeService(
                sessions=SqlSessionRepository(session),
                turns=SqlTurnRepository(session),
                llm=llm,
                events=AgentRuntimeEventPublisher(self._bus),
                knowledge_port=knowledge_adapter,
            )

    app.state.agent_runtime_factory = _AgentRuntimeFactory()
    app.state.model_service = model_service

    # ── per-request channel factory ─────────────────────────────────────────
    channel_service_obj = None
    try:
        channel_service_obj = container.channel_service()
    except Exception as exc:  # noqa: BLE001
        _log.warning("channel_service disabled: %s", exc)

    app.state.channel_service = channel_service_obj
    app.state.channel_inbound_registry = container.channel_inbound_registry()
    app.state.channel_outbound_registry = container.channel_outbound_registry()

    # ── per-request tool factory ─────────────────────────────────────
    import httpx as _httpx
    from deos.modules.tool.adapter.adapters import (
        CustomInvokerRegistry,
        MCPRuntimeAdapter,
        OpenAPIRuntimeAdapter,
        built_in_invoke_clock,
        built_in_invoke_echo,
        built_in_invoke_reverse,
    )
    from deos.modules.tool.adapter.events import ToolEventPublisher
    from deos.modules.tool.adapter.persistence.repositories import (
        SqlToolCallRepository,
        SqlToolRepository,
    )
    from deos.modules.tool.application.services import ToolService

    http_client = _httpx.AsyncClient(timeout=30.0)
    secrets_resolver = container.secrets_resolver()
    openapi_rt = OpenAPIRuntimeAdapter(
        http=http_client, secrets_resolver=secrets_resolver
    )
    mcp_rt = MCPRuntimeAdapter(http=http_client, secrets_resolver=secrets_resolver)

    custom_invoker = CustomInvokerRegistry()
    custom_invoker.register("echo", built_in_invoke_echo)
    custom_invoker.register("reverse", built_in_invoke_reverse)
    custom_invoker.register("clock", built_in_invoke_clock)

    class _ToolFactory:
        def __init__(self) -> None:
            self._bus = container.bus()

        def for_session(self, session):  # type: ignore[no-untyped-def]
            return ToolService(
                tools=SqlToolRepository(session),
                calls=SqlToolCallRepository(session),
                custom=custom_invoker,
                openapi=openapi_rt,
                mcp=mcp_rt,
                events=ToolEventPublisher(self._bus),
                tool_call_timeout_seconds=container.settings.tool_call_timeout_seconds,
            )

    app.state.tool_factory = _ToolFactory()

    # ── per-request skill factory ─────────────────────────────────────────
    from deos.modules.skill.adapter.events import MessagingSkillEventPublisher
    from deos.modules.skill.adapter.persistence.repositories import (
        SqlSkillInstallRepository,
        SqlSkillInvocationRepository,
        SqlSkillRepository,
    )
    from deos.modules.skill.adapter.persistence.uow import SqlSkillUnitOfWork
    from deos.modules.skill.adapter.run_token import EosRunTokenIssuer
    from deos.modules.skill.application.invocation_runner import InvocationRunner
    from deos.modules.skill.application.services import SkillService

    skill_bus = container.bus()
    skill_publisher = MessagingSkillEventPublisher(skill_bus)
    skill_run_token_issuer = EosRunTokenIssuer(
        secret=container.settings.run_token_secret,
        default_ttl_seconds=container.settings.skill_run_token_ttl_seconds,
    )
    skill_artifacts = container.skill_artifact_store()
    app.state.sandbox = container.sandbox()

    class _SkillFactory:
        def __init__(self) -> None:
            self._publisher = skill_publisher
            self._run_token_issuer = skill_run_token_issuer
            self._artifacts = skill_artifacts
            self._default_timeout = (
                container.settings.skill_invocation_default_timeout_seconds
            )
            self._tail_cap = container.settings.skill_artifact_tail_max_bytes
            self._sandbox = app.state.sandbox

        def _build_runner(self, session) -> InvocationRunner:  # type: ignore[no-untyped-def]
            invocations_repo = SqlSkillInvocationRepository(session)
            return InvocationRunner(
                sandbox=self._sandbox,
                invocations=invocations_repo,
                publisher=self._publisher,
                artifacts=self._artifacts,
                default_timeout_seconds=self._default_timeout,
                tail_cap_bytes=self._tail_cap,
            )

        def for_session(self, session):  # type: ignore[no-untyped-def]
            class _SessionBoundUoW(SqlSkillUnitOfWork):
                def __init__(self, s) -> None:  # type: ignore[no-untyped-def]
                    self._s = s
                    self.skills = SqlSkillRepository(s)
                    self.installs = SqlSkillInstallRepository(s)
                    self.invocations = SqlSkillInvocationRepository(s)

                async def __aenter__(self):  # type: ignore[no-untyped-def,override]
                    return self

                async def __aexit__(self, *exc) -> None:
                    return None

                async def commit(self) -> None:
                    return None

                async def rollback(self) -> None:
                    return None

            return SkillService(
                uow_factory=lambda: _SessionBoundUoW(session),
                publisher=self._publisher,
                run_token_issuer=self._run_token_issuer,
                runner=self._build_runner(session),
                skill_repository=SqlSkillRepository(session),
                install_repository=SqlSkillInstallRepository(session),
                invocation_repository=SqlSkillInvocationRepository(session),
                artifacts=self._artifacts,
                run_token_ttl_seconds=container.settings.skill_run_token_ttl_seconds,
            )

    app.state.skill_factory = _SkillFactory()

    # ── per-request memory factory ──────────────────────────────────────
    from deos.modules.memory.adapter.events import MessagingMemoryEventPublisher
    from deos.modules.memory.adapter.persistence.repositories import (
        SqlMemoryRepository,
    )
    from deos.modules.memory.adapter.persistence.vector_adapter import (
        PgMemoryVectorAdapter,
    )
    from deos.modules.memory.application.services import MemoryService

    memory_bus = container.bus()
    memory_publisher = MessagingMemoryEventPublisher(memory_bus)
    policy_guard = (
        container.policy_guard() if container.settings.policy_enabled else None
    )

    class _MemoryFactory:
        def for_session(self):  # type: ignore[no-untyped-def]
            sf = container.session_factory().maker()
            return MemoryService.from_parts(
                repository=SqlMemoryRepository(sf),
                vector_search=PgMemoryVectorAdapter(
                    store=container.memory_vector_store(),
                ),
                embedding=container.memory_embedding_adapter(),
                publisher=memory_publisher,
                policy_guard=policy_guard,
            )

    app.state.memory_service_factory = _MemoryFactory()

    # ── per-request knowledge factory ───────────────────────────────────
    from deos.modules.knowledge.adapter.events import (
        MessagingKnowledgeEventPublisher,
    )
    from deos.modules.knowledge.adapter.persistence.repositories import (
        SqlKnowledgeRepository,
    )
    from deos.modules.knowledge.adapter.persistence.vector_adapter import (
        PgKnowledgeVectorAdapter,
    )
    from deos.modules.knowledge.application.chunker import FixedWindowChunker
    from deos.modules.knowledge.application.services import KnowledgeService

    knowledge_bus = container.bus()
    knowledge_publisher = MessagingKnowledgeEventPublisher(knowledge_bus)

    class _KnowledgeFactory:
        def for_session(self):  # type: ignore[no-untyped-def]
            sf = container.session_factory().maker()
            return KnowledgeService.from_parts(
                repository=SqlKnowledgeRepository(sf),
                storage=container.knowledge_storage(),
                embedding=container.memory_embedding_adapter(),
                vector_search=PgKnowledgeVectorAdapter(
                    store=container.knowledge_vector_store(),
                ),
                publisher=knowledge_publisher,
                chunker=FixedWindowChunker(),
                policy_guard=policy_guard,
                default_chunk_size=container.settings.knowledge_default_chunk_size,
                default_chunk_overlap=(
                    container.settings.knowledge_default_chunk_overlap
                ),
            )

    app.state.knowledge_service_factory = _KnowledgeFactory()

    # ── per-request orchestration factory ───────────────────────────────
    from deos.modules.orchestration.adapter.events import (
        MessagingOrchestrationEventPublisher,
    )
    from deos.modules.orchestration.adapter.persistence.repositories import (
        SqlPlanRepository,
        SqlStepRunRepository,
        SqlWorkflowRunRepository,
    )
    from deos.modules.orchestration.adapter.runtime_adapters import (
        SkillDispatchAdapter,
        SubAgentAdapter,
        ToolDispatchAdapter,
    )
    from deos.modules.orchestration.application.conditions import (
        SafeConditionEvaluator,
    )
    from deos.modules.orchestration.application.services import (
        OrchestrationService,
    )
    from deos.modules.orchestration.application.template import (
        StringTemplateRenderer,
    )

    orchestration_bus = container.bus()
    orchestration_publisher = MessagingOrchestrationEventPublisher(
        orchestration_bus
    )

    class _OrchestrationFactory:
        def __init__(self) -> None:
            self._agent_runtime_factory = getattr(
                app.state, "agent_runtime_factory", None
            )
            self._tool_factory = getattr(app.state, "tool_factory", None)
            self._skill_factory = getattr(app.state, "skill_factory", None)
            self._publisher = orchestration_publisher
            self._policy_guard = policy_guard

        def for_session(self):  # type: ignore[no-untyped-def]
            sf = container.session_factory().maker()
            # Sub-agent / tool / skill dispatch adapters open their
            # OWN DB sessions per call so the orchestration service's
            # session is not coupled to the dispatched request's
            # lifecycle.  We hand them a fresh session maker.
            adapter_session_maker = container.session_factory().maker
            sub_agent = SubAgentAdapter(
                agent_runtime_factory=self._agent_runtime_factory,
                session_maker=adapter_session_maker,
            )
            tool_dispatch = ToolDispatchAdapter(
                tool_factory=self._tool_factory,
                session_maker=adapter_session_maker,
            )
            skill_dispatch = SkillDispatchAdapter(
                skill_factory=self._skill_factory,
                session_maker=adapter_session_maker,
            )
            return OrchestrationService.from_parts(
                plan_repository=SqlPlanRepository(sf),
                run_repository=SqlWorkflowRunRepository(sf),
                step_run_repository=SqlStepRunRepository(sf),
                sub_agent=sub_agent,
                tool_dispatch=tool_dispatch,
                skill_dispatch=skill_dispatch,
                template_renderer=StringTemplateRenderer(),
                condition_evaluator=SafeConditionEvaluator(),
                publisher=self._publisher,
                policy_guard=self._policy_guard,
                max_total_steps=(
                    container.settings.orchestration_max_total_steps
                ),
                default_step_timeout_seconds=(
                    container.settings.orchestration_default_step_timeout_seconds
                ),
            )

    app.state.orchestration_service_factory = _OrchestrationFactory()

    # ── P8 evaluation (independent module) ──────────────────────────────
    from deos.modules.evaluation.adapter.events import (
        MessagingEvaluationEventPublisher,
    )
    from deos.modules.evaluation.adapter.persistence.repositories import (
        SqlEvalDatasetRepository,
        SqlEvalRunRepository,
    )
    from deos.modules.evaluation.application.runner import EvalRunner
    from deos.modules.evaluation.application.services import (
        EvaluationService,
    )
    from deos.modules.evaluation.fixtures.golden_dataset import (
        BUILTIN_GOLDEN_DATASET_DESCRIPTION,
        BUILTIN_GOLDEN_DATASET_NAME,
        builtin_golden_cases,
    )

    evaluation_bus = container.bus()
    evaluation_publisher = MessagingEvaluationEventPublisher(evaluation_bus)

    class _EvaluationFactory:
        def __init__(self) -> None:
            self._publisher = evaluation_publisher
            self._policy_guard = policy_guard

        def for_session(self) -> EvaluationService:
            sf = container.session_factory().maker()
            ds_repo = SqlEvalDatasetRepository(sf)
            run_repo = SqlEvalRunRepository(sf)
            sub_agent_factory = getattr(app.state, "agent_runtime_factory", None)
            sub_agent = _sub_agent_for_evaluation(sub_agent_factory)
            runner = EvalRunner(
                run_repo=run_repo,
                dataset_repo=ds_repo,
                sub_agent=sub_agent,
                publisher=self._publisher,
                scoring_threshold=(
                    container.settings.agent_factory_eval_score_min
                ),
                concurrency=container.settings.evaluation_runner_concurrency,
                case_timeout_seconds=(
                    container.settings.evaluation_case_default_timeout_seconds
                ),
            )
            return EvaluationService.from_parts(
                dataset_repository=ds_repo,
                run_repository=run_repo,
                runner=runner,
                publisher=self._publisher,
                policy_guard=self._policy_guard,
            )

    def _sub_agent_for_evaluation(ar_factory):  # type: ignore[no-untyped-def]
        """Return the SubAgentPort used to drive evaluation cases.

        In production this would build a RuntimeSubAgentPort that opens
        a short-lived agent_runtime session per case.  For P8-5 we ship
        the stub — heuristic scoring will fail most cases until the
        full runtime adapter lands in P8-6; the gate wiring itself
        (pass / fail / no_eval) is what P8-5 validates.
        """
        from deos.modules.evaluation.adapter.sub_agent_stub import (
            StubSubAgentPort,
        )

        _ = ar_factory  # reserved for P8-6
        return StubSubAgentPort()

    app.state.evaluation_service_factory = _EvaluationFactory()

    # Seed the 50-case golden dataset for every existing tenant on
    # first boot.  Idempotent — re-running is a no-op when the dataset
    # already exists.
    _seed_builtin_eval_datasets(app, container)

    # ── P8 agent_factory (depends on evaluation; this is the P8-6 closed
    # loop — agent_factory reads the latest passed eval run via
    # EvaluationServiceAdapter).
    from deos.modules.agent_factory.adapter.events import (
        MessagingAgentFactoryEventPublisher,
    )
    from deos.modules.agent_factory.adapter.persistence.repositories import (
        SqlAgentTemplateRepository,
        SqlAgentVersionRepository,
        SqlReleaseRepository,
    )
    from deos.modules.agent_factory.application.services import (
        AgentFactoryService,
    )

    agent_factory_bus = container.bus()
    agent_factory_publisher = MessagingAgentFactoryEventPublisher(agent_factory_bus)

    class _AgentFactoryFactory:
        def __init__(self) -> None:
            self._publisher = agent_factory_publisher
            self._policy_guard = policy_guard

        def for_session(self) -> AgentFactoryService:
            sf = container.session_factory().maker()
            evaluation_query = _build_evaluation_query(sf)
            return AgentFactoryService.from_parts(
                template_repository=SqlAgentTemplateRepository(sf),
                version_repository=SqlAgentVersionRepository(sf),
                release_repository=SqlReleaseRepository(sf),
                evaluation_query=evaluation_query,
                publisher=self._publisher,
                policy_guard=self._policy_guard,
                eval_score_min=(
                    container.settings.agent_factory_eval_score_min
                ),
            )

    def _build_evaluation_query(sf):  # type: ignore[no-untyped-def]
        from deos.modules.evaluation.adapter.agent_factory_adapter import (
            EvaluationServiceAdapter,
        )
        from deos.modules.evaluation.adapter.persistence.repositories import (
            SqlEvalRunRepository,
        )

        return EvaluationServiceAdapter(
            run_repository=SqlEvalRunRepository(sf),
            score_threshold=container.settings.agent_factory_eval_score_min,
        )

    app.state.agent_factory_service_factory = _AgentFactoryFactory()

    # ── bus (must be available before subscribers install) ──────────────
    bus = container.bus()
    await bus.start()
    app.state.bus = bus

    # ── P5 audit subscriber (governance events → audit_log) ─────────────
    from deos.modules.governance.adapter.subscribers import audit_subscriber

    audit_recorder = container.audit_recorder()
    evaluator = container.policy_evaluator()
    await audit_subscriber.install(
        bus,
        audit_recorder,
        cache_invalidator=evaluator.invalidate,
    )

    # ── P7 channel → agent_runtime dispatch subscriber ──────────────────
    # Conditional install: only when both the channel module is wired
    # and the agent_runtime factory is available. Older dev shells
    # (legacy / model_service absent) skip this and inbound webhooks
    # simply don't trigger agent replies.
    ar_factory = getattr(app.state, "agent_runtime_factory", None)
    channel_service_obj = getattr(app.state, "channel_service", None)
    if channel_service_obj is not None and ar_factory is not None:
        from deos.modules.channel.adapter.dispatch.dispatch_subscriber import (
            ChannelDispatchSubscriber,
        )

        dispatch = ChannelDispatchSubscriber(
            channel_repository=channel_service_obj.channel_repo,
            agent_runtime_factory=ar_factory,
            outbound_registry_getter=lambda: getattr(
                app.state, "channel_outbound_registry", {}
            )
            or {},
            clock=container.clock(),
            open_session=container.session_factory().maker,
        )
        await dispatch.install(bus)
        app.state.channel_dispatch_subscriber = dispatch
        _log.info("channel dispatch subscriber active")
    else:
        _log.info(
            "channel dispatch subscriber skipped (channel_service=%s, ar_factory=%s)",
            channel_service_obj is not None,
            ar_factory is not None,
        )

    # ── seed default resources ───────────────────────────────────────────
    await ensure_default_resources(container)

    # ── redis client (for /readyz) ───────────────────────────────────────
    try:
        app.state.redis = container.redis_client()
    except Exception:  # noqa: BLE001
        _log.warning("redis client not attached; /readyz will report redis=skipped")

    try:
        yield
    finally:
        await bus.stop()
        sandbox = getattr(app.state, "sandbox", None)
        if sandbox is not None:
            await sandbox.shutdown()


async def _seed_builtin_eval_datasets(
    app: FastAPI, container: Container
) -> None:
    """Seed the 50-case golden dataset for every existing tenant.

    Idempotent: skips tenants that already have a ``golden-default``
    dataset.  Called once at lifespan start so the dataset is ready
    by the time HTTP requests land.
    """
    from uuid import uuid4

    from eos_schema.ids import TenantId, UserId, WorkspaceId
    from sqlalchemy import select

    from deos.modules.evaluation.adapter.persistence.mappers import (
        case_to_orm,
        dataset_to_orm,
    )
    from deos.modules.evaluation.adapter.persistence.models import (
        EvalCaseORM,
        EvalDatasetORM,
    )
    from deos.modules.evaluation.domain.entities import EvalCase, EvalDataset
    from deos.modules.evaluation.domain.value_objects import (
        EvalDatasetKind,
    )
    from deos.modules.evaluation.fixtures.golden_dataset import (
        BUILTIN_GOLDEN_DATASET_DESCRIPTION,
        BUILTIN_GOLDEN_DATASET_NAME,
        builtin_golden_cases,
    )

    factory = getattr(app.state, "evaluation_service_factory", None)
    if factory is None:
        _log.warning("evaluation_service_factory not wired; skipping seed")
        return

    cases = builtin_golden_cases()
    sf = container.session_factory().maker()

    # Discover existing tenants + workspaces.
    from eos_persistence.base import TenantScopedMixin

    stmt = (
        select(EvalDatasetORM.tenant_id, EvalDatasetORM.workspace_id)
        .where(EvalDatasetORM.name == BUILTIN_GOLDEN_DATASET_NAME)
        .distinct()
    )
    seeded_pairs: set[tuple[object, object]] = set(
        (r[0], r[1]) for r in (await sf.execute(stmt)).all()
    )

    tenant_stmt = select(TenantScopedMixin.tenant_id).limit(500)
    try:
        tenant_rows = (await sf.execute(tenant_stmt)).all()
    except Exception:  # noqa: BLE001
        tenant_rows = []

    seeded = 0
    for row in tenant_rows:
        tenant_id_val = row[0]
        # workspace_id is tenant-wide for the seed (use a per-tenant
        # synthetic zero workspace — datasets don't need a real workspace
        # to be queryable).
        from uuid import UUID as _UUID

        workspace_id_val = _UUID(int=0)
        key = (tenant_id_val, workspace_id_val)
        if key in seeded_pairs:
            continue
        now = datetime.now(UTC)
        ds = EvalDataset.create(
            tenant_id=TenantId(_UUID(str(tenant_id_val))),
            workspace_id=WorkspaceId(workspace_id_val),
            name=BUILTIN_GOLDEN_DATASET_NAME,
            description=BUILTIN_GOLDEN_DATASET_DESCRIPTION,
            kind=EvalDatasetKind.BUILTIN,
            case_count=len(cases),
            created_by=UserId(uuid4()),
            now=now,
        )
        sf.add(dataset_to_orm(ds))
        await sf.flush()
        for c in cases:
            case = EvalCase.create(
                tenant_id=ds.tenant_id,
                workspace_id=ds.workspace_id,
                dataset_id=ds.id,
                ordinal=c.ordinal,
                input=c.input,
                expected_keywords=c.expected_keywords,
                min_keywords_hit_ratio=c.min_keywords_hit_ratio,
                max_latency_ms=c.max_latency_ms,
                now=now,
            )
            sf.add(case_to_orm(case))
        await sf.flush()
        seeded += 1

    await sf.commit()
    if seeded:
        _log.info("seeded golden-default eval dataset for %d tenants", seeded)


async def ensure_default_resources(container: Container) -> None:
    """Seed a demo tenant + workspace + admin user when the DB is empty.

    Runs only in dev/test (skipped in production / ci unless explicitly
    enabled via ``EOS_DEV_SEED_DEFAULT_RESOURCES=1``). Idempotent: a no-op
    once any tenant row exists.

    Also seeds built-in custom tools (echo/reverse/clock) for the demo
    tenant whenever the tools table is empty, so the smoke flow
    GET /v1/tools → POST .../invoke works without manual registration.
    """
    import os

    from deos.modules.identity.adapter.persistence.models import TenantORM
    from deos.modules.identity.adapter.persistence.repositories import (
        SqlTenantRepository,
        SqlUserRepository,
        SqlWorkspaceRepository,
    )
    from deos.modules.identity.domain import Tenant, User, Workspace
    from sqlalchemy import func, select

    settings = container.settings
    if (
        settings.env not in {"development", "test"}
        and os.environ.get("EOS_DEV_SEED_DEFAULT_RESOURCES", "1") != "1"
    ):
        return

    sf = container.session_factory()
    try:
        async with sf.session() as session:
            # Bail early if anything already exists.
            existing = (
                await session.execute(select(func.count()).select_from(TenantORM))
            ).scalar_one()
            if existing and existing > 0:
                # Tenant already exists — skip the identity seed but still
                # try to seed built-in tools below.
                tenant_id = UUID(settings.demo_tenant_id)
            else:
                tenant_id = UUID(settings.demo_tenant_id)
                tenant = Tenant.create(
                    id=tenant_id,
                    slug="demo",
                    display_name="Demo Tenant",
                    metadata={"seeded": True},
                )
                ws = Workspace.create(
                    id=__import__("uuid").uuid4(),
                    tenant_id=tenant_id,
                    slug="default",
                    display_name="Default Workspace",
                )
                admin_email = settings.dev_admin_email
                admin_password = settings.dev_admin_password
                admin = User.create(
                    id=__import__("uuid").uuid4(),
                    tenant_id=tenant_id,
                    email=admin_email,
                    display_name="Demo Admin",
                    hashed_password=container.hasher().hash(admin_password),
                )

                SqlTenantRepository(session).add(tenant)
                SqlWorkspaceRepository(session).add(ws)
                SqlUserRepository(session).add(admin)
                await session.commit()
                _log.info(
                    "seeded default resources",
                    extra={
                        "tenant_id": str(tenant_id),
                        "workspace_id": str(ws.id),
                        "admin_id": str(admin.id),
                        "admin_email": admin_email,
                    },
                )

            # Seed built-in custom tools (echo / reverse / clock) for the
            # demo tenant whenever the tools table is empty, so the smoke
            # flow GET /v1/tools → POST .../invoke works without manual
            # registration. Idempotent: skips rows that already exist.
            from deos.modules.tool.adapter.persistence.models import ToolORM

            tool_count = (
                await session.execute(select(func.count()).select_from(ToolORM))
            ).scalar_one()
            if tool_count == 0:
                # Find ANY existing workspace (whichever tenant it belongs
                # to) — built-in tools will be tied to that tenant for
                # smoke purposes. Production seed is per-tenant and is
                # out of scope for this fixture.
                from deos.modules.identity.adapter.persistence.models import (
                    WorkspaceORM,
                )

                ws_row = (
                    await session.execute(select(WorkspaceORM).limit(1))
                ).scalar_one_or_none()
                seed_tenant_id = ws_row.tenant_id if ws_row is not None else tenant_id
                if ws_row is not None:
                    from uuid import uuid4

                    from deos.modules.tool.adapter.persistence.models import ToolORM

                    for name in ("echo", "reverse", "clock"):
                        session.add(
                            ToolORM(
                                id=uuid4(),
                                tenant_id=seed_tenant_id,
                                workspace_id=ws_row.id,
                                name=name,
                                description=f"built-in {name}",
                                protocol="custom",
                                spec={},
                                spec_operations=[],
                                auth_config=None,
                                rate_limit_per_minute=None,
                                enabled=True,
                                version=1,
                            )
                        )
                    await session.commit()
                    _log.info("seeded built-in tools tenant_id=%s", seed_tenant_id)
    except Exception:  # noqa: BLE001
        _log.exception("ensure_default_resources failed; continuing boot")
