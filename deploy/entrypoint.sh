#!/usr/bin/env bash
# Production entrypoint. Boots gunicorn for stable / canary instances.
# EOS_RING env distinguishes role (defaults to stable).
set -euo pipefail

WORKERS="${EOS_GUNICORN_WORKERS:-4}"
THREADS="${EOS_GUNICORN_THREADS:-2}"
BIND="${EOS_GUNICORN_BIND:-0.0.0.0:8102}"
TIMEOUT="${EOS_GUNICORN_TIMEOUT:-60}"

echo "[entrypoint] EOS_RING=${EOS_RING:-stable} workers=${WORKERS} bind=${BIND}"

exec gunicorn deos.composition.main:create_app \
    --bind "${BIND}" \
    --workers "${WORKERS}" \
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
