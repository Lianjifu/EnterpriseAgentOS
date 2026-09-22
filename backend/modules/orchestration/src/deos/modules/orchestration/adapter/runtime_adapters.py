"""Inline thin adapters for orchestration dispatch ports.

These wrap the per-request factories the composition root already
provides (agent_runtime factory, tool factory, skill factory) and adapt
them to the :class:`SubAgentPort` / :class:`ToolDispatchPort` /
:class:`SkillDispatchPort` shape the orchestration executor needs.

The ``SubAgentAdapter`` is intentionally a stub for P7-6; P7-7 replaces
its ``run_turn_to_completion`` with a real drain that consumes the
``RunTurnUseCase`` stream to a final :class:`SubAgentResult`.
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from eos_schema.ids import TenantId, UserId, WorkspaceId

from deos.modules.orchestration.application.ports import (
    SkillDispatchPort,
    SubAgentPort,
    SubAgentResult,
    ToolDispatchPort,
)

logger = logging.getLogger(__name__)


class SubAgentAdapter(SubAgentPort):
    """P7-6 placeholder adapter for :class:`SubAgentPort`.

    P7-7 replaces the body of :meth:`run_turn_to_completion` with a real
    drain of :class:`RunTurnUseCase`.  For now the adapter raises so a
    misconfigured composition does not silently return junk.
    """

    def __init__(self, agent_runtime_factory) -> None:  # type: ignore[no-untyped-def]
        self._factory = agent_runtime_factory

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
        raise NotImplementedError(
            "SubAgentAdapter.run_turn_to_completion is implemented in P7-7"
        )


class ToolDispatchAdapter(ToolDispatchPort):
    """Delegates to :class:`ToolService.invoke_tool` via the tool factory."""

    def __init__(self, tool_factory) -> None:  # type: ignore[no-untyped-def]
        self._factory = tool_factory

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
        raise NotImplementedError(
            "ToolDispatchAdapter.invoke_tool ships in P7-7"
        )


class SkillDispatchAdapter(SkillDispatchPort):
    """Delegates to :class:`SkillService.invoke_skill` via the skill factory."""

    def __init__(self, skill_factory) -> None:  # type: ignore[no-untyped-def]
        self._factory = skill_factory

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
        raise NotImplementedError(
            "SkillDispatchAdapter.invoke_skill ships in P7-7"
        )


__all__ = [
    "SkillDispatchAdapter",
    "SubAgentAdapter",
    "ToolDispatchAdapter",
]