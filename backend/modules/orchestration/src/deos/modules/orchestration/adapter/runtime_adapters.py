"""Real adapters implementing orchestration dispatch ports (P7-7).

These wrap the per-request factories the composition root already
provides (agent_runtime factory, tool factory, skill factory) and adapt
them to the :class:`SubAgentPort` / :class:`ToolDispatchPort` /
:class:`SkillDispatchPort` shape the orchestration executor needs.

- :class:`SubAgentAdapter` drains an ephemeral ``RunTurnCompletionUseCase``
  to a final :class:`SubAgentResult`.  The adapter opens its own DB
  session per call so the parent's session is not coupled.
- :class:`ToolDispatchAdapter` forwards to ``ToolService.invoke_tool``;
  the response is the :class:`ToolCall.result` dict.
- :class:`SkillDispatchAdapter` resolves the skill by name, queues a
  ``SkillInvocation`` via ``SkillService.invoke_skill``, and polls
  until the row reaches a terminal status — returning the final result
  dict.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from typing import Any
from uuid import UUID

from deos.modules.skill.domain.entities import (
    SkillInvocation,
    SkillInvocationStatus,
)
from deos.modules.skill.domain.errors import SkillNotFound
from deos.modules.tool.domain.entities import ToolCall
from eos_kernel.errors import AppError
from eos_schema.ids import (
    SkillId,
    TenantId,
    UserId,
    WorkspaceId,
)

from deos.modules.orchestration.application.ports import (
    SkillDispatchPort,
    SubAgentPort,
    SubAgentResult,
    ToolDispatchPort,
)

logger = logging.getLogger(__name__)


ToolServiceFactory = Callable[[Any], Any]
SkillServiceFactory = Callable[[Any], Any]
AgentRuntimeFactory = Callable[[Any], Any]
SessionMaker = Callable[[], Any]


# Polling parameters for SkillDispatchAdapter.
_SKILL_POLL_INTERVAL_SECONDS = 0.5


def _ensure_maker(
    factory: Callable[[Any], Any] | None,
    session_maker: SessionMaker | None,
    *,
    label: str,
) -> tuple[Callable[[Any], Any], SessionMaker]:
    """Defensive accessor that turns ``None`` into a clean 503."""
    if factory is None or session_maker is None:
        raise AppError(
            f"{label} is not wired (factory or session maker missing)",
            code=f"{label.upper()}_UNAVAILABLE",
            status=503,
        )
    return factory, session_maker


class SubAgentAdapter(SubAgentPort):
    """Real P7-7 drain adapter for :class:`SubAgentPort`.

    Holds references to the agent_runtime factory and a session maker;
    each call opens its own DB session so the parent request's session
    is not coupled to the sub-agent's lifecycle.
    """

    def __init__(
        self,
        *,
        agent_runtime_factory: AgentRuntimeFactory | None,
        session_maker: SessionMaker | None,
    ) -> None:
        self._factory = agent_runtime_factory
        self._maker = session_maker

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
        factory, maker = _ensure_maker(
            self._factory, self._maker, label="SubAgentAdapter"
        )

        async def _drive() -> SubAgentResult:
            # Import here to avoid a hard agent_runtime dependency at
            # module import time (which would break tool/skill-only
            # test environments).
            from deos.modules.agent_runtime.adapter.orchestration.subagent_adapter import (
                SubAgentAdapter as _AgentRuntimeSubAgentAdapter,
            )

            ar_session = maker()
            try:
                ar_service = factory(ar_session)
                inner = _AgentRuntimeSubAgentAdapter(
                    agent_runtime_factory=lambda _s: ar_service,
                    session_maker=lambda: ar_session,
                )
                return await inner.run_turn_to_completion(
                    tenant_id=tenant_id,
                    workspace_id=workspace_id,
                    owner_id=owner_id,
                    agent_id=agent_id,
                    agent_version=agent_version,
                    user_input=user_input,
                    model_override=model_override,
                    timeout_seconds=timeout_seconds,
                )
            finally:
                await ar_session.close()

        return await asyncio.wait_for(_drive(), timeout=timeout_seconds)


class ToolDispatchAdapter(ToolDispatchPort):
    """Delegates to :class:`ToolService.invoke_tool` via the tool factory.

    The factory is called with an open DB session; the call wraps
    ``asyncio.wait_for`` for the ``timeout_seconds`` budget.  Errors
    raised by the use case bubble up unchanged so the executor can
    classify them.
    """

    def __init__(
        self,
        *,
        tool_factory: ToolServiceFactory | None,
        session_maker: SessionMaker | None,
    ) -> None:
        self._factory = tool_factory
        self._maker = session_maker

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
        factory, maker = _ensure_maker(
            self._factory, self._maker, label="ToolDispatchAdapter"
        )

        async def _drive() -> dict[str, Any]:
            session = maker()
            try:
                service = factory(session)
                call: ToolCall = await service.invoke_tool().execute(
                    tenant_id=tenant_id,
                    workspace_id=workspace_id,
                    owner_id=actor_id,
                    tool_name=tool_name,
                    arguments=arguments,
                )
                if call.error_code:
                    raise AppError(
                        f"tool {tool_name!r} failed: {call.error_message}",
                        code=call.error_code or "TOOL_FAILED",
                        status=502,
                    )
                return call.result or {}
            finally:
                await session.close()

        return await asyncio.wait_for(_drive(), timeout=timeout_seconds)


class SkillDispatchAdapter(SkillDispatchPort):
    """Delegates to :class:`SkillService.invoke_skill` + poll.

    Skill execution is asynchronous (queue + sandbox run).  This
    adapter resolves the skill by name, issues the invocation,
    commits the row so the polled session can see it, then polls until
    the row reaches a terminal status (``SUCCEEDED`` / ``FAILED`` /
    ``CANCELED``) or the ``timeout_seconds`` budget elapses.
    """

    def __init__(
        self,
        *,
        skill_factory: SkillServiceFactory | None,
        session_maker: SessionMaker | None,
    ) -> None:
        self._factory = skill_factory
        self._maker = session_maker

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
        factory, maker = _ensure_maker(
            self._factory, self._maker, label="SkillDispatchAdapter"
        )

        # ── 1. resolve skill by name → SkillId ────────────────────────────
        resolve_session = maker()
        skill_id: SkillId | None = None
        try:
            service = factory(resolve_session)
            pkg = await service.skill_repository.get_by_name(
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                name=skill_name,
            )
            if pkg is None:
                raise SkillNotFound(
                    f"skill {skill_name!r} not found", code="SKILL_NOT_FOUND"
                )
            skill_id = pkg.id
        finally:
            await resolve_session.close()

        if skill_id is None:  # pragma: no cover - defensive
            raise AppError(
                f"skill {skill_name!r} not resolvable",
                code="SKILL_NOT_FOUND",
                status=404,
            )

        # ── 2. queue invocation + commit so the poller can see the row ────
        queue_session = maker()
        invocation: SkillInvocation | None = None
        try:
            service = factory(queue_session)
            invocation = await service.invoke_skill().execute(
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                invoked_by=actor_id,
                skill_id=skill_id,
                arguments=arguments,
            )
            await queue_session.commit()
        finally:
            await queue_session.close()

        if invocation is None:  # pragma: no cover - defensive
            raise AppError(
                "skill invocation did not produce a row",
                code="SKILL_DISPATCH_EMPTY",
                status=500,
            )

        # ── 3. poll until terminal ────────────────────────────────────────
        async def _poll() -> dict[str, Any]:
            deadline = asyncio.get_event_loop().time() + timeout_seconds
            inv_id = invocation.id  # type: ignore[union-attr]
            while True:
                if asyncio.get_event_loop().time() > deadline:
                    raise AppError(
                        f"skill {skill_name!r} invocation timed out",
                        code="SKILL_DISPATCH_TIMEOUT",
                        status=504,
                    )
                poll_session = maker()
                try:
                    poll_service = factory(poll_session)
                    inv: SkillInvocation = (
                        await poll_service.get_invocation().execute(
                            tenant_id=tenant_id,
                            workspace_id=workspace_id,
                            invocation_id=inv_id,
                        )
                    )
                finally:
                    await poll_session.close()
                if inv.status is SkillInvocationStatus.SUCCEEDED:
                    return inv.result or {}
                if inv.status in {
                    SkillInvocationStatus.FAILED,
                    SkillInvocationStatus.CANCELED,
                }:
                    raise AppError(
                        f"skill {skill_name!r} {inv.status.value}: "
                        f"{inv.error_message or inv.error_code or 'unknown'}",
                        code=inv.error_code or "SKILL_FAILED",
                        status=502,
                    )
                await asyncio.sleep(_SKILL_POLL_INTERVAL_SECONDS)

        return await _poll()


__all__ = [
    "AgentRuntimeFactory",
    "SessionMaker",
    "SkillDispatchAdapter",
    "SkillServiceFactory",
    "SubAgentAdapter",
    "ToolDispatchAdapter",
    "ToolServiceFactory",
]
_ = (UUID,)