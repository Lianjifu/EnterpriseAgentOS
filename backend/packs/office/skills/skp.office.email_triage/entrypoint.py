"""Entry-point stub for ``skp.office.email_triage``.

Runtime behavior is a follow-up — A6 only signs + vets + registers the
pack.  The stub returns a deterministic placeholder so integration
tests that exercise the registration path have something to assert
against.
"""

from __future__ import annotations

import json
import sys


def main(argv: list[str]) -> dict:
    """Stub entrypoint. Reads JSON args from argv (last item or stdin).

    Real implementation will call the platform LLM client and return
    ``{"priority": ..., "category": ..., "suggested_reply": ...}``.
    """
    raw = argv[-1] if len(argv) > 1 else ""
    try:
        args = json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        args = {}
    body = args.get("email_body", "")
    return {
        "priority": "P2",
        "category": "uncategorized",
        "suggested_reply": f"acknowledged ({len(body)} chars)",
    }


if __name__ == "__main__":
    print(json.dumps(main(sys.argv)))