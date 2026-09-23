# Enterprise-Agent-OS — prod runtime image
# Multi-stage build: deps via uv sync --no-dev, gunicorn for prod.

FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/backend/src \
    EOS_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 libssl3 curl tini \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv gunicorn

WORKDIR /app

# 1. copy workspace metadata first to maximize Docker layer cache
COPY backend/pyproject.toml backend/uv.lock /app/backend/

# 2. copy sources (libs + modules + composition + runtimes + migrations)
COPY backend/libs       /app/backend/libs
COPY backend/modules    /app/backend/modules
COPY backend/composition /app/backend/composition
COPY backend/migrations /app/backend/migrations
COPY backend/runtimes   /app/backend/runtimes

# 3. install deps (no-dev, frozen lock)
WORKDIR /app/backend
RUN uv sync --no-dev --frozen --no-install-project || \
    uv sync --no-dev --frozen

COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /app

EXPOSE 8102

HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
    CMD curl -fsS http://localhost:8102/livez || exit 1

ENTRYPOINT ["/usr/bin/tini", "--", "/entrypoint.sh"]
