#!/usr/bin/env bash
# Staging sandbox — single-machine, two containers.
# No compose, no ingress, no canary, no MinIO, no Vault / k8s.
# Run from the repo root.
#
# Stages mirrored from doc/burn-in-preflight.md:
#   A.1  docker build  (re-uses infra/docker/Dockerfile.app)
#   A.5  POSTGRES_DB / EOS_RING  (env-file only — no ConfigMap)
#   A.6  image stays on the host daemon (no registry push)
#   A.7  docker exec alembic upgrade head
#   A.2  env values for *secrets* live in deploy/env.staging (gitignored)
#
# Usage:
#   ./deploy/run-staging.sh           # builds + starts + migrates
#   ./deploy/run-staging.sh stop      # tears down both containers
#   ./deploy/run-staging.sh logs      # tails app log
set -euo pipefail
cd "$(dirname "$0")/.."

cmd="${1:-up}"

# ── stop ────────────────────────────────────────────────────────────────────
if [[ "$cmd" == "stop" ]]; then
    docker rm -f eos-app eos-postgres 2>/dev/null || true
    docker network rm eos-staging 2>/dev/null || true
    echo "[run-staging] stopped"
    exit 0
fi

# ── logs ────────────────────────────────────────────────────────────────────
if [[ "$cmd" == "logs" ]]; then
    docker logs -f eos-app
    exit 0
fi

# ── up ──────────────────────────────────────────────────────────────────────

# 0. env file (gitignored)
if [[ ! -f deploy/env.staging ]]; then
    cp deploy/env.staging.example deploy/env.staging
    echo "[run-staging] created deploy/env.staging — review and re-run"
    exit 0
fi

# 1. build app image
echo "[run-staging] building eos-app:prod"
docker build -t eos-app:prod -f infra/docker/Dockerfile.app .

# 2. bridge network so the app can reach the postgres container by name
docker network create eos-staging >/dev/null 2>&1 || true

# 3. postgres
echo "[run-staging] starting postgres"
docker rm -f eos-postgres 2>/dev/null || true
docker run -d --name eos-postgres --network eos-staging \
    -e POSTGRES_DB=eos \
    -e POSTGRES_USER=eos \
    -e POSTGRES_PASSWORD=eos \
    -v eos-pgdata:/var/lib/postgresql/data \
    --health-cmd "pg_isready -U eos" \
    --health-interval 5s \
    --health-timeout 3s \
    --health-retries 10 \
    postgres:16

# wait for postgres healthy
for _ in $(seq 1 30); do
    s=$(docker inspect -f '{{.State.Health.Status}}' eos-postgres 2>/dev/null || echo starting)
    [[ "$s" == healthy ]] && break
    sleep 1
done

# 4. app
echo "[run-staging] starting eos-app"
docker rm -f eos-app 2>/dev/null || true
docker run -d --name eos-app --network eos-staging \
    --env-file deploy/env.staging \
    -p 8102:8102 \
    eos-app:prod

# wait for /readyz
for _ in $(seq 1 30); do
    if curl -fsS http://localhost:8102/readyz >/dev/null 2>&1; then
        echo "[run-staging] eos-app ready (8102)"
        break
    fi
    sleep 2
done

# 5. alembic
echo "[run-staging] alembic upgrade head"
docker exec eos-app alembic upgrade head

echo
echo "[run-staging] done."
echo "  live:    http://localhost:8102"
echo "  logs:    ./deploy/run-staging.sh logs"
echo "  teardown: ./deploy/run-staging.sh stop"