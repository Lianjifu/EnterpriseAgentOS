#!/usr/bin/env bash
# EAOS stack environment.
# Distinct from digital-employee-platform dev-stack:
#   * EAOS_-prefixed vars (no DE_*)
#   * EAOS-specific ports (5200 frontend / 9200 gateway / 8200 eos-app / 5434 pg)
#   * EAOS-owned log directory
# Source this file before invoking eaos-gateway.py / Vite / eos-app.

export EAOS_STACK_ROOT="${EAOS_STACK_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
export EAOS_LOG_DIR="${EAOS_LOG_DIR:-$EAOS_STACK_ROOT/logs}"

# ── Frontend (Vite) ───────────────────────────────────────────────────
export EAOS_FRONTEND_PORT="${EAOS_FRONTEND_PORT:-5200}"
export EAOS_FRONTEND_HOST="${EAOS_FRONTEND_HOST:-127.0.0.1}"
export EAOS_VITE_PROXY_TARGET="${EAOS_VITE_PROXY_TARGET:-http://127.0.0.1:${EAOS_BACKEND_PORT:-9200}}"

# ── Backend gateway (this script) ─────────────────────────────────────
export EAOS_LISTEN_PORT="${EAOS_LISTEN_PORT:-9200}"
export EAOS_BACKEND_HOST="${EAOS_BACKEND_HOST:-127.0.0.1}"
# default backend is still the de-app Go binary until eos-app replaces it
export EAOS_BACKEND_PORT="${EAOS_BACKEND_PORT:-8100}"

# ── eos-app (Python) — when/if we start it instead of de-app ─────────
export EAOS_EOSAPP_PORT="${EAOS_EOSAPP_PORT:-8200}"
export EAOS_EOSAPP_HOST="${EAOS_EOSAPP_HOST:-127.0.0.1}"
# Path prefixes the gateway forwards to eos-app instead of de-app.
# Frontend pathMap translates /api/identity/* → /v1/identity/*, so any
# /v1/identity/* traffic should reach the eos-app identity router.
# Comma-separated; default = identity only (other modules still de-app).
export EAOS_EOSAPP_PATH_PREFIXES="${EAOS_EOSAPP_PATH_PREFIXES:-/v1/identity,/api/admin,/api/catalog,/api/user/skills,/api/knowledge}"

# ── Postgres (eaos-specific, separate from de-app's :5432) ────────────
export EAOS_PG_PORT="${EAOS_PG_PORT:-5434}"
export EAOS_DATABASE_URL="${EAOS_DATABASE_URL:-postgresql+asyncpg://postgres:postgres@127.0.0.1:${EAOS_PG_PORT}/eaos_dev}"

# ── de-app interop (so eos-app-side tests can call de-app if needed) ─
# Only set if backend is de-app. These mirror what digital-employee-platform
# sets in run-stack.sh but with EAOS_ names.
export EAOS_DEAPP_BIN="${EAOS_DEAPP_BIN:-/Users/LIANJIFU/ops/digital-employee-platform/backend/bin/de-app}"
export EAOS_DESKILL_RUNTIME_URL="${EAOS_DESKILL_RUNTIME_URL:-http://127.0.0.1:8093}"
export EAOS_DEWORKFLOW_URL="${EAOS_DEWORKFLOW_URL:-http://127.0.0.1:8103}"
export EAOS_DESKILL_BIN="${EAOS_DESKILL_BIN:-/Users/LIANJIFU/ops/digital-employee-platform/backend/builtin/skills/runtime/bin}"

# de-app env (mapped to DE_* for the binary)
export DE_ENV="${DE_ENV:-development}"
export DE_DATABASE_URL="${DE_DATABASE_URL:-postgres://de:de@127.0.0.1:5432/digital_employee?sslmode=disable}"
export DE_PUBLIC_BASE_URL="${DE_PUBLIC_BASE_URL:-http://127.0.0.1:${EAOS_LISTEN_PORT}}"
export DE_RUNTIME_MODE="${DE_RUNTIME_MODE:-local}"
export DE_SKILL_RUNTIME_URL="${DE_SKILL_RUNTIME_URL:-$EAOS_DESKILL_RUNTIME_URL}"
export DE_WORKFLOW_URL="${DE_WORKFLOW_URL:-$EAOS_DEWORKFLOW_URL}"
export DE_BUILTIN_SKILL_BIN="${DE_BUILTIN_SKILL_BIN:-$EAOS_DESKILL_BIN}"
export DE_EMBEDDED_CHAT="${DE_EMBEDDED_CHAT:-0}"
export DE_MODEL_CANDIDATE_TIMEOUT="${DE_MODEL_CANDIDATE_TIMEOUT:-45}"
export DE_COPILOT_STREAM_TIMEOUT="${DE_COPILOT_STREAM_TIMEOUT:-300}"
export PATH="$EAOS_DESKILL_BIN:$PATH"