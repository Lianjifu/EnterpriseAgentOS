"""IngestKnowledgeAssetUseCase — chunk + embed + index pipeline.

Flow:
  1. Read bytes from ``StoragePort.get(asset.storage_uri)``.
  2. Decode to text (UTF-8).
  3. Split with :class:`ChunkerPort`.
  4. Embed each chunk via :class:`EmbeddingPort`.
  5. Persist chunk rows via the repository.
  6. Upsert vectors via :class:`VectorSearchPort`.
  7. Update asset status to ``READY`` with the chunk count.

On failure: asset is flipped to ``FAILED`` with ``error_message`` and
the event ``KnowledgeAssetIngested`` is not published (only successes
emit it). Failures are caught at the use case boundary so the HTTP
router can return 202 with a status that callers poll.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from eos_schema.ids import KnowledgeAssetId, TenantId

from deos.modules.knowledge.application.chunker import FixedWindowChunker
from deos.modules.knowledge.application.ports import (
    ChunkerPort,
    EmbeddingPort,
    KnowledgeEventPublisher,
    KnowledgeRepository,
    StoragePort,
    VectorSearchPort,
)
from deos.modules.knowledge.domain.entities import KnowledgeAsset, KnowledgeChunk
from deos.modules.knowledge.domain.errors import KnowledgeAssetNotFound
from deos.modules.knowledge.domain.events import KnowledgeAssetIngested
from deos.modules.knowledge.domain.value_objects import (
    DEFAULT_CHUNK_OVERLAP,
    DEFAULT_CHUNK_SIZE,
    KnowledgeAssetStatus,
)

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class IngestKnowledgeAssetUseCase:
    repository: KnowledgeRepository
    storage: StoragePort
    embedding: EmbeddingPort
    chunker: ChunkerPort = None  # type: ignore[assignment]  # set in __post_init__ / wired by service
    vector_search: VectorSearchPort | None = None
    publisher: KnowledgeEventPublisher | None = None
    default_chunk_size: int = DEFAULT_CHUNK_SIZE
    default_chunk_overlap: int = DEFAULT_CHUNK_OVERLAP

    def __post_init__(self) -> None:
        if self.chunker is None:
            self.chunker = FixedWindowChunker()

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        asset_id: KnowledgeAssetId,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
    ) -> KnowledgeAsset:
        sz = chunk_size if chunk_size is not None else self.default_chunk_size
        ov = chunk_overlap if chunk_overlap is not None else self.default_chunk_overlap

        asset = await self.repository.get_asset(tenant_id=tenant_id, asset_id=asset_id)
        if asset is None:
            raise KnowledgeAssetNotFound(
                f"asset {asset_id} not found",
                code="KNOWLEDGE_ASSET_NOT_FOUND",
            )

        # mark processing
        await self.repository.update_asset(
            asset.with_status(status=KnowledgeAssetStatus.PROCESSING)
        )

        try:
            raw = await self.storage.get(tenant_id=tenant_id, uri=asset.storage_uri)
            text = raw.decode("utf-8", errors="replace")
            pieces = self.chunker.split(text, chunk_size=sz, chunk_overlap=ov)
            if not pieces:
                # Empty payload — produce a single chunk from the empty text would
                # be wrong; instead leave chunk_count at 0 and mark ready.
                ready = asset.with_status(
                    status=KnowledgeAssetStatus.READY,
                ).with_chunk_count(chunk_count=0)
                saved = await self.repository.update_asset(ready)
                if self.publisher is not None:
                    try:
                        await self.publisher.publish(
                            KnowledgeAssetIngested(
                                asset_id=saved.id,
                                package_id=saved.package_id,
                                tenant_id=saved.tenant_id,
                                workspace_id=saved.workspace_id,
                                chunk_count=0,
                            )
                        )
                    except Exception:
                        logger.exception(
                            "publish KnowledgeAssetIngested failed for %s", saved.id
                        )
                return saved

            embeddings = await self.embedding.embed([p[0] for p in pieces])
            if len(embeddings) != len(pieces):
                raise RuntimeError(
                    f"embedding count mismatch: got {len(embeddings)} for {len(pieces)} chunks"
                )

            chunks: list[KnowledgeChunk] = []
            for ordinal, ((text_piece, cs, ce), embedding) in enumerate(
                zip(pieces, embeddings, strict=True)
            ):
                chunks.append(
                    KnowledgeChunk.from_text(
                        id=None,
                        tenant_id=asset.tenant_id,
                        workspace_id=asset.workspace_id,
                        package_id=asset.package_id,
                        asset_id=asset.id,
                        ordinal=ordinal,
                        text=text_piece,
                        char_start=cs,
                        char_end=ce,
                    )
                )

            saved_chunks = await self.repository.add_chunks(chunks=chunks)

            # Vector index — best-effort; if it fails the SQL rows still exist
            # so an operator can re-run the ingest later.
            if self.vector_search is not None:
                for chunk, emb in zip(saved_chunks, embeddings, strict=True):
                    try:
                        await self.vector_search.upsert(
                            tenant_id=chunk.tenant_id,
                            workspace_id=chunk.workspace_id,
                            chunk_id=chunk.id,
                            embedding=tuple(float(x) for x in emb),
                            payload={
                                "package_id": str(chunk.package_id),
                                "asset_id": str(chunk.asset_id),
                                "workspace_id": str(chunk.workspace_id),
                                "asset_kind": asset.kind.value,
                            },
                        )
                    except Exception:
                        logger.exception(
                            "vector upsert failed for chunk %s — chunk is queryable "
                            "via SQL fallback only",
                            chunk.id,
                        )

            ready = asset.with_status(
                status=KnowledgeAssetStatus.READY,
            ).with_chunk_count(chunk_count=len(saved_chunks))
            saved = await self.repository.update_asset(ready)

            if self.publisher is not None:
                try:
                    await self.publisher.publish(
                        KnowledgeAssetIngested(
                            asset_id=saved.id,
                            package_id=saved.package_id,
                            tenant_id=saved.tenant_id,
                            workspace_id=saved.workspace_id,
                            chunk_count=saved.chunk_count,
                        )
                    )
                except Exception:
                    logger.exception(
                        "publish KnowledgeAssetIngested failed for %s", saved.id
                    )

            return saved
        except Exception as exc:
            logger.exception("ingest failed for asset %s", asset_id)
            failed = asset.with_status(
                status=KnowledgeAssetStatus.FAILED,
                error_message=str(exc)[:1024],
            )
            try:
                await self.repository.update_asset(failed)
            except Exception:  # pragma: no cover - defensive
                logger.exception("could not flip asset %s to FAILED", asset_id)
            raise


__all__ = ["IngestKnowledgeAssetUseCase"]
