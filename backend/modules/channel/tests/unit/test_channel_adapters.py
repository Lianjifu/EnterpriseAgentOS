"""Adapter tests for channel module.

Covers:
- Feishu / DingTalk / WeChatWork / Web inbound adapter envelopes
- AES-GCM webhook cipher round-trip
"""

from __future__ import annotations

import pytest

from deos.modules.channel.adapter.crypto.webhook_cipher import (
    AesGcmWebhookCipher,
    build_cipher_from_env,
)
from deos.modules.channel.adapter.inbound import (
    DingTalkInboundAdapter,
    FeishuInboundAdapter,
    WebInboundAdapter,
    WeChatWorkInboundAdapter,
)

# ── Feishu ────────────────────────────────────────────────────────────────


def test_feishu_parses_text_message() -> None:
    body = (
        b'{"schema":"2.0","header":{"event_type":"im.message.received_v1",'
        b'"app_id":"cli_x","tenant_key":"t1"},"event":{"sender":'
        b'{"sender_id":{"user_id":"u_42","chat_id":"c_1"},"sender_type":"user"},'
        b'"message":{"message_id":"om_1","chat_id":"c_1","chat_type":"p2p",'
        b'"message_type":"text","content":"{\\"text\\":\\"hello\\"}"},'
        b'"tenant_key":"t1"}}'
    )
    msg = FeishuInboundAdapter().parse_webhook(body=body, headers={})
    assert msg.external_user_id == "u_42"
    assert msg.external_chat_id == "c_1"
    assert msg.external_message_id == "om_1"
    assert msg.text == "hello"
    assert msg.metadata["message_type"] == "text"


def test_feishu_parses_url_verification() -> None:
    body = b'{"type":"url_verification","challenge":"abc123","token":"t"}'
    msg = FeishuInboundAdapter().parse_webhook(body=body, headers={})
    assert msg.metadata["kind"] == "url_verification"
    assert msg.text == "abc123"


def test_feishu_handles_invalid_json() -> None:
    msg = FeishuInboundAdapter().parse_webhook(body=b"not json", headers={})
    assert msg.external_user_id == ""
    assert msg.text == ""


def test_feishu_handles_plain_string_content() -> None:
    body = (
        b'{"event":{"sender":{"sender_id":{"user_id":"u"}},"message":'
        b'{"message_id":"m1","chat_id":"c","content":"plain text"}}}'
    )
    msg = FeishuInboundAdapter().parse_webhook(body=body, headers={})
    assert msg.text == "plain text"


# ── DingTalk ─────────────────────────────────────────────────────────────


def test_dingtalk_parses_text_callback() -> None:
    body = (
        b'{"msgtype":"text","text":{"content":"hi"},"senderId":"u1",'
        b'"conversationId":"c1","msgId":"m1"}'
    )
    msg = DingTalkInboundAdapter().parse_webhook(body=body, headers={})
    assert msg.external_user_id == "u1"
    assert msg.external_chat_id == "c1"
    assert msg.external_message_id == "m1"
    assert msg.text == "hi"


def test_dingtalk_parses_encrypted_placeholder() -> None:
    body = b'{"encrypt":"aGVsbG8="}'
    msg = DingTalkInboundAdapter().parse_webhook(body=body, headers={})
    assert msg.metadata["kind"] == "encrypted"
    assert msg.text == ""


# ── WeChatWork ────────────────────────────────────────────────────────────


def test_wechatwork_parses_xml_callback() -> None:
    body = (
        b"<xml><ToUserName><![CDATA[corp]]></ToUserName>"
        b"<FromUserName><![CDATA[u1]]></FromUserName>"
        b"<CreateTime>1700000000</CreateTime>"
        b"<MsgType><![CDATA[text]]></MsgType>"
        b"<Content><![CDATA[hello world]]></Content>"
        b"<MsgId>123456</MsgId>"
        b"<AgentID>1</AgentID></xml>"
    )
    msg = WeChatWorkInboundAdapter().parse_webhook(body=body, headers={})
    assert msg.external_user_id == "u1"
    assert msg.external_chat_id == "corp"
    assert msg.external_message_id == "123456"
    assert msg.text == "hello world"


def test_wechatwork_parses_encrypted_placeholder() -> None:
    body = b'{"encrypt":"xxxxx"}'
    msg = WeChatWorkInboundAdapter().parse_webhook(body=body, headers={})
    assert msg.metadata["kind"] == "encrypted"


def test_wechatwork_handles_empty() -> None:
    msg = WeChatWorkInboundAdapter().parse_webhook(body=b"", headers={})
    assert msg.metadata["kind"] == "empty"


# ── Web ───────────────────────────────────────────────────────────────────


def test_web_parses_json_envelope() -> None:
    body = b'{"external_user_id":"u","external_chat_id":"c","text":"hi","metadata":{"k":"v"}}'
    msg = WebInboundAdapter().parse_webhook(body=body, headers={})
    assert msg.external_user_id == "u"
    assert msg.external_chat_id == "c"
    assert msg.text == "hi"
    assert msg.metadata["k"] == "v"


def test_web_handles_missing_fields() -> None:
    msg = WebInboundAdapter().parse_webhook(body=b"{}", headers={})
    assert msg.external_user_id == ""
    assert msg.text == ""


# ── Cipher ────────────────────────────────────────────────────────────────


def test_aes_gcm_cipher_round_trip() -> None:
    key = b"k" * 32
    cipher = AesGcmWebhookCipher(key=key, key_version=1)
    blob = cipher.encrypt(b"my-secret")
    assert blob != b"my-secret"
    assert cipher.decrypt(blob) == b"my-secret"


def test_aes_gcm_cipher_wrong_key_fails() -> None:
    from eos_vault.crypto.aes_gcm import InvalidCiphertext

    enc = AesGcmWebhookCipher(key=b"k" * 32)
    dec = AesGcmWebhookCipher(key=b"j" * 32)
    blob = enc.encrypt(b"my-secret")
    with pytest.raises(InvalidCiphertext):
        dec.decrypt(blob)


def test_build_cipher_from_env_accepts_hex() -> None:
    cipher = build_cipher_from_env(master_key_hex="00" * 32)
    assert cipher.key_version == 1
    blob = cipher.encrypt(b"hi")
    assert cipher.decrypt(blob) == b"hi"


def test_build_cipher_from_env_rejects_invalid_hex() -> None:
    with pytest.raises(ValueError):
        build_cipher_from_env(master_key_hex="not-hex")


def test_build_cipher_from_env_requires_key() -> None:
    with pytest.raises(ValueError):
        build_cipher_from_env()


def test_aes_gcm_cipher_rejects_bad_key_len() -> None:
    with pytest.raises(ValueError):
        AesGcmWebhookCipher(key=b"too-short")
