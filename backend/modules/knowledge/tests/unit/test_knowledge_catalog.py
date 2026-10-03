"""Knowledge catalog unit tests — admin KBs + user projection."""

from __future__ import annotations

from uuid import UUID

import pytest

from deos.modules.knowledge.application.ports import KnowledgeCatalogRepository
from deos.modules.knowledge.application.services import KnowledgeService
from deos.modules.knowledge.domain.entities import (
    DocChunk,
    KnowledgeBase,
    KnowledgeDoc,
    KnowledgeEvalCase,
    KnowledgeSource,
    KnowledgeTask,
)
from deos.modules.knowledge.domain.errors import KnowledgeNotFound

TENANT = UUID("00000000-0000-0000-0000-000000000001")
WORKSPACE = UUID("00000000-0000-0000-0000-000000000002")


class InMemoryCatalog(KnowledgeCatalogRepository):
    def __init__(self) -> None:
        self.kbs: dict[UUID, KnowledgeBase] = {}
        self.docs: dict[UUID, KnowledgeDoc] = {}
        self.sources: dict[UUID, KnowledgeSource] = {}
        self.tasks: dict[UUID, KnowledgeTask] = {}
        self.evals: dict[UUID, KnowledgeEvalCase] = {}

    async def add_kb(self, kb: KnowledgeBase) -> None:
        self.kbs[kb.id] = kb

    async def get_kb(self, kb_id: UUID) -> KnowledgeBase | None:
        return self.kbs.get(kb_id)

    async def list_kbs(self, workspace_id: UUID) -> list[KnowledgeBase]:
        return [item for item in self.kbs.values() if item.workspace_id == workspace_id]

    async def update_kb(self, kb: KnowledgeBase) -> None:
        self.kbs[kb.id] = kb

    async def add_doc(self, doc: KnowledgeDoc) -> None:
        self.docs[doc.id] = doc

    async def get_doc(self, doc_id: UUID) -> KnowledgeDoc | None:
        return self.docs.get(doc_id)

    async def list_docs(self, workspace_id: UUID) -> list[KnowledgeDoc]:
        return [item for item in self.docs.values() if item.workspace_id == workspace_id]

    async def add_source(self, source: KnowledgeSource) -> None:
        self.sources[source.id] = source

    async def list_sources(self, workspace_id: UUID) -> list[KnowledgeSource]:
        return [item for item in self.sources.values() if item.workspace_id == workspace_id]

    async def list_tasks(self, workspace_id: UUID) -> list[KnowledgeTask]:
        return [item for item in self.tasks.values() if item.workspace_id == workspace_id]

    async def list_eval_cases(self, workspace_id: UUID) -> list[KnowledgeEvalCase]:
        return [item for item in self.evals.values() if item.workspace_id == workspace_id]


def _svc() -> tuple[KnowledgeService, InMemoryCatalog]:
    catalog = InMemoryCatalog()
    return KnowledgeService(catalog), catalog


@pytest.mark.asyncio
async def test_create_list_toggle_and_batch() -> None:
    svc, _catalog = _svc()
    created = await svc.create_kb(
        tenant_id=TENANT,
        workspace_id=WORKSPACE,
        body={"name": "产品手册", "description": "对外说明", "scope": "公开"},
        owner="产品团队",
    )
    assert created["status"] == "indexing"
    listed = await svc.list_kbs(workspace_id=WORKSPACE)
    assert len(listed) == 1
    kb_id = UUID(created["id"])
    toggled = await svc.toggle_kb_status(kb_id)
    assert toggled["status"] == "paused"
    batch = await svc.batch_kbs(ids=[str(kb_id)], action="rebuild")
    assert batch["affected"] == 1
    again = await svc.get_kb(kb_id)
    assert again["status"] == "indexing"


@pytest.mark.asyncio
async def test_catalog_only_indexed_visible_parsed_docs() -> None:
    svc, catalog = _svc()
    created = await svc.create_kb(
        tenant_id=TENANT,
        workspace_id=WORKSPACE,
        body={"name": "员工手册", "description": "人事制度", "scope": "部门"},
        owner="人力资源",
    )
    kb_id = UUID(created["id"])
    kb = await catalog.get_kb(kb_id)
    assert kb is not None
    await catalog.update_kb(kb.pause())  # paused — not in catalog
    hidden_doc = KnowledgeDoc(
        id=UUID("00000000-0000-0000-0000-0000000000aa"),
        tenant_id=TENANT,
        workspace_id=WORKSPACE,
        name="隐藏文档.pdf",
        type="policy",
        kb_id=kb_id,
        status="parsed",
        updated_at=kb.updated_at,
        created_at=kb.created_at,
        chunks_preview=[DocChunk(index=1, snippet="年假规则")],
    )
    await catalog.add_doc(hidden_doc)
    assert await svc.list_catalog(workspace_id=WORKSPACE) == []

    open_kb = await svc.create_kb(
        tenant_id=TENANT,
        workspace_id=WORKSPACE,
        body={"name": "术语表", "description": "业务名词", "scope": "公开"},
        owner="产品团队",
    )
    open_id = UUID(open_kb["id"])
    stored = await catalog.get_kb(open_id)
    assert stored is not None
    stored.status = "indexed"
    await catalog.update_kb(stored)
    doc = KnowledgeDoc(
        id=UUID("00000000-0000-0000-0000-0000000000bb"),
        tenant_id=TENANT,
        workspace_id=WORKSPACE,
        name="业务术语.md",
        type="faq",
        kb_id=open_id,
        status="parsed",
        updated_at=stored.updated_at,
        created_at=stored.created_at,
        chunks_preview=[DocChunk(index=1, snippet="智能体即 Agent")],
    )
    await catalog.add_doc(doc)
    catalog_rows = await svc.list_catalog(workspace_id=WORKSPACE)
    assert len(catalog_rows) == 1
    assert catalog_rows[0]["title"] == "业务术语.md"
    assert catalog_rows[0]["kind"] == "指南"

    asked = await svc.ask(workspace_id=WORKSPACE, question="智能体")
    assert asked["resourceId"] == str(doc.id)


@pytest.mark.asyncio
async def test_create_source_and_missing_kb() -> None:
    svc, _catalog = _svc()
    source = await svc.create_source(
        tenant_id=TENANT,
        workspace_id=WORKSPACE,
        body={"name": "Notion 空间", "type": "notion", "schedule": "每小时"},
    )
    assert source["status"] == "online"
    sources = await svc.list_sources(workspace_id=WORKSPACE)
    assert len(sources) == 1
    with pytest.raises(KnowledgeNotFound):
        await svc.get_kb(UUID("00000000-0000-0000-0000-000000000099"))


@pytest.mark.asyncio
async def test_search_query_scores_snippets() -> None:
    svc, catalog = _svc()
    created = await svc.create_kb(
        tenant_id=TENANT,
        workspace_id=WORKSPACE,
        body={"name": "客服 FAQ", "description": "常见问题", "scope": "部门"},
        owner="客服",
    )
    kb_id = UUID(created["id"])
    kb = await catalog.get_kb(kb_id)
    assert kb is not None
    kb.status = "indexed"
    await catalog.update_kb(kb)
    doc = KnowledgeDoc(
        id=UUID("00000000-0000-0000-0000-0000000000cc"),
        tenant_id=TENANT,
        workspace_id=WORKSPACE,
        name="FAQ.csv",
        type="faq",
        kb_id=kb_id,
        status="parsed",
        updated_at=kb.updated_at,
        created_at=kb.created_at,
        chunks_preview=[
            DocChunk(index=1, heading="退款", snippet="7 天内订单如何退款"),
            DocChunk(index=2, heading="发票", snippet="如何开增值税专票"),
        ],
    )
    await catalog.add_doc(doc)
    hits = await svc.search_query(
        tenant_id=TENANT, workspace_id=WORKSPACE, query="退款", top_k=3
    )
    assert hits
    assert hits[0]["content"].find("退款") >= 0
    assert hits[0]["package_id"] == str(kb_id)
