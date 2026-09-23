"""Use cases for the agent_factory module."""

from deos.modules.agent_factory.application.use_cases.create_template import (
    CreateAgentTemplateUseCase,
)
from deos.modules.agent_factory.application.use_cases.create_version import (
    CreateAgentVersionUseCase,
)
from deos.modules.agent_factory.application.use_cases.get_release import (
    GetReleaseUseCase,
    ListReleasesUseCase,
)
from deos.modules.agent_factory.application.use_cases.get_template import (
    GetAgentTemplateUseCase,
)
from deos.modules.agent_factory.application.use_cases.get_version import (
    GetAgentVersionUseCase,
)
from deos.modules.agent_factory.application.use_cases.list_templates import (
    ListAgentTemplatesUseCase,
)
from deos.modules.agent_factory.application.use_cases.list_versions import (
    ListAgentVersionsUseCase,
)
from deos.modules.agent_factory.application.use_cases.publish_version import (
    PublishAgentVersionUseCase,
)
from deos.modules.agent_factory.application.use_cases.release_version import (
    ReleaseAgentVersionUseCase,
)
from deos.modules.agent_factory.application.use_cases.retire_version import (
    RetireAgentVersionUseCase,
)
from deos.modules.agent_factory.application.use_cases.update_template import (
    UpdateAgentTemplateUseCase,
)
from deos.modules.agent_factory.application.use_cases.update_version_notes import (
    UpdateAgentVersionNotesUseCase,
)

__all__ = [
    "CreateAgentTemplateUseCase",
    "CreateAgentVersionUseCase",
    "GetAgentTemplateUseCase",
    "GetAgentVersionUseCase",
    "GetReleaseUseCase",
    "ListAgentTemplatesUseCase",
    "ListAgentVersionsUseCase",
    "ListReleasesUseCase",
    "PublishAgentVersionUseCase",
    "ReleaseAgentVersionUseCase",
    "RetireAgentVersionUseCase",
    "UpdateAgentTemplateUseCase",
    "UpdateAgentVersionNotesUseCase",
]