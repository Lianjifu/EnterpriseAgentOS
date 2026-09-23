"""Skill domain errors.

All errors inherit `AppError` so the HTTP error envelope middleware
maps them to RFC-9457 envelopes with the right `code` + `status`.
`SkillNotFound` / `SkillInvocationNotFound` / `SkillArtifactNotFound`
also subclass `NotFoundError` for the 404 wire code.
"""

from __future__ import annotations

from eos_kernel.errors import AppError, ConflictError, NotFoundError


class SkillError(AppError):
    """Base for all skill errors."""


class SkillNotFound(SkillError, NotFoundError):
    code = "SKILL_NOT_FOUND"


class SkillAlreadyExists(SkillError, ConflictError):
    code = "SKILL_ALREADY_EXISTS"


class SkillVersionMismatch(SkillError):
    code = "SKILL_VERSION_MISMATCH"

    def __init__(self, *, expected: int, actual: int) -> None:
        super().__init__(
            f"skill version_lock mismatch: expected={expected} actual={actual}",
            code=self.code,
            status=412,
        )


class SkillDisabled(SkillError):
    code = "SKILL_DISABLED"
    status = 409


class InvalidSkillSpec(SkillError):
    code = "INVALID_SKILL_SPEC"
    status = 422


class SkillInstallFailed(SkillError):
    code = "SKILL_INSTALL_FAILED"
    status = 422


class SkillInvocationNotFound(SkillError, NotFoundError):
    code = "SKILL_INVOCATION_NOT_FOUND"


class SkillInvocationAlreadyTerminal(SkillError, ConflictError):
    code = "SKILL_INVOCATION_ALREADY_TERMINAL"


class SkillCancelled(SkillError):
    code = "SKILL_CANCELLED"

    def __init__(self) -> None:
        super().__init__("skill invocation cancelled", code=self.code, status=200)


class SandboxTimeout(SkillError):
    code = "SANDBOX_TIMEOUT"
    status = 504


class SkillArtifactNotFound(SkillError, NotFoundError):
    code = "SKILL_ARTIFACT_NOT_FOUND"
