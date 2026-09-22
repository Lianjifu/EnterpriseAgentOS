"""Channel domain errors.

Each error carries a stable ``code`` for the public API envelope and
inherits an HTTP status from ``eos_kernel.errors``. Use cases raise the
narrow subclass; the HTTP layer maps the status via
``eos_http.error_envelope_middleware``.
"""

from __future__ import annotations

from eos_kernel.errors import (
    AppError,
    AuthenticationError,
    ForbiddenError,
    NotFoundError,
)


class ChannelError(AppError):
    """Base for every channel-domain failure."""


class ChannelNotFound(ChannelError, NotFoundError):
    code = "CHANNEL_NOT_FOUND"


class ChannelDisabled(ChannelError, ForbiddenError):
    code = "CHANNEL_DISABLED"
    status = 403


class WebhookSignatureInvalid(ChannelError, AuthenticationError):
    code = "WEBHOOK_SIGNATURE_INVALID"
    status = 401


class WebhookTimestampSkew(ChannelError, AuthenticationError):
    code = "WEBHOOK_TIMESTAMP_SKEW"
    status = 401


class ChannelDeliveryFailed(ChannelError, AppError):
    code = "CHANNEL_DELIVERY_FAILED"
    status = 502


__all__ = [
    "ChannelDeliveryFailed",
    "ChannelDisabled",
    "ChannelError",
    "ChannelNotFound",
    "WebhookSignatureInvalid",
    "WebhookTimestampSkew",
]
