"""Memory scope + query value objects."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class MemoryScope(StrEnum):
    """Where a memory entry is readable from.

    Mirrors the existing ``eos_schema.dtos.memory.MemoryScope`` Literal;
    StrEnum is used at the domain level because equality and exhaustive
    switches are easier to write and to type-check.
    """

    USER = "user"
    AGENT = "agent"
    WORKSPACE = "workspace"


@dataclass(slots=True, frozen=True)
class MemoryQuery:
    """Inputs for a recall operation.

    ``top_k`` is clamped to [1, 50] by the use case; ``scope_filter``
    limits the search to one scope (None = all visible scopes in the
    workspace).
    """

    query: str
    top_k: int = 10
    scope_filter: MemoryScope | None = None

    def __post_init__(self) -> None:
        if not self.query or not self.query.strip():
            raise ValueError("MemoryQuery.query must be non-empty")
        if not 1 <= self.top_k <= 50:
            raise ValueError(f"MemoryQuery.top_k must be in [1, 50], got {self.top_k}")


__all__ = ["MemoryQuery", "MemoryScope"]
