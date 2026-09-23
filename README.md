# Enterprise Agent OS

> Modular monolith (Python 3.12 + FastAPI + uv workspace) for the next-generation enterprise agent platform.
> See [`doc/`](./doc/) for the full architecture documentation (backend + web, 13 sections each).

This repository is the greenfield implementation of the **Enterprise Agent OS** design described in `doc/`.
Currently in **Week 1 (P0 foundation)**.

## Quick start (dev)

```bash
cd backend
make sync                  # uv sync --all-extras --all-packages
docker compose up -d       # PG (pgvector) + Redis + MinIO
cp .env.example .env       # edit the EOS_ prefixed variables
make db-upgrade            # alembic -c migrations/alembic.ini upgrade head
make run-app
curl http://localhost:8100/healthz
# → {"status":"ok"}
```

## Layout

```
.
├── backend/         ← Python 3.12 + FastAPI + uv workspace.
│                     All backend commands (make / uv / pre-commit / alembic)
│                     must be run from backend/. CI uses
│                     defaults.run.working-directory=backend.
├── frontend/        ← Placeholder (Web frontend, kicks off Week 5+; design in doc/web/)
├── deploy/          ← Placeholder (future deploy scripts: compose profiles, terraform, etc.)
├── doc/             ← New-project architecture design (13 sections × backend + web)
├── docs/            ← ADR + runbooks
├── .github/workflows/backend.yml   ← CI: lint / import-lint / type-check /
│                                       secret-scan / audit / test / smoke
├── .gitleaks.toml  .editorconfig  .gitignore  .python-version  commitlint.config.cjs
└── README.md        ← this file
```

## Engineering discipline

- **Conventional Commits** enforced via commitlint
- **pre-commit hooks**: ruff (lint + format), mypy (strict), lint-imports (architecture contract), gitleaks (secret scan)
- **CI** (`.github/workflows/backend.yml`): lint / import-lint / type-check / secret-scan / audit / test / smoke
- **Multi-tenant isolation** is a hard rule: every request must carry `X-Tenant-Id` + `X-Workspace-Id`.
- All backend toolchain commands (uv / make / pre-commit / alembic) must be run from `backend/`. See `backend/Makefile` for the full target list.

See [`docs/adr/`](./docs/adr/) for architectural decision records.

## Status

| Phase | Status | Notes |
|---|---|---|
| P0 foundation | 🟡 In progress | Week 1 |
| P1 agent_runtime | ⚪ Not started | Week 2 |
| P2 tool | ⚪ Not started | Week 3 |
| P3 skill | ⚪ Not started | Week 4 |
| P4 memory | ⚪ Not started | Week 5 |
| M4 closed loop | ⚪ Not started | Week 6 |

See [`/Users/lian/.claude/plans/lucky-crafting-sunbeam.md`](/Users/lian/.claude/plans/lucky-crafting-sunbeam.md) for the full 10-week plan.