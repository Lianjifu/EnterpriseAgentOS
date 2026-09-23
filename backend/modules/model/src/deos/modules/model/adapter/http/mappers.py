"""HTTP DTO ↔ domain converters."""

from __future__ import annotations

from uuid import UUID

from eos_llm import ChatMessage, ChatRequest, ChatResponse

from deos.modules.model.adapter.http.dto import (
    CredentialResponse,
    InvokeRequest,
    InvokeResponse,
    ModelListResponse,
    ModelResponse,
    RoutingPolicyResponse,
)
from deos.modules.model.domain.entities import (
    Model,
    ModelCredential,
    RoutingPolicy,
)


def credential_to_response(c: ModelCredential) -> CredentialResponse:
    return CredentialResponse(
        id=UUID(str(c.id)),
        tenant_id=UUID(str(c.tenant_id)),
        provider=c.provider.value,
        label=c.label,
        key_version=c.key_version,
        created_at=c.created_at.isoformat(),
        rotated_at=c.rotated_at.isoformat() if c.rotated_at else None,
    )


def model_to_response(m: Model) -> ModelResponse:
    return ModelResponse(
        id=UUID(str(m.id)),
        tenant_id=UUID(str(m.tenant_id)),
        workspace_id=UUID(str(m.workspace_id)) if m.workspace_id else None,
        name=m.name,
        provider=m.provider.value,
        upstream_model=m.upstream_model,
        enabled=m.enabled,
        credential_id=UUID(str(m.credential_id)) if m.credential_id else None,
        routing_policy_id=UUID(str(m.routing_policy_id))
        if m.routing_policy_id
        else None,
        created_at=m.created_at.isoformat(),
        updated_at=m.updated_at.isoformat(),
    )


def model_list_to_response(items: list[Model]) -> ModelListResponse:
    return ModelListResponse(items=[model_to_response(m) for m in items])


def routing_policy_to_response(p: RoutingPolicy) -> RoutingPolicyResponse:
    return RoutingPolicyResponse(
        id=UUID(str(p.id)),
        tenant_id=UUID(str(p.tenant_id)),
        strategy=p.strategy.value,
        primary_model_id=UUID(str(p.primary_model_id)) if p.primary_model_id else None,
        failover_model_ids=[UUID(str(m)) for m in p.failover_model_ids],
        selection_rules=dict(p.selection_rules),
        version_lock=p.version_lock,
    )


def invoke_request_to_chat(req: InvokeRequest, upstream_model: str) -> ChatRequest:
    """Coerce the slim HTTP shape into the wire ``ChatRequest``."""
    messages: list[ChatMessage] = []
    for raw in req.messages:
        messages.append(
            ChatMessage(
                role=raw.get("role", "user"),  # type: ignore[arg-type]
                content=raw.get("content", ""),
                name=raw.get("name"),
                tool_call_id=raw.get("tool_call_id"),
                tool_calls=raw.get("tool_calls"),
            )
        )
    return ChatRequest(
        model=upstream_model,
        messages=messages,
        temperature=req.temperature,
        max_tokens=req.max_tokens,
    )


def chat_response_to_invoke(resp: ChatResponse) -> InvokeResponse:
    return InvokeResponse(
        model=resp.model,
        message={
            "role": resp.message.role,
            "content": resp.message.content,
            "name": resp.message.name,
        },
        finish_reason=resp.finish_reason,
        usage={
            "input_tokens": resp.usage.input_tokens,
            "output_tokens": resp.usage.output_tokens,
            "cache_read_tokens": resp.usage.cache_read_tokens,
            "cache_write_tokens": resp.usage.cache_write_tokens,
        },
    )


__all__ = [
    "chat_response_to_invoke",
    "credential_to_response",
    "invoke_request_to_chat",
    "model_list_to_response",
    "model_to_response",
    "routing_policy_to_response",
]
