"""Entry-point stub for ``skp.office.doc_summarizer``.

A6 only signs + vets + registers the pack.  Real summarisation is a
follow-up; the stub returns a placeholder so the registration path is
end-to-end testable.
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
    text = args.get("document_text", "")
    max_chars = int(args.get("max_tldr_chars", 280))
    body = text[:max_chars]
    return {
        "tldr": body[:max_chars] + ("…" if len(body) > max_chars else ""),
        "action_items": [],
    }


if __name__ == "__main__":
    print(json.dumps(main(sys.argv)))