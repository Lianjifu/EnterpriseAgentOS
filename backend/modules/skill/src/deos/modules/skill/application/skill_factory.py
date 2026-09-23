"""SkillServiceFactory Protocol.

Mirrors `tool_factory.ToolServiceFactory`. Each request needs a fresh
`SkillService` (use cases hold an `InvocationRunner` and UoW factory),
so the factory is stored on `request.state` by the HTTP middleware and
called per request by the `skill_dependency` route.

Keeping this in its own module prevents the circular import between
`services.py` (which references use cases) and `adapter/http/router.py`
(which references services).
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from deos.modules.skill.application.services import SkillService


@runtime_checkable
class SkillServiceFactory(Protocol):
    """Returns a `SkillService` bound to the current request session.

    Production wires this to a fresh `SkillService` per request; tests
    return a singleton in-memory service.
    """

    def for_session(self) -> SkillService: ...


__all__ = ["SkillServiceFactory"]
