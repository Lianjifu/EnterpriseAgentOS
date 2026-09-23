# Envoy header-based traffic splitter

`envoy.yaml` provides header-based ring routing for the gray A/B
deployment. Used when Envoy is the only ingress layer (no nginx-ingress
controller). In production we prefer `infra/k8s/ingress.yaml` (nginx
ingress canary annotation) — Envoy here is the alternative for
non-k8s deployments (bare-metal / docker-compose with the standalone
envoy image).

## Routing

| Header | Cluster |
|---|---|
| `X-EOS-Ring: canary` | `eos_canary` (port 8103 → 8102) |
| (any other / missing) | `eos_stable` (port 8102 → 8102) |

## Run with docker-compose

Add to `docker-compose.prod.yml`:

```yaml
  envoy:
    image: envoyproxy/envoy:v1.31-latest
    command: ["envoy", "-c", "/etc/envoy/envoy.yaml"]
    volumes:
      - ../infra/envoy/envoy.yaml:/etc/envoy/envoy.yaml:ro
    ports:
      - "10000:10000"
    depends_on:
      - eos-app-stable
      - eos-app-canary
    profiles: ["prod"]
```

## Run standalone

```bash
docker run --rm -p 10000:10000 \
  -v $(pwd)/infra/envoy/envoy.yaml:/etc/envoy/envoy.yaml:ro \
  envoyproxy/envoy:v1.31-latest
```

## Test

```bash
curl -fsS http://127.0.0.1:10000/livez                        # stable
curl -fsS -H "X-EOS-Ring: canary" http://127.0.0.1:10000/livez  # canary
```

## Why this is an alternative

The k8s ingress annotation is simpler (no extra container, no extra
config file). Envoy is the fallback when running on bare-metal or
docker-compose-only stacks where nginx-ingress is unavailable. Choose
one; do not run both for the same service.
