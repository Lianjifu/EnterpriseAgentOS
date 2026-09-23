"""LLM client: OpenAI-compatible + Anthropic/DeepSeek + Router + Embeddings."""

from eos_llm.client import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    LLMChunk,
    LLMClient,
    Usage,
)
from eos_llm.config import LLMConfig, LLMProvider
from eos_llm.embeddings import embed, embed_many
from eos_llm.mock import MockLLMClient
from eos_llm.openai_compatible import OpenAICompatibleClient
from eos_llm.router import LLMRouter

__all__ = [
    "ChatMessage",
    "ChatRequest",
    "ChatResponse",
    "LLMChunk",
    "LLMClient",
    "LLMConfig",
    "LLMProvider",
    "LLMRouter",
    "MockLLMClient",
    "OpenAICompatibleClient",
    "Usage",
    "embed",
    "embed_many",
]
