"""Entry-point stub for ``skp.office.search_assistant``.

A6 only signs + vets + registers the pack.  Real RAG synthesis is a
follow-up; the stub returns a placeholder ranking so the registration
path is end-to-end testable.
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
    query = args.get("query", "")
    top_k = int(args.get("top_k", 5))
    return {
        "results": [
            {"rank": i + 1, "score": 1.0 / (i + 1), "snippet": f"hit {i + 1} for {query!r}"}
            for i in range(top_k)
        ]
    }


if __name__ == "__main__":
    print(json.dumps(main(sys.argv)))