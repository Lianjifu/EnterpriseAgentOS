"""``ModelClientFactory`` implementation — provider → ``LLMClient``.

Mapping (per ``ModelProvider``):

- MOCK      → ``MockLLMClient`` (deterministic, dev/test default)
- OPENAI    → ``OpenAICompatibleClient`` (api.openai.com)
- DEEPSEEK  → ``OpenAICompatibleClient`` (api.deepseek.com)
- ANTHROPIC → ``OpenAICompatibleClient`` (api.anthropic.com; Anthropic
              exposes an OpenAI-compatible endpoint today)
- CUSTOM    → ``OpenAICompatibleClient`` (base_url from credential)

Plaintext ``api_key`` and ``base_url`` are passed in by the service
layer after cipher decryption; this factory never persists them.
"""

from __future__ import annotations

from dataclasses import dataclass

from eos_llm import LLMClient, MockLLMClient, OpenAICompatibleClient

from deos.modules.model.application.ports import ModelClientFactory
from deos.modules.model.domain.entities import Model
from deos.modules.model.domain.value_objects import ModelProvider


# Per-provider default ``base_url`` when the credential didn't carry one.
_PROVIDER_BASE_URLS: dict[ModelProvider, str] = {
    ModelProvider.OPENAI: "https://api.openai.com/v1",
    ModelProvider.ANTHROPIC: "https://api.anthropic.com/v1",
    ModelProvider.DEEPSEEK: "https://api.deepseek.com/v1",
}


@dataclass(slots=True, frozen=True)
class _DefaultClientFactory(ModelClientFactory):
    """Build an LLMClient per ``Model`` + decrypted credential."""

    request_timeout_seconds: float = 30.0

    def build(
        self,
        *,
        model: Model,
        api_key: str,
        base_url: str | None,
    ) -> LLMClient:
        if model.provider == ModelProvider.MOCK:
            return MockLLMClient()

        resolved_base_url = (
            base_url
            or _PROVIDER_BASE_URLS.get(model.provider)
            or "https://api.openai.com/v1"
        )
        return OpenAICompatibleClient(
            api_key=api_key,
            base_url=resolved_base_url,
            timeout_seconds=self.request_timeout_seconds,
        )


def build_default_client_factory(
    *, request_timeout_seconds: float = 30.0
) -> ModelClientFactory:
    """Factory-of-factories used by the composition container."""
    return _DefaultClientFactory(
        request_timeout_seconds=request_timeout_seconds
    )


__all__ = ["_DefaultClientFactory", "build_default_client_factory"]