"""Knowledge domain errors.

All errors descend from :class:`KnowledgeError` (which is an
:class:`AppError`) so they map cleanly through ``eos_http.error_envelope``
to RFC-9457 problem responses.
"""

from __future__ import annotations

from eos_kernel.errors import AppError, ConflictError, NotFoundError


class KnowledgeError(AppError):
    """Base for all knowledge-module errors."""


class KnowledgePackageNotFound(KnowledgeError, NotFoundError):
    code = "KNOWLEDGE_PACKAGE_NOT_FOUND"


class KnowledgeAssetNotFound(KnowledgeError, NotFoundError):
    code = "KNOWLEDGE_ASSET_NOT_FOUND"


class KnowledgeChunkNotFound(KnowledgeError, NotFoundError):
    code = "KNOWLEDGE_CHUNK_NOT_FOUND"


class KnowledgeValidationError(KnowledgeError):
    code = "INVALID_KNOWLEDGE_SPEC"
    status = 422


class KnowledgeAlreadyRevoked(KnowledgeError, ConflictError):
    code = "KNOWLEDGE_ALREADY_REVOKED"
    status = 409


class KnowledgePackageNameConflict(KnowledgeError, ConflictError):
    code = "KNOWLEDGE_PACKAGE_NAME_CONFLICT"
    status = 409


class KnowledgeSignatureInvalid(KnowledgeError):
    """Knowledge pack signature missing / malformed / failed verification."""

    code = "KNOWLEDGE_SIGNATURE_INVALID"
    status = 422


class KnowledgeSignerUntrusted(KnowledgeError):
    """Signing key is not in the workspace's trust store."""

    code = "KNOWLEDGE_SIGNER_UNTRUSTED"
    status = 403


class KnowledgeImageDigestMismatch(KnowledgeError):
    """``image_digest`` does not match the digest that was signed."""

    code = "KNOWLEDGE_IMAGE_DIGEST_MISMATCH"
    status = 422


__all__ = [
    "KnowledgeAlreadyRevoked",
    "KnowledgeAssetNotFound",
    "KnowledgeChunkNotFound",
    "KnowledgeError",
    "KnowledgeImageDigestMismatch",
    "KnowledgePackageNameConflict",
    "KnowledgePackageNotFound",
    "KnowledgeSignatureInvalid",
    "KnowledgeSignerUntrusted",
    "KnowledgeValidationError",
]
