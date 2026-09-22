"""Inbound adapters — translate raw webhook envelopes into ``ParsedMessage``.

Each adapter implements ``InboundAdapter`` (Protocol) and is registered
in a dict keyed by ``ChannelType``. The HTTP router resolves the
adapter per-channel and hands the parsed payload to ``ChannelService``.
"""

from __future__ import annotations

from deos.modules.channel.adapter.inbound.dingtalk import DingTalkInboundAdapter
from deos.modules.channel.adapter.inbound.feishu import FeishuInboundAdapter
from deos.modules.channel.adapter.inbound.web import WebInboundAdapter
from deos.modules.channel.adapter.inbound.wechatwork import WeChatWorkInboundAdapter

__all__ = [
    "DingTalkInboundAdapter",
    "FeishuInboundAdapter",
    "WeChatWorkInboundAdapter",
    "WebInboundAdapter",
]
