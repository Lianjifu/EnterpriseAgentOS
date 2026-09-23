"""Orchestration domain errors.

All descend from :class:`OrchestrationError` (:class:`AppError`) so they
map cleanly through ``eos_http.error_envelope`` to RFC-9457 problem
responses.
"""

from __future__ import annotations

from eos_kernel.errors import AppError, ConflictError, ForbiddenError, NotFoundError


class OrchestrationError(AppError):
    """Base for all orchestration-module errors."""


class PlanNotFound(OrchestrationError, NotFoundError):
    code = "PLAN_NOT_FOUND"


class WorkflowRunNotFound(OrchestrationError, NotFoundError):
    code = "WORKFLOW_RUN_NOT_FOUND"


class StepRunNotFound(OrchestrationError, NotFoundError):
    code = "STEP_RUN_NOT_FOUND"


class PlanValidationError(OrchestrationError):
    """Raised by :class:`PlanRepository` when the DSL itself is malformed.

    Surfaces as 422 — invalid plan structure, missing required fields,
    invalid template references, etc.  Distinct from
    :class:`OrchestrationPolicyDenied` (governance rejection).
    """

    code = "INVALID_PLAN_DSL"
    status = 422


class PlanNameConflict(OrchestrationError, ConflictError):
    code = "PLAN_NAME_CONFLICT"
    status = 409


class WorkflowTooLarge(OrchestrationError):
    """Raised when ``step_counter`` would exceed ``StepLimits.max_total_steps``.

    Prevents Plan recursion from blowing the executor stack and bounds
    LLM cost on untrusted input.  Surfaces as 422 because it is a plan
    authoring error.
    """

    code = "WORKFLOW_TOO_LARGE"
    status = 422


class WorkflowStepTimeout(OrchestrationError):
    """Raised when a single step exceeds its timeout."""

    code = "WORKFLOW_STEP_TIMEOUT"
    status = 504


class WorkflowExecutionFailed(OrchestrationError):
    """Raised by the executor when a step fails (after policy + retries)."""

    code = "WORKFLOW_EXECUTION_FAILED"
    status = 500


class WorkflowCanceled(OrchestrationError):
    """Raised when the run was canceled mid-flight."""

    code = "WORKFLOW_CANCELED"
    status = 409


class OrchestrationPolicyDenied(OrchestrationError, ForbiddenError):
    """Raised when the policy_guard denies the workflow run."""

    code = "POLICY_DENIED"
    status = 403


class InvalidConditionExpression(OrchestrationError):
    """Raised when the condition evaluator cannot parse / evaluate ``when``."""

    code = "INVALID_CONDITION_EXPRESSION"
    status = 422


class IdempotencyKeyConflict(OrchestrationError, ConflictError):
    """Raised when a second run with the same idempotency_key is requested
    but the first run has not yet produced a stable output.

    Surfaces as 409 — the caller should poll the existing run.
    """

    code = "IDEMPOTENCY_KEY_IN_USE"
    status = 409


class PlanSignatureInvalid(OrchestrationError):
    """Plan pack signature missing / malformed / failed verification."""

    code = "PLAN_SIGNATURE_INVALID"
    status = 422


class PlanSignerUntrusted(OrchestrationError):
    """Signing key is not in the workspace's trust store."""

    code = "PLAN_SIGNER_UNTRUSTED"
    status = 403


class PlanImageDigestMismatch(OrchestrationError):
    """``image_digest`` does not match the digest that was signed."""

    code = "PLAN_IMAGE_DIGEST_MISMATCH"
    status = 422


__all__ = [
    "IdempotencyKeyConflict",
    "InvalidConditionExpression",
    "OrchestrationError",
    "OrchestrationPolicyDenied",
    "PlanImageDigestMismatch",
    "PlanNameConflict",
    "PlanNotFound",
    "PlanSignatureInvalid",
    "PlanSignerUntrusted",
    "PlanValidationError",
    "StepRunNotFound",
    "WorkflowCanceled",
    "WorkflowExecutionFailed",
    "WorkflowRunNotFound",
    "WorkflowStepTimeout",
    "WorkflowTooLarge",
]
