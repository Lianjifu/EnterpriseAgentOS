"""Integration tests for orchestration SQL adapters (P7-6).

Run with: ``uv run pytest modules/orchestration/tests/integration/ -m integration``.

Requires ``EOS_DATABASE_URL`` (default
``postgresql+asyncpg://postgres:postgres@localhost:5499/eos_dev``) and
the `0010_orchestration` migration applied (``make db-upgrade``).

Coverage:
- 0010 migration creates plans / workflow_runs / workflow_step_runs
- PlanRepository round-trip + name conflict (unique constraint)
- WorkflowRunRepository round-trip + idempotency_key partial UQ
- WorkflowRunRepository.idempotency partial UQ only fires when key set
- StepRunRepository round-trip
- Cross-tenant isolation
"""

from __future__ import annotations

import os
from uuid import UUID, uuid4

import pytest
from eos_schema.ids import (
    PlanId,
    StepRunId,
    TenantId,
    UserId,
    WorkflowRunId,
    WorkspaceId,
)
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    create_async_engine,
)

from deos.modules.orchestration.adapter.persistence.repositories import (
    SqlPlanRepository,
    SqlStepRunRepository,
    SqlWorkflowRunRepository,
)
from deos.modules.orchestration.domain.entities import (
    Plan,
    StepRun,
    WorkflowRun,
)
from deos.modules.orchestration.domain.errors import (
    IdempotencyKeyConflict,
    PlanNameConflict,
)
from deos.modules.orchestration.domain.value_objects import (
    StepKind,
    StepRunStatus,
    WorkflowRunStatus,
)

pytestmark = pytest.mark.integration


DEFAULT_URL = "postgresql+asyncpg://postgres:postgres@localhost:5499/eos_dev"


def _url() -> str:
    return os.environ.get("EOS_DATABASE_URL", DEFAULT_URL)


def _ids():
    return (
        TenantId(uuid4()),
        WorkspaceId(uuid4()),
        UserId(uuid4()),
    )


def _agent_entry() -> dict:
    return {
        "kind": "agent",
        "step_id": "a1",
        "agent_id": str(uuid4()),
        "agent_version": "1.0.0",
        "user_input_template": "hi",
    }


@pytest.fixture
async def engine() -> AsyncEngine:
    eng = create_async_engine(_url())
    yield eng
    await eng.dispose()


@pytest.fixture
async def repos(engine: AsyncEngine):
    async with engine.connect() as conn:
        trans = await conn.begin()
        try:
            session = AsyncSession(bind=conn)
            yield (
                SqlPlanRepository(session),
                SqlWorkflowRunRepository(session),
                SqlStepRunRepository(session),
                session,
            )
        finally:
            await trans.rollback()


async def test_migration_created_three_tables(engine: AsyncEngine) -> None:
    async with engine.connect() as conn:
        rows = (
            (
                await conn.execute(
                    text(
                        "SELECT tablename FROM pg_tables "
                        "WHERE schemaname='public' "
                        "AND tablename IN ('orch_plans','workflow_runs','workflow_step_runs')"
                    )
                )
            )
            .scalars()
            .all()
        )
    assert set(rows) == {"orch_plans", "workflow_runs", "workflow_step_runs"}


async def test_plan_repo_round_trip(repos) -> None:
    plan_repo, _, _, _ = repos
    tid, wid, uid = _ids()
    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name=f"p-{uuid4()}",
        description="d",
        entry_dsl={"name": "p", "entry": _agent_entry()},
        max_total_steps=10,
        metadata={"env": "prod"},
        created_by=uid,
    )
    saved = await plan_repo.add(plan)
    assert saved.id == plan.id
    got = await plan_repo.get(tenant_id=tid, plan_id=plan.id)
    assert got is not None
    assert got.name == plan.name
    assert got.metadata == {"env": "prod"}


async def test_plan_repo_name_conflict_via_unique(repos) -> None:
    plan_repo, _, _, _ = repos
    tid, wid, uid = _ids()
    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name=f"dup-{uuid4()}",
        description="",
        entry_dsl={"name": "p", "entry": _agent_entry()},
        max_total_steps=10,
        created_by=uid,
    )
    await plan_repo.add(plan)
    dup = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name=plan.name,
        description="",
        entry_dsl={"name": "p", "entry": _agent_entry()},
        max_total_steps=10,
        created_by=uid,
    )
    with pytest.raises(PlanNameConflict):
        await plan_repo.add(dup)


async def test_plan_repo_cross_tenant_isolation(repos) -> None:
    plan_repo, _, _, _ = repos
    tid_a, wid_a, uid_a = _ids()
    tid_b, _, _ = _ids()
    plan = Plan.create(
        tenant_id=tid_a,
        workspace_id=wid_a,
        name=f"x-{uuid4()}",
        description="",
        entry_dsl={"name": "p", "entry": _agent_entry()},
        max_total_steps=10,
        created_by=uid_a,
    )
    await plan_repo.add(plan)
    cross = await plan_repo.get(tenant_id=tid_b, plan_id=plan.id)
    assert cross is None


async def test_workflow_run_repo_round_trip(repos) -> None:
    plan_repo, run_repo, _, _ = repos
    tid, wid, uid = _ids()
    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name=f"p-{uuid4()}",
        description="",
        entry_dsl={"name": "p", "entry": _agent_entry()},
        max_total_steps=10,
        created_by=uid,
    )
    saved_plan = await plan_repo.add(plan)
    run = WorkflowRun.create(
        tenant_id=tid,
        workspace_id=wid,
        plan_id=PlanId(saved_plan.id),
        plan_dsl_snapshot={"entry": _agent_entry()},
        variables={"a": 1},
    )
    saved = await run_repo.add(run)
    got = await run_repo.get(tenant_id=tid, run_id=saved.id)
    assert got is not None
    assert got.variables == {"a": 1}

    updated = got.with_status(
        WorkflowRunStatus.SUCCEEDED,
        final_output={"answer": 42},
    )
    after = await run_repo.update(updated)
    assert after.status == WorkflowRunStatus.SUCCEEDED
    assert after.final_output == {"answer": 42}


async def test_workflow_run_idempotency_partial_uq(repos) -> None:
    plan_repo, run_repo, _, _ = repos
    tid, wid, uid = _ids()
    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name=f"p-{uuid4()}",
        description="",
        entry_dsl={"name": "p", "entry": _agent_entry()},
        max_total_steps=10,
        created_by=uid,
    )
    saved_plan = await plan_repo.add(plan)
    run_a = WorkflowRun.create(
        tenant_id=tid,
        workspace_id=wid,
        plan_id=PlanId(saved_plan.id),
        plan_dsl_snapshot={"entry": _agent_entry()},
        idempotency_key=f"k-{uuid4()}",
    )
    await run_repo.add(run_a)
    run_b = WorkflowRun.create(
        tenant_id=tid,
        workspace_id=wid,
        plan_id=PlanId(saved_plan.id),
        plan_dsl_snapshot={"entry": _agent_entry()},
        idempotency_key=run_a.idempotency_key,
    )
    with pytest.raises(IdempotencyKeyConflict):
        await run_repo.add(run_b)


async def test_workflow_run_anonymous_no_idempotency_conflict(repos) -> None:
    """Without idempotency_key, two runs can coexist even when other
    fields (plan_id) match — the partial UQ excludes NULL keys."""
    plan_repo, run_repo, _, _ = repos
    tid, wid, uid = _ids()
    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name=f"p-{uuid4()}",
        description="",
        entry_dsl={"name": "p", "entry": _agent_entry()},
        max_total_steps=10,
        created_by=uid,
    )
    saved_plan = await plan_repo.add(plan)
    plan_id = PlanId(saved_plan.id)
    run_a = WorkflowRun.create(
        tenant_id=tid,
        workspace_id=wid,
        plan_id=plan_id,
        plan_dsl_snapshot={"entry": _agent_entry()},
    )
    await run_repo.add(run_a)
    run_b = WorkflowRun.create(
        tenant_id=tid,
        workspace_id=wid,
        plan_id=plan_id,
        plan_dsl_snapshot={"entry": _agent_entry()},
    )
    await run_repo.add(run_b)
    assert run_a.id != run_b.id


async def test_workflow_run_repo_lookup_by_idempotency(repos) -> None:
    plan_repo, run_repo, _, _ = repos
    tid, wid, uid = _ids()
    plan = Plan.create(
        tenant_id=tid,
        workspace_id=wid,
        name=f"p-{uuid4()}",
        description="",
        entry_dsl={"name": "p", "entry": _agent_entry()},
        max_total_steps=10,
        created_by=uid,
    )
    saved_plan = await plan_repo.add(plan)
    run = WorkflowRun.create(
        tenant_id=tid,
        workspace_id=wid,
        plan_id=PlanId(saved_plan.id),
        plan_dsl_snapshot={"entry": _agent_entry()},
        idempotency_key=f"key-{uuid4()}",
    )
    await run_repo.add(run)
    found = await run_repo.get_by_idempotency_key(
        tenant_id=tid,
        idempotency_key=run.idempotency_key,  # type: ignore[arg-type]
    )
    assert found is not None
    assert found.id == run.id


async def test_step_run_repo_round_trip(repos) -> None:
    _, _, step_repo, session = repos
    tid = TenantId(uuid4())
    wid = WorkspaceId(uuid4())
    plan_id = uuid4()
    run_id = WorkflowRunId(uuid4())
    # Insert stub orch_plans + workflow_runs rows so the FKs on
    # workflow_runs.plan_id → orch_plans.id and
    # workflow_step_runs.run_id → workflow_runs.id are satisfied —
    # this test exercises step_repo, not plan/run repos.
    await session.execute(
        text(
            "INSERT INTO orch_plans (id, tenant_id, workspace_id, name, "
            "description, entry_dsl, max_total_steps, metadata) "
            "VALUES (:id, :tid, :wid, 'stub', '', '{}'::jsonb, 64, '{}'::jsonb)"
        ),
        {"id": plan_id, "tid": tid, "wid": wid},
    )
    await session.execute(
        text(
            "INSERT INTO workflow_runs (id, tenant_id, workspace_id, plan_id, "
            "plan_dsl_snapshot, status, variables, input) "
            "VALUES (:id, :tid, :wid, :pid, :snap, 'pending', '{}'::jsonb, '{}'::jsonb)"
        ),
        {"id": run_id, "tid": tid, "wid": wid, "pid": plan_id, "snap": "{}"},
    )
    step = StepRun.start(
        tenant_id=tid,
        run_id=run_id,
        step_id="s",
        kind=StepKind.AGENT,
        depth=0,
    )
    await step_repo.add(step)
    done = step.with_status(StepRunStatus.SUCCEEDED, output={"x": 1})
    await step_repo.update(done)
    rows = await step_repo.list_for_run(tenant_id=tid, run_id=run_id)
    assert len(rows) == 1
    assert rows[0].status == StepRunStatus.SUCCEEDED


async def test_step_run_repo_cross_tenant_isolation(repos) -> None:
    _, _, step_repo, session = repos
    tid_a = TenantId(uuid4())
    tid_b = TenantId(uuid4())
    wid_a = WorkspaceId(uuid4())
    plan_id = uuid4()
    run_id = WorkflowRunId(uuid4())
    await session.execute(
        text(
            "INSERT INTO orch_plans (id, tenant_id, workspace_id, name, "
            "description, entry_dsl, max_total_steps, metadata) "
            "VALUES (:id, :tid, :wid, 'stub', '', '{}'::jsonb, 64, '{}'::jsonb)"
        ),
        {"id": plan_id, "tid": tid_a, "wid": wid_a},
    )
    await session.execute(
        text(
            "INSERT INTO workflow_runs (id, tenant_id, workspace_id, plan_id, "
            "plan_dsl_snapshot, status, variables, input) "
            "VALUES (:id, :tid, :wid, :pid, :snap, 'pending', '{}'::jsonb, '{}'::jsonb)"
        ),
        {"id": run_id, "tid": tid_a, "wid": wid_a, "pid": plan_id, "snap": "{}"},
    )
    step = StepRun.start(
        tenant_id=tid_a,
        run_id=run_id,
        step_id="s",
        kind=StepKind.AGENT,
    )
    await step_repo.add(step)
    cross = await step_repo.list_for_run(tenant_id=tid_b, run_id=run_id)
    assert cross == []


async def test_plan_repo_list_pagination(repos) -> None:
    plan_repo, _, _, _ = repos
    tid, wid, uid = _ids()
    for _ in range(3):
        plan = Plan.create(
            tenant_id=tid,
            workspace_id=wid,
            name=f"p-{uuid4()}",
            description="",
            entry_dsl={"name": "p", "entry": _agent_entry()},
            max_total_steps=10,
            created_by=uid,
        )
        await plan_repo.add(plan)
    rows = await plan_repo.list(tenant_id=tid, workspace_id=wid, limit=2, offset=0)
    assert len(rows) == 2
    rows2 = await plan_repo.list(tenant_id=tid, workspace_id=wid, limit=10, offset=2)
    assert len(rows2) >= 1


__all__: list[str] = []
# silence unused-import for ids used only in type signatures
_ = (StepRunId, UUID)
