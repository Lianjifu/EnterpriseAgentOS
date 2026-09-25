"""UseCase: password-based login → access token + user payload.

Public surface (a single method, returning ``LoginResult`` so callers can
fold token + expires_at + user into one response without a second
``/users/me`` round-trip).
"""

from __future__ import annotations

from dataclasses import dataclass

from deos.modules.identity.application.ports import (
    AccessTokenIssuer,
    Hasher,
    UserRepository,
)
from deos.modules.identity.domain import User
from deos.modules.identity.domain.errors import InvalidCredentials


@dataclass(slots=True, frozen=True)
class LoginResult:
    token: str
    expires_at: int
    user: User


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

    async def execute(self, *, email: str, password: str) -> LoginResult:
        # Cross-tenant lookup: the caller (login form) does not know the
        # tenant_id ahead of time. Email is assumed globally unique — see
        # UserRepository.get_by_email_global docstring.
        user = await self._users.get_by_email_global(email)
        # Same error message for "no such user" and "wrong password" — do
        # not leak which side failed (anti-enumeration).
        if user is None or user.hashed_password is None:
            raise InvalidCredentials("invalid email or password")
        if not self._hasher.verify(password, user.hashed_password):
            raise InvalidCredentials("invalid email or password")
        token, exp = self._issuer.issue(user, None)
        return LoginResult(token=token, expires_at=exp, user=user)