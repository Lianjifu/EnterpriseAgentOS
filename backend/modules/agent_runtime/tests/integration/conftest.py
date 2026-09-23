"""Same as ../unit/conftest.py for the integration suite."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_IN_MEMORY_PATH = _HERE.parent / "unit" / "_in_memory.py"
_ALIAS = "_ar_unit_in_memory"  # reuse the unit suite's alias

if _ALIAS not in sys.modules:
    spec = importlib.util.spec_from_file_location(_ALIAS, _IN_MEMORY_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not load spec for {_IN_MEMORY_PATH}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[_ALIAS] = mod
    spec.loader.exec_module(mod)
