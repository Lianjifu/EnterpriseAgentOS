"""Model module — error hierarchy."""

from __future__ import annotations

from eos_kernel.errors import (
    AppError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)


class ModelError(AppError):
    """Base for all model domain errors."""


class ModelNotFound(ModelError, NotFoundError):
    code = "MODEL_NOT_FOUND"
    status = 404


class ModelAlreadyExists(ModelError, ConflictError):
    code = "MODEL_ALREADY_EXISTS"
    status = 409


class ModelDisabled(ModelError, ForbiddenError):
    code = "MODEL_DISABLED"
    status = 403


class CredentialNotFound(ModelError, NotFoundError):
    code = "CREDENTIAL_NOT_FOUND"
    status = 404


class RoutingPolicyNotFound(ModelError, NotFoundError):
    code = "ROUTING_POLICY_NOT_FOUND"
    status = 404


class QuotaExceeded(ModelError, ForbiddenError):
    """Model usage for the current window exceeded the configured cap.

    The HTTP layer maps this to 429 — clients should retry after the
    next window boundary (typically 1 minute).
    """

    code = "QUOTA_EXCEEDED"
    status = 429


class InvalidModelSpec(ModelError, ValidationError):
    code = "INVALID_MODEL_SPEC"
    status = 422


__all__ = [
    "CredentialNotFound",
    "InvalidModelSpec",
    "ModelAlreadyExists",
    "ModelDisabled",
    "ModelError",
    "ModelNotFound",
    "QuotaExceeded",
    "RoutingPolicyNotFound",
]