"""Model module — value objects (StrEnum + small dataclasses)."""

from __future__ import annotations

from enum import StrEnum


class ModelProvider(StrEnum):
    """Upstream LLM provider family.

    - OPENAI: OpenAI native API (gpt-4o, gpt-4o-mini, ...).
    - ANTHROPIC: Anthropic native API (claude-sonnet-4.5, ...).
    - DEEPSEEK: DeepSeek native API (deepseek-chat, ...).
    - CUSTOM: any OpenAI-compatible endpoint (vLLM, Ollama, Azure, ...).
    - MOCK: deterministic in-process client used in dev / tests.
    """

    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    DEEPSEEK = "deepseek"
    CUSTOM = "custom"
    MOCK = "mock"


class RoutingStrategy(StrEnum):
    """How ``RoutingPolicy`` picks a primary + failover chain."""

    PRIORITY = "priority"  # honor primary_model_id; only fail over on error
    ROUND_ROBIN = "round_robin"  # cycle primary + failover
    COST_OPTIM = "cost_optim"  # pick cheapest in primary+failover
    LATENCY_OPTIM = "latency_optim"  # pick lowest observed p95
    TENANT_DEFAULT = "tenant_default"  # workspace-scoped override


class QuotaWindow(StrEnum):
    """Bucketing for ``QuotaCounter``."""

    MINUTE = "minute"
    HOUR = "hour"
    DAY = "day"


__all__ = ["ModelProvider", "QuotaWindow", "RoutingStrategy"]
