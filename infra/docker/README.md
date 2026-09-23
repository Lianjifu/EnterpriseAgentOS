# Enterprise-Agent-OS — prod runtime image

Multi-stage Docker build for the FastAPI composition root. Produces a
production image with gunicorn (uvicorn workers) running on port 8102.

## Build

```bash
# from repo root
docker build -f infra/docker/Dockerfile.app -t eos-app:prod .
```

## Run (single instance)

```bash
docker run --rm -p 8102:8102 \
    -e EOS_RING=stable \
    -e EOS_DATABASE_URL_SECRET_REF=vault://prod/eos/database_url \
    -e EOS_REDIS_URL_SECRET_REF=vault://prod/eos/redis_url \
    eos-app:prod
```

## Configuration

All runtime config comes via environment variables. Critical ones:

| Env | Purpose | Default |
|---|---|---|
| `EOS_ENV` | `production` for prod | `production` |
| `EOS_RING` | `stable` or `canary` (P10 gray) | `stable` |
| `EOS_GUNICORN_WORKERS` | worker count | 4 |
| `EOS_GUNICORN_THREADS` | threads per worker | 2 |
| `EOS_GUNICORN_TIMEOUT` | request timeout (s) | 60 |
| `EOS_GUNICORN_BIND` | bind address | `0.0.0.0:8102` |

## Health checks

- `/livez` — liveness (process alive)
- `/readyz` — readiness (DB + Redis reachable)
- `/healthz` — full health (DB + Redis + vector store)

All three are wired to the existing `eos_http.health` module.

## Production tuning

The image uses `tini` as PID 1 for proper signal forwarding (SIGTERM
from `kubectl delete pod` triggers graceful shutdown). `proxy-protocol`
is enabled so ingress can forward client IP without losing
`X-Forwarded-For` semantics.
