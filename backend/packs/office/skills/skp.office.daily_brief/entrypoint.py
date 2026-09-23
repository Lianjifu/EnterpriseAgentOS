"""Entry-point stub for ``skp.office.daily_brief``.

A6 only signs + vets + registers the pack; runtime aggregation is a
follow-up.  The stub returns a placeholder markdown body so the
HTTP smoke tests have something to assert.
"""

from __future__ import annotations

import json
import sys


def main(argv: list[str]) -> dict:
    raw = argv[-1] if len(argv) > 1 else ""
    try:
        args = json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        args = {}
    events = args.get("events") or []
    return {
        "markdown": f"# Daily Brief\n\n- {len(events)} events summarised\n",
        "headline": "all quiet",
    }


if __name__ == "__main__":
    print(json.dumps(main(sys.argv)))
