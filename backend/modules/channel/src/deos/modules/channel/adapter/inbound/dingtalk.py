"""DingTalk inbound adapter — parses DingTalk Open Platform event envelope.

DingTalk delivers two kinds of payloads to the webhook:

- **Encrypted v2 stream events**: `{"encrypt":"<base64>"}` whose body
  is AES-CBC encrypted with the app secret-derived key. P10 supports
  decryption; P6 returns a placeholder with `kind=encrypted`.
- **Plain callback events**: `{"msgtype":"text","text":{"content":...},
  "senderId":"...","conversationId":"..."}`.
"""

from __future__ import annotations

import base64
import json
from typing import Any

from deos.modules.channel.application.ports import InboundAdapter, ParsedMessage
from deos.modules.channel.domain.value_objects import ChannelType


class DingTalkInboundAdapter(InboundAdapter):
    channel_type = ChannelType.DINGTALK

    def parse_webhook(
        self,
        *,
        body: bytes,
        headers: dict[str, str],
    ) -> ParsedMessage:
        payload = _safe_json(body)

        # Stream v2 encryption — placeholder; P10 implements decryption.
        if "encrypt" in payload and isinstance(payload.get("encrypt"), str):
            try:
                base64.b64decode(payload["encrypt"], validate=False)
            except Exception:
                pass
            return ParsedMessage(
                external_user_id="dingtalk-encrypted",
                external_chat_id="dingtalk-encrypted",
                external_message_id=None,
                text="",
                metadata={
                    "kind": "encrypted",
                    "raw_len": len(payload["encrypt"]),
                },
            )

        msg_type = payload.get("msgtype", "text")
        text = _extract_text(payload)
        sender_id = str(payload.get("senderId") or payload.get("senderStaffId") or "")
        chat_id = str(
            payload.get("conversationId")
            or payload.get("chatId")
            or payload.get("openConversationId")
            or ""
        )
        msg_id = payload.get("msgId") or payload.get("messageId")

        return ParsedMessage(
            external_user_id=sender_id,
            external_chat_id=chat_id,
            external_message_id=str(msg_id) if msg_id else None,
            text=text,
            metadata={
                "msg_type": msg_type,
                "conversation_type": payload.get("conversationType", ""),
                "robot_code": payload.get("robotCode", ""),
            },
        )


def _safe_json(body: bytes) -> dict[str, Any]:
    if not body:
        return {}
    try:
        decoded = json.loads(body)
    except json.JSONDecodeError:
        return {}
    if not isinstance(decoded, dict):
        return {}
    return decoded


def _extract_text(payload: dict[str, Any]) -> str:
    msg_type = payload.get("msgtype", "text")
    body = payload.get(msg_type) or {}
    if isinstance(body, dict):
        return str(body.get("content", ""))
    if isinstance(body, str):
        return body
    return str(payload.get("text", {}).get("content", ""))


__all__ = ["DingTalkInboundAdapter"]
