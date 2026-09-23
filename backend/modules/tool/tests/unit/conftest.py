"""Make the local `_in_memory.py` importable as a unique top-level module
named `_<dir>_in_memory` to avoid sys.path collisions when two modules
under `modules/` both have a `tests/unit/_in_memory.py`."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_IN_MEMORY_PATH = _HERE / "_in_memory.py"
_ALIAS = "_tool_unit_in_memory"  # unique to tool/unit

if _ALIAS in sys.modules:
    del sys.modules[_ALIAS]
spec = importlib.util.spec_from_file_location(_ALIAS, _IN_MEMORY_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f"could not load spec for {_IN_MEMORY_PATH}")
mod = importlib.util.module_from_spec(spec)
sys.modules[_ALIAS] = mod
spec.loader.exec_module(mod)
