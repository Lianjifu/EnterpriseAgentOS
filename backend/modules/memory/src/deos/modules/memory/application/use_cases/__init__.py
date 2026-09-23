"""Memory module use cases.

Each use case is a thin dataclass holding its ports. The
:class:`MemoryService` in ``application.services`` binds them to the
outbound implementations and is what the HTTP adapter consumes.
"""

from deos.modules.memory.application.use_cases.get_memory import GetMemoryUseCase
from deos.modules.memory.application.use_cases.list_memories import ListMemoriesUseCase
from deos.modules.memory.application.use_cases.purge_expired import (
    PurgeExpiredMemoriesUseCase,
)
from deos.modules.memory.application.use_cases.recall_memory import RecallMemoryUseCase
from deos.modules.memory.application.use_cases.revoke_memory import RevokeMemoryUseCase
from deos.modules.memory.application.use_cases.write_memory import WriteMemoryUseCase

__all__ = [
    "GetMemoryUseCase",
    "ListMemoriesUseCase",
    "PurgeExpiredMemoriesUseCase",
    "RecallMemoryUseCase",
    "RevokeMemoryUseCase",
    "WriteMemoryUseCase",
]
