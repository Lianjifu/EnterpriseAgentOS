"""Local-disk content-addressed skill artifact store.

URI shape: `skill-artifact://{tenant_id}/{sha256_hex}`.

Designed for P3 dev/CI; an S3 adapter with the same Protocol goes in
P5 governance.
"""

from __future__ import annotations

import asyncio
import hashlib
from pathlib import Path

from eos_schema.ids import TenantId, WorkspaceId

from deos.modules.skill.domain.errors import SkillArtifactNotFound


def _parse(uri: str) -> tuple[str, str]:
    """Parse `skill-artifact://tenant_id/sha256_hex` → (tenant_id, sha)."""
    prefix = "skill-artifact://"
    if not uri.startswith(prefix):
        raise SkillArtifactNotFound(
            f"invalid artifact URI: {uri!r}",
            code="SKILL_ARTIFACT_NOT_FOUND",
        )
    rest = uri[len(prefix) :]
    parts = rest.split("/", 1)
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise SkillArtifactNotFound(
            f"malformed artifact URI: {uri!r}",
            code="SKILL_ARTIFACT_NOT_FOUND",
        )
    return parts[0], parts[1]


class LocalDiskSkillArtifactStore:
    """Content-addressed blob store rooted at `root`."""

    def __init__(self, root: Path) -> None:
        self._root = Path(root)
        self._root.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()

    def _path(self, tenant_id: str, sha: str) -> Path:
        return self._root / tenant_id / sha[:2] / sha

    async def put(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        key: str,
        data: bytes,
        content_type: str = "application/json",
    ) -> str:
        del workspace_id, key, content_type  # unused — content addressed
        sha = hashlib.sha256(data).hexdigest()
        async with self._lock:
            path = self._path(str(tenant_id), sha)
            path.parent.mkdir(parents=True, exist_ok=True)
            if not path.exists():
                await asyncio.to_thread(path.write_bytes, data)
        return f"skill-artifact://{tenant_id}/{sha}"

    async def get(self, *, tenant_id: TenantId, uri: str) -> bytes:
        del tenant_id  # unused — already in the URI
        owner, sha = _parse(uri)
        path = self._path(owner, sha)
        if not path.exists():
            raise SkillArtifactNotFound(
                f"artifact {uri} not found",
                code="SKILL_ARTIFACT_NOT_FOUND",
            )
        return await asyncio.to_thread(path.read_bytes)

    async def exists(self, *, tenant_id: TenantId, uri: str) -> bool:
        del tenant_id
        owner, sha = _parse(uri)
        return self._path(owner, sha).exists()

    async def delete(self, *, tenant_id: TenantId, uri: str) -> None:
        del tenant_id
        owner, sha = _parse(uri)
        path = self._path(owner, sha)
        await asyncio.to_thread(path.unlink, True)  # missing_ok=True

    async def local_path(self, *, tenant_id: TenantId, uri: str) -> Path | None:
        del tenant_id
        owner, sha = _parse(uri)
        path = self._path(owner, sha)
        return path if path.exists() else None


__all__ = ["LocalDiskSkillArtifactStore"]
