#!/usr/bin/env bash
# Production entrypoint. Boots the FastAPI app via gunicorn (multi-worker
# prod profile) or uvicorn (single-worker sandbox / local path).
#
# Worker policy:
#   - EOS_GUNICORN_WORKERS=1 → uvicorn directly (single event loop, ~150
#     MB lighter than gunicorn's 4-worker fork). Used by staging sandbox
#     and any single-pod deployment. Skips the gunicorn master process.
#   - otherwise → gunicorn with EOS_GUNICORN_WORKERS workers (default 4,
#     prod stable/canary pools).
#
# EOS_RING env distinguishes role (defaults to stable).
set -euo pipefail

WORKERS="${EOS_GUNICORN_WORKERS:-4}"
THREADS="${EOS_GUNICORN_THREADS:-2}"
BIND="${EOS_GUNICORN_BIND:-0.0.0.0:8102}"
TIMEOUT="${EOS_GUNICORN_TIMEOUT:-60}"

# Split host:port once; tolerate either form.
HOST="${BIND%:*}"
PORT="${BIND##*:}"
[[ "$HOST" == "$BIND" ]] && HOST="0.0.0.0" && PORT="$BIND"

echo "[entrypoint] EOS_RING=${EOS_RING:-stable} workers=${WORKERS} bind=${HOST}:${PORT}"

if [[ "${WORKERS}" == "1" ]]; then
    # Single-worker sandbox path — skip gunicorn master overhead.
    exec uvicorn deos.composition.main:create_app \
        --host "${HOST}" \
        --port "${PORT}" \
        --factory \
        --timeout-graceful-shutdown 30 \
        --proxy-headers \
        --forwarded-allow-ips='*'
else
    exec gunicorn deos.composition.main:create_app \
        --bind "${HOST}:${PORT}" \
        --workers "${WORKERS}" \
        --threads "${THREADS}" \
        --worker-class uvicorn.workers.UvicornWorker \
        --timeout "${TIMEOUT}" \
        --graceful-timeout 30 \
        --keep-alive 5 \
        --access-logfile - \
        --error-logfile - \
        --no-server-header \
        --forwarded-allow-ips='*' \
        --proxy-protocol \
        --factory
fi