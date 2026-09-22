"""WeChat Work outbound adapter — application message send.

P10 implements the full ``/cgi-bin/message/send`` flow with
EncodingAESKey and the encrypted XML envelope. P6 ships a stub that
raises ``ChannelDeliveryFailed`` until the corp credentials are wired
in. The HTTP signature uses ``access_token`` from
``/cgi-bin/gettoken``; without a corp_id + corp_secret the adapter
cannot send and surfaces that as a structured delivery failure.
"""

from __future__ import annotations

from typing import Any

from deos.modules.channel.application.ports import OutboundAdapter
from deos.modules.channel.domain.errors import ChannelDeliveryFailed
from deos.modules.channel.domain.value_objects import ChannelType


class WeChatWorkOutboundAdapter(OutboundAdapter):
    channel_type = ChannelType.WECHATWORK

    def __init__(
        self,
        *,
        corp_id: str = "",
        corp_secret: str = "",
        agent_id: str = "",
    ) -> None:
        self._corp_id = corp_id
        self._corp_secret = corp_secret
        self._agent_id = agent_id

    async def send_reply(
        self,
        *,
        external_chat_id: str,
        text: str,
        metadata: dict[str, Any],
    ) -> str | None:
        # P10: implement access_token cache + encrypted XML envelope.
        raise ChannelDeliveryFailed(
            "wechatwork outbound not configured (set corp_id/corp_secret/agent_id)",
            code="CHANNEL_DELIVERY_FAILED",
        )


__all__ = ["WeChatWorkOutboundAdapter"]
