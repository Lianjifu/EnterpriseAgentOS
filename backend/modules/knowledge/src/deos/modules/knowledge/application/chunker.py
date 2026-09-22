"""Chunkers — split raw text into (text, char_start, char_end) slices.

``FixedWindowChunker`` is the v1 default: a sliding window over the
input text with overlap. It is intentionally simple — P10 may add
semantic chunking via LangChain splitters.
"""

from __future__ import annotations

from deos.modules.knowledge.application.ports import ChunkerPort

__all__ = ["FixedWindowChunker"]


class FixedWindowChunker(ChunkerPort):
    """Sliding-window chunker.

    Splits ``text`` into slices of length ``chunk_size`` with
    ``chunk_overlap`` characters of overlap between consecutive slices.
    Whitespace inside each slice is preserved verbatim — the embedder
    is responsible for normalization.
    """

    def split(
        self, text: str, *, chunk_size: int, chunk_overlap: int
    ) -> list[tuple[str, int, int]]:
        if chunk_size <= 0:
            raise ValueError(f"chunk_size must be > 0, got {chunk_size}")
        if chunk_overlap < 0:
            raise ValueError(f"chunk_overlap must be >= 0, got {chunk_overlap}")
        if chunk_overlap >= chunk_size:
            raise ValueError(
                f"chunk_overlap ({chunk_overlap}) must be < chunk_size ({chunk_size})"
            )
        if not text:
            return []

        # Normalize newlines so chunk_start/char_end are byte-stable.
        normalized = text.replace("\r\n", "\n").replace("\r", "\n")
        n = len(normalized)
        out: list[tuple[str, int, int]] = []
        stride = chunk_size - chunk_overlap
        start = 0
        while start < n:
            end = min(start + chunk_size, n)
            piece = normalized[start:end]
            if piece.strip():
                out.append((piece, start, end))
            if end == n:
                break
            start += stride
        return out
