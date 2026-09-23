"""Make the local `_in_memory.py` importable as a unique top-level module
named `_<dir>_in_memory` to avoid sys.path collisions when two modules
under `modules/` both have a `tests/unit/_in_memory.py`.

Each `tests/unit/conftest.py` registers its own copy under a distinct
alias (e.g. `_ar_in_memory` for agent_runtime, `_tool_in_memory` for
tool), and the test files in that directory import the alias.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_IN_MEMORY_PATH = _HERE / "_in_memory.py"
_ALIAS = "_ar_unit_in_memory"  # unique to agent_runtime/unit

if _ALIAS in sys.modules:
    del sys.modules[_ALIAS]
spec = importlib.util.spec_from_file_location(_ALIAS, _IN_MEMORY_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f"could not load spec for {_IN_MEMORY_PATH}")
mod = importlib.util.module_from_spec(spec)
sys.modules[_ALIAS] = mod
spec.loader.exec_module(mod)
