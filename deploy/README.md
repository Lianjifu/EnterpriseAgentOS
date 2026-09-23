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
`EOS_*_REF` env vars only — never inline raw secrets.  Two ref schemes
are accepted (both implemented in `libs/vault`):

| Scheme | Resolver | Source |
|---|---|---|
| `vault:secret/data/<path>` | `HashicorpVaultSecretsResolver` | HashiCorp Vault KV v2 (env `EOS_VAULT_URL` / `EOS_VAULT_TOKEN`) |
| `csi:<KEY_NAME>` | `CSIVaultSecretsResolver` | Vault CSI driver mount at `/vault/secrets/<KEY>` |

See `infra/k8s/secret.example.yaml` for the matching k8s SecretProviderClass
when running under k8s.

## Burn-in gate runner

`deploy/burn_in.py` orchestrates the prelaunch gates G2 / G3 / G5 / G6 /
G7 / G8 from `doc/prelaunch-checklist.md`. Locally it can already run
G5 (gitleaks), G6 (promtool check rules + config), and G7 (Grafana
dashboard JSON schema). Setting `EOS_STABLE_URL` + `EOS_CANARY_URL`
adds G2 (dual `/readyz` 200), G3 (bench P95 ≤ 10 s on stable), and
G8 (smoke happy path against both rings).

```bash
# local-only gates
uv run python deploy/burn_in.py

# full gates after deployment
EOS_STABLE_URL=https://eos-stable.example.com \
EOS_CANARY_URL=https://eos-canary.example.com \
EOS_SMOKE_BEARER_TOKEN=... \
  uv run python deploy/burn_in.py
```

Exit code = number of failed gates (skipped gates don't count).

## Scaling

```bash
docker compose -f deploy/docker-compose.prod.yml --profile prod up -d \
    --scale eos-app-stable=3 --scale eos-app-canary=1
```
