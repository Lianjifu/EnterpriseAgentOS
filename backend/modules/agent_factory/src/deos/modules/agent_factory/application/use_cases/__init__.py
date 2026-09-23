"""Use cases for the agent_factory module."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from eos_schema.ids import (
    AgentTemplateId,
    AgentVersionId,
    EvalRunId,
    ReleaseId,
    TenantId,
    UserId,
    WorkspaceId,
)

from deos.modules.agent_factory.domain.entities import (
    AgentTemplate,
    AgentVersion,
    Release,
)

__all__ = [
    "CreateAgentTemplateUseCase",
    "GetAgentTemplateUseCase",
    "ListAgentTemplatesUseCase",
    "UpdateAgentTemplateUseCase",
    "CreateAgentVersionUseCase",
    "GetAgentVersionUseCase",
    "ListAgentVersionsUseCase",
    "UpdateAgentVersionNotesUseCase",
    "PublishAgentVersionUseCase",
    "ReleaseAgentVersionUseCase",
    "GetReleaseUseCase",
    "ListReleasesUseCase",
    "RetireAgentVersionUseCase",
]