"""WeChat Work (企业微信) inbound adapter — parses Wecom callback events.

Wecom delivers two kinds of messages to the configured callback URL:

- **Encrypted v1 stream events**: `{"encrypt":"<base64>"}` whose body
  is AES-CBC encrypted using the EncodingAESKey. P10 implements
  decryption; P6 returns a placeholder with `kind=encrypted`.
- **Plain XML callbacks**: legacy GET verification challenge +
  POST `<xml>...</xml>` envelopes.
"""

from __future__ import annotations

import json
from typing import Any

from deos.modules.channel.application.ports import InboundAdapter, ParsedMessage
from deos.modules.channel.domain.value_objects import ChannelType


class WeChatWorkInboundAdapter(InboundAdapter):
    channel_type = ChannelType.WECHATWORK

    def parse_webhook(
        self,
        *,
        body: bytes,
        headers: dict[str, str],
    ) -> ParsedMessage:
        text = body.decode("utf-8", errors="replace").strip()
        if not text:
            return ParsedMessage(
                external_user_id="wecom-empty",
                external_chat_id="wecom-empty",
                external_message_id=None,
                text="",
                metadata={"kind": "empty"},
            )

        # JSON v2 stream payload
        if text.startswith("{"):
            payload = _safe_json(text)
            if "encrypt" in payload:
                return ParsedMessage(
                    external_user_id="wecom-encrypted",
                    external_chat_id="wecom-encrypted",
                    external_message_id=None,
                    text="",
                    metadata={"kind": "encrypted"},
                )

        # Legacy XML v1 callback
        if text.startswith("<xml"):
            root = _safe_xml(body)
            from_user = root.get("FromUserName", "")
            chat_id = root.get("ChatId") or root.get("ToUserName", "")
            msg_id = root.get("MsgId") or root.get("MsgID")
            content = root.get("Content") or root.get("Content", "")
            return ParsedMessage(
                external_user_id=from_user,
                external_chat_id=chat_id,
                external_message_id=str(msg_id) if msg_id else None,
                text=content,
                metadata={
                    "msg_type": root.get("MsgType", "text"),
                    "agent_id": root.get("AgentID", ""),
                    "kind": "xml",
                },
            )

        return ParsedMessage(
            external_user_id="wecom-unknown",
            external_chat_id="wecom-unknown",
            external_message_id=None,
            text=text,
            metadata={"kind": "raw"},
        )


def _safe_json(text: str) -> dict[str, Any]:
    try:
        decoded = json.loads(text)
    except json.JSONDecodeError:
        return {}
    if not isinstance(decoded, dict):
        return {}
    return decoded


def _safe_xml(body: bytes) -> dict[str, str]:
    try:
        from defusedxml import ElementTree as DefusedET

        root = DefusedET.fromstring(body)  # type: ignore[arg-type]
    except DefusedET.ParseError:  # type: ignore[attr-defined]
        return {}
    return {child.tag: (child.text or "") for child in root}


__all__ = ["WeChatWorkInboundAdapter"]
