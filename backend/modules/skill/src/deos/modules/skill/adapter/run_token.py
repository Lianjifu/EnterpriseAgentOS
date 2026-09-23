"""RunToken adapter.

Wraps `eos_sandbox.run_token.{issue,verify}_run_token` so the skill
module only depends on its own `RunTokenIssuer` Protocol. The jti is
the SHA-256 of the issued token body (hex prefix), which lets
`SkillInstall.run_token_jti` pin the install to a specific token.
"""

from __future__ import annotations

import hashlib
import time
from typing import cast

from eos_kernel.errors import AuthenticationError
from eos_sandbox.run_token import issue_run_token, verify_run_token
from eos_schema.ids import SkillId, TenantId, WorkspaceId

from deos.modules.skill.application.ports import RunTokenIssuer as _PortProtocol


class EosRunTokenIssuer(_PortProtocol):
    def __init__(self, *, secret: str, default_ttl_seconds: int = 300) -> None:
        self._secret = secret
        self._default_ttl = default_ttl_seconds

    def issue(
        self,
        *,
        skill_id: SkillId,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        ttl_seconds: int = 300,
    ) -> tuple[str, str, int]:
        ttl = ttl_seconds if ttl_seconds > 0 else self._default_ttl
        token = issue_run_token(
            secret=self._secret,
            skill_id=skill_id,
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            ttl_seconds=ttl,
        )
        body = token.raw.split(".", 1)[0] if "." in token.raw else token.raw
        jti = hashlib.sha256(token.raw.encode("utf-8")).hexdigest()[:32]
        expires_at_ms = int((time.time() + ttl) * 1000)
        _ = expires_at_ms
        del body  # body kept for jti derivation
        return token.raw, jti, expires_at_ms

    def verify(self, token: str) -> SkillId | None:
        try:
            parsed = verify_run_token(token, secret=self._secret)
        except AuthenticationError:
            return None
        return cast(SkillId, parsed.skill_id)


__all__ = ["EosRunTokenIssuer"]
