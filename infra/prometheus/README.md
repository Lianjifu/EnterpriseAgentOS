# Prometheus — EnterpriseAgentOS

Prometheus alerting + recording rules for the EOS backend.

## Layout

```
infra/prometheus/
├── prometheus.example.yml     # Example Prometheus config
└── rules/
    ├── eos-alerts.yaml        # 4 alert rules (warning + critical)
    └── eos-recording.yaml     # Pre-aggregation rules for dashboards
```

## Metrics contract

The dashboards + alerts reference ``eos_*`` series that are expected to
be emitted by the FastAPI app:

| Metric | Type | Labels | Source |
|---|---|---|---|
| `eos_http_requests_total` | counter | `tenant`, `status`, `route` | HTTP middleware |
| `eos_llm_invocations_total` | counter | `tenant`, `model`, `status` | LLM client adapter |
| `eos_llm_tokens_total` | counter | `tenant`, `model`, `kind` (input/output) | LLM client adapter |
| `eos_turn_latency_ms_bucket` | histogram | `tenant`, `workspace` | Agent runtime turn |
| `eos_cost_usd_total` | counter | `tenant`, `workspace`, `cost_type`, `model` | Observability recorder |
| `eos_eval_gate_total` | counter | `tenant`, `result` (passed/failed) | Eval gate middleware |
| `eos_run_records_total` | counter | `tenant`, `run_type`, `status` | Observability recorder |

P9-6 provisions the rules + dashboards; the metrics themselves are
emitted by P10+ instrumentation.  Until then, alerts will not fire —
the dashboards and rules serve as the canonical contract.

## Deploy

### Bare-metal / VM

```bash
sudo cp rules/*.yaml /etc/prometheus/rules/
sudo cp prometheus.example.yml /etc/prometheus/prometheus.yml
sudo systemctl reload prometheus
```

### docker-compose

```yaml
services:
  prometheus:
    image: prom/prometheus:v2.55.0
    volumes:
      - ./prometheus.example.yml:/etc/prometheus/prometheus.yml:ro
      - ./rules:/etc/prometheus/rules:ro
    ports:
      - "9090:9090"
```

## Verify

```bash
# YAML parses cleanly
python3 -c "import yaml; yaml.safe_load(open('rules/eos-alerts.yaml'))"
python3 -c "import yaml; yaml.safe_load(open('rules/eos-recording.yaml'))"

# Validate rules via promtool (preferred)
promtool check rules rules/eos-alerts.yaml rules/eos-recording.yaml
promtool check config prometheus.example.yml
```
