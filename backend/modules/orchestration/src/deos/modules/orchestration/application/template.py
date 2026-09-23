"""String-template renderer.

Supports two lookup prefixes:

- ``${variables.<key>}`` — run-level variables
- ``${steps.<step_id>.output.<key>}`` — structured output from earlier
  steps in the same run

Anything else raises :class:`PlanValidationError`.  The renderer never
calls ``eval``; it walks the placeholder tokens and resolves them
against the supplied context map directly.
"""

from __future__ import annotations

import re
from typing import Any

from deos.modules.orchestration.domain.errors import PlanValidationError

__all__ = ["StringTemplateRenderer"]


_PLACEHOLDER = re.compile(r"\$\{([^{}]+)\}")


class StringTemplateRenderer:
    """v1 template renderer — strict, no ``eval``, no attribute access."""

    def render(
        self,
        *,
        template: str,
        context: dict[str, Any],
    ) -> str:
        def _resolve(token: str) -> str:
            token = token.strip()
            parts = token.split(".")
            if not parts:
                raise PlanValidationError("empty placeholder")
            if parts[0] == "variables":
                if len(parts) < 2:
                    raise PlanValidationError(
                        f"placeholder ${{{token}}} missing variable key"
                    )
                key = parts[1]
                if key not in context.get("variables", {}):
                    raise PlanValidationError(
                        f"variable {key!r} referenced but not supplied"
                    )
                value = context["variables"][key]
                return _format(value, parts[2:])
            if parts[0] == "steps":
                if len(parts) < 4 or parts[2] != "output":
                    raise PlanValidationError(
                        f"placeholder ${{{token}}} must be steps.<id>.output.<key>"
                    )
                step_id = parts[1]
                output_key = parts[3]
                steps_out = context.get("steps", {})
                if step_id not in steps_out:
                    raise PlanValidationError(
                        f"step {step_id!r} has no recorded output "
                        f"(referenced from placeholder ${{{token}}})"
                    )
                step_output = steps_out[step_id].get("output", {})
                if output_key not in step_output:
                    raise PlanValidationError(
                        f"step {step_id!r} output has no key {output_key!r}"
                    )
                value = step_output[output_key]
                return _format(value, parts[4:])
            raise PlanValidationError(
                f"unknown placeholder prefix {parts[0]!r} in ${{{token}}}"
            )

        def _sub(match: re.Match[str]) -> str:
            return _resolve(match.group(1))

        try:
            return _PLACEHOLDER.sub(_sub, template)
        except PlanValidationError:
            raise
        except Exception as exc:
            raise PlanValidationError(f"template render failed: {exc}") from exc

    def render_object(
        self,
        *,
        template_obj: Any,
        context: dict[str, Any],
    ) -> Any:
        if isinstance(template_obj, str):
            return self.render(template=template_obj, context=context)
        if isinstance(template_obj, dict):
            return {
                k: self.render_object(template_obj=v, context=context)
                for k, v in template_obj.items()
            }
        if isinstance(template_obj, list):
            return [
                self.render_object(template_obj=v, context=context)
                for v in template_obj
            ]
        if isinstance(template_obj, (int, float, bool)) or template_obj is None:
            return template_obj
        raise PlanValidationError(
            f"cannot template-render value of type {type(template_obj).__name__}"
        )


def _format(value: Any, rest: list[str]) -> str:
    """Format ``value`` (optionally descended by ``rest`` keys) as a string."""
    for key in rest:
        if isinstance(value, dict):
            if key not in value:
                raise PlanValidationError(f"path key {key!r} not found")
            value = value[key]
        else:
            raise PlanValidationError(
                f"cannot descend into {type(value).__name__} via {key!r}"
            )
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float, bool)):
        return str(value)
    raise PlanValidationError(
        f"cannot format value of type {type(value).__name__} as placeholder"
    )
