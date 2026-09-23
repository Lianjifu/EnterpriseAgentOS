"""UseCase: password-based login → access token."""

from __future__ import annotations

from uuid import UUID

from deos.modules.identity.application.ports import (
    AccessTokenIssuer,
    Hasher,
    UserRepository,
)
from deos.modules.identity.domain.errors import InvalidCredentials


class LoginUseCase:
    def __init__(
        self,
        users: UserRepository,
        hasher: Hasher,
        issuer: AccessTokenIssuer,
    ) -> None:
        self._users = users
        self._hasher = hasher
        self._issuer = issuer

    async def execute(
        self, *, tenant_id: UUID, email: str, password: str
    ) -> tuple[str, int]:
        user = await self._users.get_by_email(tenant_id, email)
        if user is None or user.hashed_password is None:
            raise InvalidCredentials("invalid email or password")
        if not self._hasher.verify(password, user.hashed_password):
            raise InvalidCredentials("invalid email or password")
        token, exp = self._issuer.issue(user, None)
        return token, exp
