"""P4 bench: vector search P95 latency on a real pgvector HNSW index.

Inserts ``rows`` deterministic 1536-dim embeddings into ``memory_entries``
+ ``memory_embeddings_vec``, then runs ``queries`` cosine searches and
prints latency stats (mean / P50 / P95 / P99 / max). Goal: P95 ≤ 200ms
with 10k rows.

Usage:
    uv run python -m memory.bench --rows 10000 --queries 200 --top-k 10
"""

from __future__ import annotations

import argparse
import asyncio
import os
import random
import statistics
import time
from uuid import UUID

from eos_persistence.pgvector import register_pgvector
from eos_schema.ids import TenantId, UserId, WorkspaceId
from eos_vector.pg_vector import PgVectorStore
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from deos.modules.memory.adapter.persistence.repositories import SqlMemoryRepository
from deos.modules.memory.adapter.persistence.vector_adapter import (
    PgMemoryVectorAdapter,
)
from deos.modules.memory.domain.entities import EMBEDDING_DIM, MemoryEntry
from deos.modules.memory.domain.value_objects import MemoryScope

DEFAULT_URL = "postgresql+asyncpg://postgres:postgres@localhost:5499/eos_dev"


def _rng_embedding(seed: int, dim: int = EMBEDDING_DIM) -> list[float]:
    """Deterministic pseudo-random vector keyed by ``seed``."""
    rng = random.Random(seed)
    vec = [rng.gauss(0.0, 1.0) for _ in range(dim)]
    norm = sum(v * v for v in vec) ** 0.5 or 1.0
    return [v / norm for v in vec]


async def _ensure_schema(engine, dim: int) -> None:
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS memory_entries (
                    id UUID PRIMARY KEY,
                    tenant_id UUID NOT NULL,
                    workspace_id UUID NOT NULL,
                    owner_id UUID NOT NULL,
                    scope TEXT NOT NULL,
                    content TEXT NOT NULL,
                    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                    revoked BOOLEAN NOT NULL DEFAULT FALSE,
                    version_lock INTEGER NOT NULL DEFAULT 1,
                    expires_at TIMESTAMPTZ NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        await conn.execute(
            text(
                f"""
                CREATE TABLE IF NOT EXISTS memory_embeddings_vec (
                    id UUID PRIMARY KEY,
                    tenant_id UUID NOT NULL,
                    workspace_id UUID,
                    embedding vector({dim}) NOT NULL,
                    payload JSONB NOT NULL DEFAULT '{{}}'::jsonb
                )
                """
            )
        )
        # HNSW cosine index (idempotent — create only if missing).
        exists = await conn.execute(
            text(
                "SELECT 1 FROM pg_indexes "
                "WHERE tablename='memory_embeddings_vec' "
                "AND indexname='ix_memory_embeddings_vec_hnsw'"
            )
        )
        if not exists.scalar():
            await conn.execute(
                text(
                    "CREATE INDEX ix_memory_embeddings_vec_hnsw "
                    "ON memory_embeddings_vec USING hnsw "
                    "(embedding vector_cosine_ops) WITH (m=16, ef_construction=64)"
                )
            )


async def _populate(
    session: AsyncSession, vs: PgMemoryVectorAdapter, *, rows: int, tenant, ws, owner
) -> None:
    repo = SqlMemoryRepository(session=session)
    # batch inserts to keep wall time low
    chunk = 500
    for start in range(0, rows, chunk):
        end = min(start + chunk, rows)
        for i in range(start, end):
            entry = MemoryEntry.create(
                tenant_id=tenant,
                workspace_id=ws,
                owner_id=owner,
                scope=MemoryScope.WORKSPACE,
                content=f"row {i}",
                embedding=_rng_embedding(seed=i),
            )
            await repo.add(entry)
            await vs.upsert(
                tenant_id=tenant,
                workspace_id=ws,
                memory_id=entry.id,
                embedding=tuple(entry.embedding),
                scope=entry.scope,
            )
        await session.flush()
        print(f"  inserted {end}/{rows}", flush=True)


async def _search_bench(
    vs: PgMemoryVectorAdapter, *, tenant, ws, queries: int, top_k: int
) -> list[float]:
    latencies: list[float] = []
    for q in range(queries):
        qvec = tuple(_rng_embedding(seed=1_000_000 + q))
        started = time.monotonic()
        hits = await vs.search(
            tenant_id=tenant,
            workspace_id=ws,
            query_embedding=qvec,
            top_k=top_k,
        )
        elapsed_ms = (time.monotonic() - started) * 1000.0
        latencies.append(elapsed_ms)
        _ = hits
    return latencies


async def _amain(args: argparse.Namespace) -> int:
    url = args.url or os.environ.get("EOS_DATABASE_URL", DEFAULT_URL)
    register_pgvector()
    engine = create_async_engine(url)
    await _ensure_schema(engine, dim=EMBEDDING_DIM)

    tenant = TenantId(UUID("11111111-1111-1111-1111-111111111111"))
    ws = WorkspaceId(UUID("22222222-2222-2222-2222-222222222222"))
    owner = UserId(UUID("33333333-3333-3333-3333-333333333333"))

    # Wipe any prior bench rows for this tenant.
    async with engine.begin() as conn:
        await conn.execute(
            text("DELETE FROM memory_embeddings_vec WHERE tenant_id = :t"),
            {"t": str(tenant)},
        )
        await conn.execute(
            text("DELETE FROM memory_entries WHERE tenant_id = :t"),
            {"t": str(tenant)},
        )

    async with AsyncSession(engine) as session:
        store = PgVectorStore(
            engine=engine, table="memory_embeddings_vec", dim=EMBEDDING_DIM
        )
        vs = PgMemoryVectorAdapter(store=store)
        print(f"populating {args.rows} rows…", flush=True)
        await _populate(session, vs, rows=args.rows, tenant=tenant, ws=ws, owner=owner)
        await session.commit()

    # ANALYZE so the planner picks HNSW.
    async with engine.begin() as conn:
        await conn.execute(text("ANALYZE memory_embeddings_vec"))

    async with AsyncSession(engine) as session:
        store = PgVectorStore(
            engine=engine, table="memory_embeddings_vec", dim=EMBEDDING_DIM
        )
        vs = PgMemoryVectorAdapter(store=store)
        print(f"running {args.queries} queries (top_k={args.top_k})…", flush=True)
        latencies = await _search_bench(
            vs, tenant=tenant, ws=ws, queries=args.queries, top_k=args.top_k
        )

    latencies.sort()
    p50 = latencies[int(len(latencies) * 0.50)]
    p95 = latencies[int(len(latencies) * 0.95)]
    p99 = latencies[int(len(latencies) * 0.99)]
    mean = statistics.mean(latencies)
    mx = max(latencies)
    print("\n== bench results ==")
    print(f"  rows    : {args.rows}")
    print(f"  queries : {args.queries}")
    print(f"  top_k   : {args.top_k}")
    print(f"  mean    : {mean:7.2f} ms")
    print(f"  P50     : {p50:7.2f} ms")
    print(f"  P95     : {p95:7.2f} ms   <-- target ≤ 200 ms")
    print(f"  P99     : {p99:7.2f} ms")
    print(f"  max     : {mx:7.2f} ms")
    return 0 if p95 <= 200 else 1


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--rows", type=int, default=10_000)
    p.add_argument("--queries", type=int, default=200)
    p.add_argument("--top-k", type=int, default=10)
    p.add_argument("--url", default=None)
    args = p.parse_args()
    raise SystemExit(asyncio.run(_amain(args)))


if __name__ == "__main__":
    main()
