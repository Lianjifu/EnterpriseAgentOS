"""Root conftest.

Two jobs:

1. Its presence makes pytest treat each `modules/<name>/tests/` subtree as
   a separate package (because the collection root then has an
   `__init__.py`-bearing parent directory for each subtree), avoiding
   the `imported module 'unit.test_use_cases' has this __file__ attribute
   ... not the same as the test file we want to collect` collision when
   two modules both have `tests/unit/test_use_cases.py`.

2. Pre-register the per-module in-memory test helpers under unique
   sys.modules aliases (`_identity_unit_in_memory`, etc.) so test files
   can `from _identity_unit_in_memory import ...` without colliding
   across modules — the conftest-per-module approach fails because
   pytest, in the absence of an `__init__.py` chain above `modules/`,
   registers all `tests/unit/conftest.py` files under the same module
   name (`tests.unit.conftest`) and raises "Plugin already registered".
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parent


def _load(rel_dir: str, alias: str) -> None:
    """Load `<rel_dir>/_in_memory.py` under a unique top-level alias.

    Modules have evolved two naming conventions for the helper file:
    the legacy `_in_memory.py` (tool, skill) and the renamed per-module
    `_identity_in_memory.py` / `_memory_in_memory.py` /
    `_governance_in_memory.py` (identity, memory, governance).  Try both.
    """
    base = _BACKEND_ROOT / rel_dir
    candidates = [base / "_in_memory.py"]
    for stem in ("identity", "memory", "governance"):
        candidates.append(base / f"_{stem}_in_memory.py")
    for path in candidates:
        if path.exists():
            break
    else:
        return
    if alias in sys.modules:
        del sys.modules[alias]
    spec = importlib.util.spec_from_file_location(alias, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not load spec for {path}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[alias] = mod
    spec.loader.exec_module(mod)


for _rel, _alias in (
    ("modules/identity/tests/unit", "_identity_unit_in_memory"),
    ("modules/memory/tests/unit", "_memory_unit_in_memory"),
    ("modules/governance/tests/unit", "_governance_unit_in_memory"),
    ("modules/tool/tests/unit", "_tool_unit_in_memory"),
    ("modules/skill/tests/unit", "_skill_unit_in_memory"),
    ("modules/agent_runtime/tests/unit", "_agent_runtime_unit_in_memory"),
):
    _load(_rel, _alias)