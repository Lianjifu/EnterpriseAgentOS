# 企智搭 · 智能体平台

企业级智能体工作台：管理员建设能力并治理运行，用户从已开放目录选用智能体、知识、技能和工作流去完成工作。

前端是 React 18 + Vite 工作台（用户侧 + 管理侧）；后端是 Python 3.12 + FastAPI 模块化单体。架构方案见 [`doc/`](./doc/)，决策记录见 [`docs/adr/`](./docs/adr/)。

## 快速开始

### 前端（演示数据）

不连后端即可浏览工作台：

```bash
cd frontend
pnpm install
pnpm --filter web dev:demo
# http://127.0.0.1:5200
```

联调真实 API 用 `pnpm --filter web dev`（默认走网关代理，端口可用 `EAOS_FRONTEND_PORT` 覆盖）。

```bash
cd frontend/web
pnpm test
```

### 后端

```bash
cd backend
make sync
docker compose up -d       # PG (pgvector) + Redis + MinIO
cp .env.example .env
make db-upgrade
make run-app
curl http://localhost:8100/healthz
```

后端命令须在 `backend/` 下执行。

## 用户侧

从管理端已发布、并对工作区开放的目录中浏览选用，再进入对话或执行。

| 页面 | 做什么 |
|---|---|
| 首页 | 从今天要完成的工作开始 |
| 对话 | 发起工作，查看执行进度，需要时完成确认 |
| 智能体 | 浏览并选用管理员已开放的智能体，进入对话 |
| 知识 | 浏览资料：从已索引文档中选用，提问或带入对话 |
| 技能 | 浏览能力：从已发布 Skill / Tool / MCP 中选用，配合关联智能体 |
| 工作流 | 浏览工作流：从已发布流程中选用并使用 |
| 任务 | 跟进待确认、执行中与异常事项 |
| 协作 | 共享团队智能体与知识 |
| 设置 | 个人资料、账号安全、通知与偏好 |

## 管理侧

列表默认每页 10 条，点击行进入详情；「新建」进入独立页面。

### 运营总览

| 模块 | 做什么 |
|---|---|
| 运营概览 | 看调用量、可用率和告警 |

### 能力建设

| 模块 | 做什么 |
|---|---|
| 智能体管理 | 配置、审核并发布智能体 |
| 技能管理 | 维护智能体可调用的技能（Skill / Tool / MCP） |
| 知识管理 | 把企业知识资产管起来（知识库、资料来源、权限） |
| 记忆管理 | 管理会话记忆和长期记忆 |
| 工作流管理 | 编排并发布可执行工作流 |

用户侧的智能体、知识、技能、工作流分别来自以上四个目录，仅已发布并对工作区开放的条目可被选用。

### 平台治理

| 模块 | 做什么 |
|---|---|
| 模型配置 | 接入模型并配置路由。新建时填写供应商名称、API Key、请求地址和协议，再从供应商拉取模型列表并勾选接入 |
| 额度管理 | 控制预算、用量和告警 |
| 渠道配置 | 接入飞书、企微、钉钉和 Web，作为可对话入口 |

### 质量保障

| 模块 | 做什么 |
|---|---|
| 评测中心 | 用套件评测智能体质量 |
| 回归追踪 | 对比基线，发现版本退化 |
| 用户反馈 | 收集、分诊并处理用户意见 |

### 可观测与设置

| 模块 | 做什么 |
|---|---|
| 调用链路 | 还原会话的完整调用过程 |
| 工具审计 | 审查工具调用与风险规则 |
| 运行指标 | 观测可用率、延迟和成本 |
| 平台设置 | 配置品牌、合规开关和成员 |

## 仓库结构

```
.
├── backend/         Python 3.12 + FastAPI + uv workspace
├── frontend/        pnpm workspace
│   ├── web/         工作台 SPA
│   └── packages/    @de/web-api、ui、hooks、types、utils
├── deploy/          部署脚本与编排
├── infra/           k8s / envoy / prometheus / grafana
├── doc/             架构设计（backend + web）
├── docs/            ADR 与 runbook
└── README.md
```

## 工程约定

- Conventional Commits（commitlint）
- 后端 pre-commit：ruff、mypy（strict）、lint-imports、gitleaks
- 多租户请求携带 `X-Tenant-Id` 与 `X-Workspace-Id`
- 演示模式 `VITE_USE_DEMO=true` 只注入本地 mock，生产构建不触达
