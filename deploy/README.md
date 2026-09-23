# Enterprise-Agent-OS — Production Compose

Single-namespace prod profile. Two app pools (stable + canary) sharing
PG / Redis / MinIO. Image built from `infra/docker/Dockerfile.app`.

## Quick start

```bash
cd enterprise-agent-os

# 1. create .env.prod (NEVER commit real secrets)
cp deploy/env.prod.example .env.prod
$EDITOR .env.prod

# 2. build image
docker compose -f deploy/docker-compose.prod.yml --profile prod build

# 3. start stable pool + canary + deps
docker compose -f deploy/docker-compose.prod.yml --profile prod up -d

# 4. verify
curl -fsS http://127.0.0.1:8102/livez   # stable
curl -fsS http://127.0.0.1:8103/livez   # canary
```

## Traffic split

A separate ingress (nginx ingress canary annotation or envoy) must split
client requests based on the `X-EOS-Ring` header:

- `X-EOS-Ring: canary` → port 8103
- (no header) → port 8102

See [`infra/k8s/ingress.yaml`](../infra/k8s/ingress.yaml) for the k8s
equivalent. For compose-only dev, route manually with two A records or
a local nginx sidecar.

## Secrets

All credentials live in `.env.prod` which is `.gitignore`d. Reference
`EOS_*_SECRET_REF` env vars only — never inline raw secrets.

## Scaling

```bash
docker compose -f deploy/docker-compose.prod.yml --profile prod up -d \
    --scale eos-app-stable=3 --scale eos-app-canary=1
```
