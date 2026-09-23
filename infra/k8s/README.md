# Enterprise-Agent-OS — k8s manifests

Single-namespace (`eos-prod`) deployment of the FastAPI composition root.
Two pools share the same ConfigMap and Secret, differ only by the
`EOS_RING` env. A canary ingress splits traffic based on the
`X-EOS-Ring: canary` header.

## Files

| File | Purpose |
|---|---|
| `namespace.yaml` | `eos-prod` ns |
| `configmap.yaml` | non-secret env (EOS_ENV, ports, log level, pricing defaults) |
| `secret.example.yaml` | secret **template** — never commit real values |
| `deployment.yaml` | `eos-app-stable` (3 replicas) + `eos-app-canary` (1 replica) |
| `service.yaml` | ClusterIP for stable + canary + metrics |
| `ingress.yaml` | nginx ingress with header-based canary rule |
| `hpa.yaml` | HPA 3-10 (stable) + 1-3 (canary) |
| `networkpolicy.yaml` | default-deny + allow ingress-nginx + DB egress |

## Apply

```bash
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
# Render real secret from vault (out-of-band):
#   kubectl apply -f rendered-secret.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml
kubectl apply -f networkpolicy.yaml
```

## Smoke

```bash
# Stable (no header)
curl -fsS https://eos.example.com/livez

# Canary (with header)
curl -fsS -H "X-EOS-Ring: canary" https://eos.example.com/livez

# Inspect which pod answered
kubectl logs -l ring=stable --tail=5
kubectl logs -l ring=canary --tail=5
```

## Secret handling

The committed `secret.example.yaml` is a template with placeholder
values. In production use one of:

- **External Secrets Operator (ESO)** — sync from Vault path
  `vault://prod/eos/*` to k8s Secret.
- **Sealed Secrets** — sealed-secrets-controller decrypts on apply.
- **HashiCorp Vault CSI Provider** — mounts secrets as ephemeral
  volumes.

`gitleaks` (configured in `.gitleaks.toml`) catches accidental commits
of real secrets.

## Rollout

```bash
# Rolling restart stable
kubectl rollout restart deploy/eos-app-stable -n eos-prod
kubectl rollout status  deploy/eos-app-stable -n eos-prod

# Roll back
kubectl rollout undo deploy/eos-app-stable -n eos-prod
```
