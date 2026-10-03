"""Skill errors aligned with the admin skills UI."""

from __future__ import annotations

from eos_kernel.errors import AppError, NotFoundError


class SkillError(AppError):
    """Base for skill catalog errors."""


class SkillNotFound(SkillError, NotFoundError):
    code = "SKILL_NOT_FOUND"


class SkillDisabled(SkillError):
    code = "SKILL_DISABLED"
    status = 409


__all__ = ["SkillDisabled", "SkillError", "SkillNotFound"]
