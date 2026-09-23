"""Memory domain errors.

All errors descend from :class:`MemoryError` (which is an
:class:`AppError`) so they map cleanly through ``eos_http.error_envelope``
to RFC-9457 problem responses.
"""

from __future__ import annotations

from eos_kernel.errors import AppError, ConflictError, NotFoundError


class MemoryError(AppError):
    """Base for all memory-module errors."""


class MemoryNotFound(MemoryError, NotFoundError):
    code = "MEMORY_NOT_FOUND"


class MemoryExpired(MemoryError, NotFoundError):
    code = "MEMORY_EXPIRED"


class MemoryAlreadyRevoked(MemoryError, ConflictError):
    code = "MEMORY_ALREADY_REVOKED"
    status = 409


class InvalidMemorySpec(MemoryError):
    code = "INVALID_MEMORY_SPEC"
    status = 422


__all__ = [
    "InvalidMemorySpec",
    "MemoryAlreadyRevoked",
    "MemoryError",
    "MemoryExpired",
    "MemoryNotFound",
]
