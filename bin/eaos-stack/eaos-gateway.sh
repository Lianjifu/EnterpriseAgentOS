#!/usr/bin/env bash
# Wrapper to launch eaos-gateway.py with the right env.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/eaos-env.sh"
exec python3 "$HERE/eaos-gateway.py"