"""Domain layer."""

from __future__ import annotations

from deos.modules.memory.domain.entities import EMBEDDING_DIM, MemoryEntry
from deos.modules.memory.domain.errors import (
    InvalidMemorySpec,
    MemoryAlreadyRevoked,
    MemoryError,
    MemoryExpired,
    MemoryNotFound,
)
from deos.modules.memory.domain.value_objects import MemoryQuery, MemoryScope

__all__ = [
    "EMBEDDING_DIM",
    "InvalidMemorySpec",
    "MemoryAlreadyRevoked",
    "MemoryEntry",
    "MemoryError",
    "MemoryExpired",
    "MemoryNotFound",
    "MemoryQuery",
    "MemoryScope",
]
