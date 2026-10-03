"""Knowledge catalog service — admin CRUD + user catalog projection."""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from deos.modules.knowledge.application.ports import KnowledgeCatalogRepository
from deos.modules.knowledge.domain.entities import (
    KB_SCOPES,
    RETRIEVAL_MODES,
    SOURCE_TYPES,
    KnowledgeBase,
    KnowledgeSource,
    is_workspace_visible,
)
from deos.modules.knowledge.domain.errors import KnowledgeNotFound


class KnowledgeService:
    def __init__(self, catalog: KnowledgeCatalogRepository) -> None:
        self._catalog = catalog

    async def list_kbs(self, *, workspace_id: UUID) -> list[dict[str, Any]]:
        items = await self._catalog.list_kbs(workspace_id)
        items.sort(key=lambda item: item.updated_at, reverse=True)
        return [item.to_admin_dict() for item in items]

    async def get_kb(self, kb_id: UUID) -> dict[str, Any]:
        kb = await self._require_kb(kb_id)
        return kb.to_admin_dict()

    async def create_kb(
        self, *, tenant_id: UUID, workspace_id: UUID, body: dict[str, Any], owner: str
    ) -> dict[str, Any]:
        scope = body.get("scope") if body.get("scope") in KB_SCOPES else "部门"
        retrieval = body.get("retrieval") if body.get("retrieval") in RETRIEVAL_MODES else "hybrid"
        kb = KnowledgeBase.create(
            id=_parse_id(body.get("id")),
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            name=str(body.get("name") or "未命名知识库"),
            description=str(body.get("description") or ""),
            owner=owner,
            scope=scope,
            bound_sources=[str(item) for item in (body.get("boundSources") or [])],
            retrieval=retrieval,
            top_k=int(body.get("topK") or 8),
        )
        await self._catalog.add_kb(kb)
        return kb.to_admin_dict()

    async def toggle_kb_status(self, kb_id: UUID) -> dict[str, Any]:
        kb = await self._require_kb(kb_id)
        updated = kb.toggle_status()
        await self._catalog.update_kb(updated)
        return updated.to_admin_dict()

    async def batch_kbs(self, *, ids: list[str], action: str) -> dict[str, int]:
        affected = 0
        for raw in ids:
            try:
                kb_id = UUID(str(raw))
            except ValueError:
                continue
            kb = await self._catalog.get_kb(kb_id)
            if kb is None:
                continue
            if action == "pause":
                if kb.status == "paused":
                    continue
                updated = kb.pause()
            elif action == "rebuild":
                updated = kb.rebuild()
            else:
                affected += 1
                continue
            await self._catalog.update_kb(updated)
            affected += 1
        return {"affected": affected}

    async def list_docs(self, *, workspace_id: UUID) -> list[dict[str, Any]]:
        items = await self._catalog.list_docs(workspace_id)
        items.sort(key=lambda item: item.updated_at, reverse=True)
        return [item.to_admin_dict() for item in items]

    async def list_sources(self, *, workspace_id: UUID) -> list[dict[str, Any]]:
        items = await self._catalog.list_sources(workspace_id)
        items.sort(key=lambda item: item.updated_at, reverse=True)
        return [item.to_admin_dict() for item in items]

    async def create_source(
        self, *, tenant_id: UUID, workspace_id: UUID, body: dict[str, Any]
    ) -> dict[str, Any]:
        source_type = body.get("type") if body.get("type") in SOURCE_TYPES else "api"
        source = KnowledgeSource.create(
            id=_parse_id(body.get("id")),
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            name=str(body.get("name") or "未命名数据源"),
            type=source_type,
            schedule=str(body.get("schedule") or ""),
        )
        await self._catalog.add_source(source)
        return source.to_admin_dict()

    async def list_tasks(self, *, workspace_id: UUID) -> list[dict[str, Any]]:
        items = await self._catalog.list_tasks(workspace_id)
        items.sort(key=lambda item: item.updated_at, reverse=True)
        return [item.to_admin_dict() for item in items]

    async def list_eval_cases(self, *, workspace_id: UUID) -> list[dict[str, Any]]:
        items = await self._catalog.list_eval_cases(workspace_id)
        items.sort(key=lambda item: item.updated_at, reverse=True)
        return [item.to_admin_dict() for item in items]

    async def list_catalog(self, *, workspace_id: UUID) -> list[dict[str, Any]]:
        kbs = {kb.id: kb for kb in await self._catalog.list_kbs(workspace_id)}
        docs = await self._catalog.list_docs(workspace_id)
        out: list[dict[str, Any]] = []
        for doc in docs:
            kb = kbs.get(doc.kb_id)
            if kb is None:
                continue
            if kb.status != "indexed" or not is_workspace_visible(kb.scope):
                continue
            if doc.status != "parsed":
                continue
            out.append(doc.to_catalog_dict(kb))
        return out

    async def ask(self, *, workspace_id: UUID, question: str) -> dict[str, Any]:
        resources = await self.list_catalog(workspace_id=workspace_id)
        needle = question.strip().lower()
        hit = None
        if needle:
            for item in resources:
                hay = f"{item['title']} {' '.join(item['tags'])} {item['description']}".lower()
                if needle in hay:
                    hit = item
                    break
        if hit is None and resources:
            hit = resources[0]
        return {"question": question, "resourceId": hit["id"] if hit else ""}

    async def search_query(
        self,
        *,
        tenant_id: UUID,
        workspace_id: UUID,
        query: str,
        top_k: int,
        package_ids: tuple[str, ...] = (),
    ) -> list[dict[str, Any]]:
        _ = tenant_id
        kbs = {kb.id: kb for kb in await self._catalog.list_kbs(workspace_id)}
        allowed = {UUID(str(item)) for item in package_ids if item} if package_ids else None
        needle = query.strip().lower()
        scored: list[tuple[float, dict[str, Any]]] = []
        for doc in await self._catalog.list_docs(workspace_id):
            kb = kbs.get(doc.kb_id)
            if kb is None or kb.status != "indexed" or not is_workspace_visible(kb.scope):
                continue
            if allowed is not None and kb.id not in allowed:
                continue
            if doc.status != "parsed":
                continue
            snippets = list(doc.chunks_preview) or []
            if not snippets:
                text = f"{doc.name} {kb.description}"
                score = 1.0 if needle and needle in text.lower() else 0.1
                scored.append(
                    (
                        score,
                        {
                            "id": str(doc.id),
                            "asset_id": str(doc.id),
                            "package_id": str(kb.id),
                            "package_name": kb.name,
                            "asset_name": doc.name,
                            "content": kb.description or doc.name,
                            "score": score,
                            "ordinal": 0,
                        },
                    )
                )
                continue
            for chunk in snippets:
                hay = f"{doc.name} {chunk.heading} {chunk.snippet}".lower()
                score = 1.0 if needle and needle in hay else (0.2 if not needle else 0.05)
                if needle and needle in hay:
                    score += 0.5
                scored.append(
                    (
                        score,
                        {
                            "id": f"{doc.id}:{chunk.index}",
                            "asset_id": str(doc.id),
                            "package_id": str(kb.id),
                            "package_name": kb.name,
                            "asset_name": doc.name,
                            "content": chunk.snippet or chunk.heading or doc.name,
                            "score": score,
                            "ordinal": chunk.index,
                        },
                    )
                )
        scored.sort(key=lambda item: item[0], reverse=True)
        return [item[1] for item in scored[: max(1, top_k)]]

    async def _require_kb(self, kb_id: UUID):
        kb = await self._catalog.get_kb(kb_id)
        if kb is None:
            raise KnowledgeNotFound(f"knowledge base {kb_id} not found")
        return kb


def _parse_id(raw: Any) -> UUID:
    if raw:
        try:
            return UUID(str(raw))
        except ValueError:
            pass
    return uuid4()


__all__ = ["KnowledgeService"]
