"""RunToken: short-lived HMAC token for sandbox callbacks.

A RunToken is issued at skill install time and presented on every invoke
call. The runtime (a separate process in prod) verifies the signature
without needing DB access.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from uuid import UUID

from eos_kernel.errors import AuthenticationError

_HASH_ALGO = hashlib.sha256


@dataclass(slots=True, frozen=True)
class RunToken:
    raw: str
    skill_id: UUID
    tenant_id: UUID
    workspace_id: UUID
    issued_at_ms: int
    expires_at_ms: int

    @property
    def is_expired(self) -> bool:
        return time.time() * 1000 >= self.expires_at_ms


def issue_run_token(
    *,
    secret: str,
    skill_id: UUID,
    tenant_id: UUID,
    workspace_id: UUID,
    ttl_seconds: int = 300,
) -> RunToken:
    now_ms = int(time.time() * 1000)
    exp_ms = now_ms + ttl_seconds * 1000
    payload = {
        "skill_id": str(skill_id),
        "tenant_id": str(tenant_id),
        "workspace_id": str(workspace_id),
        "iat": now_ms,
        "exp": exp_ms,
    }
    body = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    sig = hmac.new(secret.encode(), body, _HASH_ALGO).hexdigest()
    raw = body.decode() + "." + sig
    return RunToken(
        raw=raw,
        skill_id=skill_id,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        issued_at_ms=now_ms,
        expires_at_ms=exp_ms,
    )


def verify_run_token(token: str, *, secret: str) -> RunToken:
    try:
        body, sig = token.rsplit(".", 1)
    except ValueError as e:
        raise AuthenticationError(
            "malformed run token", code="RUN_TOKEN_MALFORMED"
        ) from e
    expected = hmac.new(secret.encode(), body.encode(), _HASH_ALGO).hexdigest()
    if not hmac.compare_digest(expected, sig):
        raise AuthenticationError("bad run token signature", code="RUN_TOKEN_BAD_SIG")
    payload = json.loads(body)
    return RunToken(
        raw=token,
        skill_id=UUID(payload["skill_id"]),
        tenant_id=UUID(payload["tenant_id"]),
        workspace_id=UUID(payload["workspace_id"]),
        issued_at_ms=int(payload["iat"]),
        expires_at_ms=int(payload["exp"]),
    )
