"""SkillDispatchAdapter — catalog lookup + call counter.

Skill execution no longer queues a sandbox invocation. Orchestration
steps that name a skill bump usage on the published catalog row and
return a structured acknowledgement.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from typing import Any
from uuid import UUID

from deos.modules.tool.domain.entities import ToolCall
from eos_kernel.errors import AppError
from eos_schema.ids import TenantId, UserId, WorkspaceId

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
    """Delegates to agent_runtime's inner sub-agent adapter."""

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
    """Delegates to :class:`ToolService.invoke_tool` via the tool factory."""

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
    """Resolves a published catalog skill by name and records a call."""

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
        _ = (tenant_id, actor_id, skill_version, timeout_seconds)
        factory, maker = _ensure_maker(
            self._factory, self._maker, label="SkillDispatchAdapter"
        )
        session = maker()
        try:
            service = factory(session)
            result = await service.bump_and_describe(
                workspace_id=workspace_id, name=skill_name
            )
            if hasattr(session, "commit"):
                await session.commit()
            return {**result, "arguments": arguments}
        finally:
            await session.close()


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
