"""UoW for the skill module.

One transaction wraps one use case so persistence + event publish land
together. Repositories share the session.

This is the SQL-backed UoW used by composition roots. Tests inject an
in-memory variant from `_in_memory.py`.
"""

from __future__ import annotations

from contextlib import AbstractAsyncContextManager
from typing import Self

from eos_persistence.session_factory import SessionFactory
from sqlalchemy.ext.asyncio import AsyncSession

from deos.modules.skill.adapter.persistence.repositories import (
    SqlSkillInstallRepository,
    SqlSkillInvocationRepository,
    SqlSkillRepository,
)
from deos.modules.skill.application.ports import (
    SkillInstallRepository,
    SkillInvocationRepository,
    SkillRepository,
    UnitOfWork,
)


class SqlSkillUnitOfWork(UnitOfWork):
    """One UoW = one AsyncSession bound to the skill repos."""

    skills: SkillRepository
    installs: SkillInstallRepository
    invocations: SkillInvocationRepository

    def __init__(self, session_factory: SessionFactory) -> None:
        self._session_factory = session_factory
        self._cm: AbstractAsyncContextManager[AsyncSession] | None = None
        self._session: AsyncSession | None = None

    async def __aenter__(self) -> Self:
        self._cm = self._session_factory.session()
        self._session = await self._cm.__aenter__()
        self.skills = SqlSkillRepository(self._session)
        self.installs = SqlSkillInstallRepository(self._session)
        self.invocations = SqlSkillInvocationRepository(self._session)
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        try:
            if self._cm is not None:
                await self._cm.__aexit__(exc_type, exc, tb)
        finally:
            self._cm = None
            self._session = None

    async def commit(self) -> None:
        if self._session is None:
            return
        await self._session.commit()

    async def rollback(self) -> None:
        if self._session is None:
            return
        await self._session.rollback()


__all__ = ["SqlSkillUnitOfWork"]
