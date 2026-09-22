"""Local-disk content-addressed knowledge asset store.

URI shape: ``knowledge-asset://{tenant_id}/{sha256_hex}``.

Designed for P7 dev / CI; an S3 adapter with the same Protocol goes in
P10.  Mirrors ``modules/skill/adapter/artifacts/local.py``.
"""

from __future__ import annotations

import asyncio
import hashlib
from pathlib import Path

from eos_schema.ids import TenantId

_URI_PREFIX = "knowledge-asset://"


def _parse(uri: str) -> tuple[str, str]:
    if not uri.startswith(_URI_PREFIX):
        raise FileNotFoundError(f"invalid asset URI: {uri!r}")
    rest = uri[len(_URI_PREFIX) :]
    parts = rest.split("/", 1)
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise FileNotFoundError(f"malformed asset URI: {uri!r}")
    return parts[0], parts[1]


class LocalDiskKnowledgeStorage:
    """Content-addressed blob store rooted at ``root``."""

    def __init__(self, root: Path) -> None:
        self._root = Path(root)
        self._root.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()

    def _path(self, tenant_id: str, sha: str) -> Path:
        return self._root / tenant_id / sha[:2] / sha

    async def put(
        self, *, tenant_id: TenantId, key: str, data: bytes
    ) -> str:
        del key  # unused — content addressed
        sha = hashlib.sha256(data).hexdigest()
        async with self._lock:
            path = self._path(str(tenant_id), sha)
            path.parent.mkdir(parents=True, exist_ok=True)
            if not path.exists():
                await asyncio.to_thread(path.write_bytes, data)
        return f"{_URI_PREFIX}{tenant_id}/{sha}"

    async def get(self, *, tenant_id: TenantId, uri: str) -> bytes:
        del tenant_id  # already encoded in the URI
        owner, sha = _parse(uri)
        path = self._path(owner, sha)
        if not path.exists():
            raise FileNotFoundError(uri)
        return await asyncio.to_thread(path.read_bytes)

    async def delete(self, *, tenant_id: TenantId, uri: str) -> None:
        del tenant_id
        owner, sha = _parse(uri)
        path = self._path(owner, sha)
        await asyncio.to_thread(path.unlink, True)  # missing_ok=True

    async def exists(self, *, tenant_id: TenantId, uri: str) -> bool:
        del tenant_id
        owner, sha = _parse(uri)
        return self._path(owner, sha).exists()


__all__ = ["LocalDiskKnowledgeStorage"]