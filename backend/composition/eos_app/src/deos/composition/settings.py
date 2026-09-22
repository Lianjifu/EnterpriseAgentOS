"""Settings (pydantic-settings, EOS_-prefixed env)."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from eos_llm.config import LLMConfig, LLMProvider
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="EOS_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # core
    env: Literal["development", "test", "ci", "staging", "production"] = "development"
    debug: bool = True
    log_level: str = "INFO"
    log_json: bool = True

    # http
    http_host: str = "0.0.0.0"
    http_port: int = 8100
    http_workers: int = 1
    http_request_body_max_bytes: int = 10 * 1024 * 1024

    # database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/eos_dev"
    database_pool_size: int = 20
    database_max_overflow: int = 10
    database_pool_recycle: int = 3600
    database_echo: bool = False

    # redis
    redis_url: str = "redis://localhost:6379/0"
    redis_max_connections: int = 50

    # auth
    jwt_secret: str = "dev-secret-not-for-production-use-only"
    jwt_algorithm: str = "HS256"
    jwt_issuer: str = "eos-dev"
    jwt_audience: str = "eos-api"
    jwt_access_ttl_seconds: int = 3600
    api_key_hash_rounds: int = 12

    # multi-tenancy
    ban_mock_token: int = 0
    allow_demo_token: int = 1
    demo_tenant_id: str = "00000000-0000-0000-0000-000000000001"
    dev_admin_email: str = "admin@example.com"
    dev_admin_password: str = "dev-admin-password-change-me"

    # llm
    llm_provider: str = "mock"
    llm_base_url: str = "https://api.openai.com/v1"
    llm_api_key: str = ""
    llm_default_model: str = "gpt-4o-mini"
    llm_timeout_seconds: int = 30
    llm_mock_latency_ms: int = 50
    llm_failover_providers: str = ""
    llm_embedding_model: str = "text-embedding-3-small"
    llm_embedding_dim: int = 1536

    # event bus
    event_bus: Literal["inprocess", "redis-stream"] = "inprocess"
    event_redis_stream_prefix: str = "eos:events:"
    event_dlq_stream: str = "eos:events:dlq"

    # rate limit
    rate_limit_per_tenant_per_min: int = 1000
    rate_limit_per_api_key_per_min: int = 1000
    rate_limit_window_seconds: int = 60

    # tool runtime
    tool_call_timeout_seconds: float = 30.0

    # skill runtime
    sandbox_mode: Literal["local", "docker"] = "local"
    run_token_secret: str = "dev-run-token-secret-change-me"
    skill_artifact_root: str = "/tmp/eos-skill-artifacts"
    skill_invocation_default_timeout_seconds: int = 30
    skill_artifact_tail_max_bytes: int = 4096
    skill_runtime_mounted: bool = False
    skill_run_token_ttl_seconds: int = 300

    # cors
    cors_allow_origins: str = "http://localhost:5173,http://localhost:3000"
    cors_allow_credentials: bool = True
    cors_allow_methods: str = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    cors_allow_headers: str = "*"

    # observability
    otlp_endpoint: str = ""
    metrics_path: str = "/metrics"
    traces_sample_rate: float = 1.0

    # P5 governance
    policy_enabled: bool = True
    policy_cache_ttl_seconds: int = 30
    policy_approval_ttl_seconds: int = 3600
    vault_mode: Literal["env", "file", "noop"] = "env"
    vault_file_root: str = "/etc/eos/vault"
    embedding_provider: Literal["openai", "http", "noop"] = "noop"

    # P7 knowledge
    knowledge_storage_root: str = "/tmp/eos-knowledge-assets"
    knowledge_default_chunk_size: int = 800
    knowledge_default_chunk_overlap: int = 80

    # P7 orchestration
    orchestration_max_total_steps: int = 64
    orchestration_default_step_timeout_seconds: int = 60
    embedding_runtime_url: str = "http://127.0.0.1:8102"
    embedding_runtime_api_key: str = ""
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"

    # P6 model
    model_master_key: str = ""
    model_master_key_version: int = 1
    model_quota_default_window: Literal["minute", "hour", "day"] = "minute"
    model_quota_default_max_requests: int = 1000
    model_quota_default_max_tokens: int = 2_000_000
    model_invocation_timeout_seconds: float = 30.0

    # P6 channel
    channel_webhook_signature_tolerance_seconds: int = 300
    channel_default_inbound_max_body_bytes: int = 1 * 1024 * 1024

    def llm_config(self) -> LLMConfig:
        return LLMConfig(
            provider=LLMProvider(self.llm_provider),
            base_url=self.llm_base_url,
            api_key=self.llm_api_key,
            default_model=self.llm_default_model,
            embedding_model=self.llm_embedding_model,
            embedding_dim=self.llm_embedding_dim,
            timeout_seconds=self.llm_timeout_seconds,
            mock_latency_ms=self.llm_mock_latency_ms,
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


def reset_settings_cache() -> None:
    get_settings.cache_clear()
