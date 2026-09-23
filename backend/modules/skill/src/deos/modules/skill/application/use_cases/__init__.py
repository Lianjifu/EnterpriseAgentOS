"""Use cases for the skill module.

Each use case is a thin dataclass with an `execute(...)` method. They
take the UnitOfWork + outbound ports in the constructor and call them.
No HTTP types, no ORM types.
"""

from deos.modules.skill.application.use_cases.cancel_invocation import (
    CancelInvocationUseCase,
)
from deos.modules.skill.application.use_cases.disable_skill import DisableSkillUseCase
from deos.modules.skill.application.use_cases.get_active_install import (
    GetActiveInstallUseCase,
)
from deos.modules.skill.application.use_cases.get_invocation import GetInvocationUseCase
from deos.modules.skill.application.use_cases.get_skill import GetSkillUseCase
from deos.modules.skill.application.use_cases.install_skill import InstallSkillUseCase
from deos.modules.skill.application.use_cases.invoke_skill import InvokeSkillUseCase
from deos.modules.skill.application.use_cases.list_invocations import (
    ListInvocationsUseCase,
)
from deos.modules.skill.application.use_cases.list_skills import ListSkillsUseCase
from deos.modules.skill.application.use_cases.register_skill import RegisterSkillUseCase
from deos.modules.skill.application.use_cases.update_skill import UpdateSkillUseCase

__all__ = [
    "CancelInvocationUseCase",
    "DisableSkillUseCase",
    "GetActiveInstallUseCase",
    "GetInvocationUseCase",
    "GetSkillUseCase",
    "InstallSkillUseCase",
    "InvokeSkillUseCase",
    "ListInvocationsUseCase",
    "ListSkillsUseCase",
    "RegisterSkillUseCase",
    "UpdateSkillUseCase",
]
