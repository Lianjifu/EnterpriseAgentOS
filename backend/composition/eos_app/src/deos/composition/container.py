"""DI container — instantiates adapters and wires them into services.

Per-request wiring (e.g. session-scoped repositories) happens in
``composition.lifespan``; the container only owns the long-lived
adapters and settings.
"""

from __future__ import annotations

from datetime import UTC
from typing import Any

from eos_auth.api_key import ApiKeyHasher
from eos_auth.jwt import JWTConfig, JWTIssuer, JWTVerifier
from eos_llm.config import LLMConfig
from eos_llm.embeddings import set_default_client
from eos_llm.mock import MockLLMClient
from eos_llm.openai_compatible import OpenAICompatibleClient
from eos_messaging.bus import EventBus
from eos_messaging.in_process import InProcessBus
from eos_persistence.session_factory import SessionFactory, create_engine
from eos_sandbox.local import LocalSandbox
from eos_sandbox.sandbox import Sandbox
from eos_vault.resolver import VaultSecretsResolver
from eos_vector.store import VectorStore

from deos.composition.settings import Settings


class Container:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._services: dict[type, Any] = {}
        self._kafka_audit_producer: object | None = None

    # ── infra ───────────────────────────────────────────────────────────────
    def engine(self):
        return create_engine(
            self.settings.database_url,
            pool_size=self.settings.database_pool_size,
            max_overflow=self.settings.database_max_overflow,
            pool_recycle=self.settings.database_pool_recycle,
            echo=self.settings.database_echo,
        )

    def session_factory(self) -> SessionFactory:
        return SessionFactory(self.engine())

    def redis_client(self):
        """Async Redis client for /readyz + RedisStreamBus.

        Imports lazily so the `redis` package is only required when
        something actually uses the connection (the in-process bus does
        not need it).
        """
        from redis.asyncio import Redis

        return Redis.from_url(
            self.settings.redis_url,
            max_connections=self.settings.redis_max_connections,
            decode_responses=False,
        )

    def bus(self) -> EventBus:
        """Return the configured EventBus backend.

        ``EOS_EVENT_BUS=inprocess`` (default) returns the in-process bus
        used by dev + tests. ``EOS_EVENT_BUS=redis-stream`` wires a real
        Redis Streams bus — every replica gets a stable consumer name
        (env / hostname / uuid4 fallback) so events reach all
        subscribers across the cluster.
        """
        if self.settings.event_bus == "redis-stream":
            from eos_messaging.redis_stream import RedisStreamBus

            return RedisStreamBus(
                self.redis_client(),
                prefix=self.settings.event_redis_stream_prefix,
                dlq_stream=self.settings.event_dlq_stream,
                consumer_name=self.settings.event_redis_consumer_name,
                max_retries=self.settings.event_redis_max_retries,
                block_ms=self.settings.event_redis_block_ms,
                count=self.settings.event_redis_count,
            )
        return InProcessBus()

    def hasher(self) -> ApiKeyHasher:
        return ApiKeyHasher()

    def jwt_config(self) -> JWTConfig:
        return JWTConfig(
            secret=self.settings.jwt_secret,
            algorithm=self.settings.jwt_algorithm,
            issuer=self.settings.jwt_issuer,
            audience=self.settings.jwt_audience,
            access_ttl_seconds=self.settings.jwt_access_ttl_seconds,
        )

    def jwt_issuer(self) -> JWTIssuer:
        return JWTIssuer(self.jwt_config())

    def jwt_verifier(self) -> JWTVerifier:
        return JWTVerifier(self.jwt_config())

    def llm_client(self):
        cfg: LLMConfig = self.settings.llm_config()
        if cfg.provider.value == "mock":
            return MockLLMClient(cfg)
        return OpenAICompatibleClient(cfg)

    def vector_store(self) -> VectorStore | None:
        """Hook up the pgvector store once we have an engine. Kept lazy to
        avoid forcing a connection at boot."""
        from eos_vector.pg_vector import PgVectorStore

        return PgVectorStore(self.engine(), dim=self.settings.llm_embedding_dim)

    def configure_llm_default(self) -> None:
        set_default_client(self.llm_client())

    # ── skill runtime ────────────────────────────────────────────────────────

    def sandbox(self) -> Sandbox:
        if self.settings.sandbox_mode == "docker":
            from eos_sandbox.docker import DockerSandbox

            return DockerSandbox()
        return LocalSandbox()

    def skill_artifact_store(self):
        from pathlib import Path

        from deos.modules.skill.adapter.artifacts.local import (
            LocalDiskSkillArtifactStore,
        )

        return LocalDiskSkillArtifactStore(Path(self.settings.skill_artifact_root))

    # ── P5 secrets ──────────────────────────────────────────────────────────
    def secrets_resolver(self) -> VaultSecretsResolver | None:
        """Resolve the configured vault backend.

        ``vault_mode="noop"`` returns ``None`` so the tool/skill runtimes
        fall back to their no-op resolver (no auth headers).
        """
        mode = self.settings.vault_mode
        if mode == "noop":
            return None
        if mode == "env":
            from eos_vault.env_vault import EnvVaultSecretsResolver

            return EnvVaultSecretsResolver()
        if mode == "file":
            from pathlib import Path

            from eos_vault.file_vault import FileVaultSecretsResolver

            return FileVaultSecretsResolver(root=Path(self.settings.vault_file_root))
        raise RuntimeError(f"unknown vault_mode: {mode}")

    # ── P4 memory + P5 governance clock / id generator ─────────────────────
    def clock(self):
        from datetime import datetime

        class _WallClock:
            def now(self) -> datetime:
                return datetime.now(UTC)

        return _WallClock()

    def id_generator(self):
        from uuid import uuid4

        class _Uuid4Generator:
            def new_id(self):  # type: ignore[no-untyped-def]
                return uuid4()

        return _Uuid4Generator()

    def messaging_event_publisher(self) -> object:
        """Adapter that wraps an EventBus into the ``publish(topic, payload)``
        narrow Protocol used by governance."""
        from deos.modules.governance.adapter.events import (
            MessagingEventPublisher,
        )

        return MessagingEventPublisher(self.bus())

    def audit_recorder(self):
        """Construct the governance AuditRecorder bound to the live bus.

        Each ``append`` call opens its own session via the async
        sessionmaker (audit events arrive outside any HTTP request).

        When ``audit_mode == "kafka"`` the AuditLogPort is a
        ``KafkaAuditPublisher`` (singleton); scrubbing runs inside the
        producer so the topic payload is already compliant. When
        ``"direct"`` we fall back to the synchronous SQL adapter.
        """
        from deos.modules.governance.application.audit_recorder import (
            AuditRecorder,
            build_default_topics,
        )

        if self.settings.audit_mode == "kafka":
            return AuditRecorder(
                audit_port=self.kafka_audit_producer(),
                clock=self.clock(),
                topics=build_default_topics(),
            )
        from deos.modules.governance.adapter.persistence.repositories import (
            SqlAuditLogAdapter,
        )

        return AuditRecorder(
            audit_port=SqlAuditLogAdapter(self.session_factory().maker()),
            clock=self.clock(),
            topics=build_default_topics(),
        )

    def kafka_audit_producer(self):
        """Singleton Kafka audit publisher — shared by recorder + lifespan.

        Lazy because the AIOKafkaProducer only constructs when the
        ``audit_mode == "kafka"`` branch is exercised; we don't want
        to import ``aiokafka`` on every direct-mode boot.
        """
        if self._kafka_audit_producer is None:
            from eos_messaging.kafka_audit import KafkaAuditPublisher

            self._kafka_audit_producer = KafkaAuditPublisher(
                bootstrap_servers=self.settings.audit_kafka_bootstrap_servers,
                topic=self.settings.audit_kafka_topic,
                dlq_topic=self.settings.audit_kafka_dlq_topic,
                max_retries=self.settings.audit_kafka_max_retries,
                request_timeout_ms=self.settings.audit_kafka_request_timeout_ms,
            )
        return self._kafka_audit_producer

    def kafka_audit_consumer(self):
        """Build a fresh KafkaAuditConsumer bound to the SQL audit port.

        Returns a new instance each call so lifespan can call ``start``
        on it; the consumer drains into ``SqlAuditLogAdapter`` which
        opens its own async session per write (mirroring the direct
        path).
        """
        from deos.modules.governance.adapter.persistence.repositories import (
            SqlAuditLogAdapter,
        )
        from eos_messaging.kafka_audit import (
            KafkaAuditConsumer,
            resolve_consumer_group,
        )

        return KafkaAuditConsumer(
            bootstrap_servers=self.settings.audit_kafka_bootstrap_servers,
            topic=self.settings.audit_kafka_topic,
            group_id=resolve_consumer_group(
                self.settings.audit_kafka_consumer_group
            ),
            audit_port=SqlAuditLogAdapter(self.session_factory().maker()),
            block_ms=self.settings.audit_kafka_block_ms,
        )

    def policy_evaluator(self):
        """Construct the policy evaluator with per-call SQL adapters.

        The Sql* adapters each take an ``async_sessionmaker``; the cache
        lives in-process keyed by tenant.
        """
        from deos.modules.governance.adapter.persistence.repositories import (
            SqlApprovalRepository,
            SqlDecisionEventRepo,
            SqlPolicyRepository,
        )
        from deos.modules.governance.application.policy_evaluator import (
            PolicyEvaluator,
        )

        sf = self.session_factory().maker()
        return PolicyEvaluator(
            policy_repo=SqlPolicyRepository(sf),
            approval_repo=SqlApprovalRepository(sf),
            decision_repo=SqlDecisionEventRepo(sf),
            clock=self.clock(),
            ids=self.id_generator(),
            publisher=self.messaging_event_publisher(),
            cache_ttl_seconds=self.settings.policy_cache_ttl_seconds,
            approval_ttl_seconds=self.settings.policy_approval_ttl_seconds,
        )

    def policy_guard(self):
        """The cross-cutting PolicyGuard used by every gated use case."""
        from deos.modules.governance.adapter.guard.policy_guard import PolicyGuard

        return PolicyGuard(evaluator=self.policy_evaluator())

    def policy_service(self):
        from deos.modules.governance.adapter.persistence.repositories import (
            SqlPolicyRepository,
        )
        from deos.modules.governance.application.policy_service import PolicyService

        return PolicyService(
            repo=SqlPolicyRepository(self.session_factory().maker()),
            clock=self.clock(),
            ids=self.id_generator(),
            publisher=self.messaging_event_publisher(),
        )

    def approval_service(self):
        from deos.modules.governance.adapter.persistence.repositories import (
            SqlApprovalRepository,
        )
        from deos.modules.governance.application.approval_service import (
            ApprovalService,
        )

        return ApprovalService(
            repo=SqlApprovalRepository(self.session_factory().maker()),
            clock=self.clock(),
            ids=self.id_generator(),
            publisher=self.messaging_event_publisher(),
            default_ttl_seconds=self.settings.policy_approval_ttl_seconds,
        )

    def evolution_service(self):
        """Self-evolution candidate service (A4).

        Default ``DirectApplyGuard`` is a placeholder — production deploys
        must swap it for a kind-specific guard (memory working layer,
        skill draft, routing draft) before exposing ``/v1/evolve/*``.
        """
        from deos.modules.self_evolution.adapter.persistence.repositories import (
            SqlEvolutionCandidateRepository,
        )
        from deos.modules.self_evolution.application.apply_guard import (
            DirectApplyGuard,
        )
        from deos.modules.self_evolution.application.evolution_service import (
            EvolutionCandidateService,
        )

        return EvolutionCandidateService(
            repo=SqlEvolutionCandidateRepository(self.session_factory().maker()),
            clock=self.clock(),
            ids=self.id_generator(),
            apply_guard=DirectApplyGuard(),
            publisher=self.messaging_event_publisher(),
            default_ttl_seconds=3600,
        )

    def memory_embedding_adapter(self):
        """Pick the embedding adapter per ``settings.embedding_provider``."""
        provider = self.settings.embedding_provider
        if provider == "openai":
            from deos.modules.memory.adapter.embedding.openai_adapter import (
                OpenAIEmbeddingAdapter,
            )

            return OpenAIEmbeddingAdapter(
                api_key=self.settings.openai_api_key,
                base_url=self.settings.openai_base_url,
                model=self.settings.llm_embedding_model,
                dim=self.settings.llm_embedding_dim,
            )
        if provider == "http":
            import httpx
            from deos.modules.memory.adapter.embedding.http_adapter import (
                HttpEmbeddingAdapter,
            )

            return HttpEmbeddingAdapter(
                client=httpx.AsyncClient(timeout=30.0),
                base_url=self.settings.embedding_runtime_url,
                api_key=self.settings.embedding_runtime_api_key,
            )
        from deos.modules.memory.adapter.embedding.noop_adapter import (
            NoOpEmbeddingAdapter,
        )

        return NoOpEmbeddingAdapter(dim=self.settings.llm_embedding_dim)

    def memory_vector_store(self):
        """The pgvector store used by the memory repository."""
        from eos_vector.pg_vector import PgVectorStore

        return PgVectorStore(self.engine(), dim=self.settings.llm_embedding_dim)

    # ── P7 knowledge ───────────────────────────────────────────────────────

    def knowledge_vector_store(self):
        """The pgvector store used by the knowledge vector adapter.

        Distinct from ``memory_vector_store`` — different table +
        different payload schema.  Embedding dim is shared.
        """
        from eos_vector.pg_vector import PgVectorStore

        return PgVectorStore(
            self.engine(),
            dim=self.settings.llm_embedding_dim,
            table="knowledge_chunks_vec",
        )

    def knowledge_storage(self):
        """Local-disk object storage for raw knowledge asset bytes."""
        from pathlib import Path

        from deos.modules.knowledge.adapter.persistence.storage.local import (
            LocalDiskKnowledgeStorage,
        )

        return LocalDiskKnowledgeStorage(
            Path(self.settings.knowledge_storage_root).resolve()
        )

    # ── P6 model ────────────────────────────────────────────────────────────

    def model_credential_cipher(self):
        """Build the AES-GCM cipher used to encrypt ModelCredential rows.

        Reads ``EOS_MODEL_MASTER_KEY`` (hex-encoded, 32 bytes after
        decoding) and constructs the model-layer cipher. When the key is
        blank, the system raises at boot — explicit fail beats silent
        plaintext.
        """
        from deos.modules.model.adapter.crypto.credential_cipher import (
            build_cipher_from_env,
        )

        master = self.settings.model_master_key.strip()
        if not master:
            raise RuntimeError(
                "EOS_MODEL_MASTER_KEY is required for the P6 model module "
                "(set it to 32 bytes hex-encoded; see doc/12 §P6)."
            )
        try:
            return build_cipher_from_env(master_key_hex=master)
        except Exception as exc:  # pragma: no cover - defensive boot path
            raise RuntimeError(
                f"EOS_MODEL_MASTER_KEY is invalid: {exc}"
            ) from exc

    def model_service(self):
        """Assemble the ModelService with all adapter dependencies.

        Repositories share one async sessionmaker so quota increments and
        the tenant-scoped read paths can ride the same Postgres
        connection pool. The cipher and LLM client factory are
        long-lived singletons.
        """
        from deos.modules.model.adapter.llm.client_factory import (
            build_default_client_factory,
        )
        from deos.modules.model.adapter.persistence.repositories import (
            SqlCredentialRepository,
            SqlModelRepository,
            SqlQuotaCounterRepository,
            SqlRoutingPolicyRepository,
        )
        from deos.modules.model.application.services import ModelService

        sf = self.session_factory().maker()
        return ModelService.from_parts(
            model_repo=SqlModelRepository(sf),
            credential_repo=SqlCredentialRepository(sf),
            routing_repo=SqlRoutingPolicyRepository(sf),
            quota_repo=SqlQuotaCounterRepository(sf),
            client_factory=build_default_client_factory(
                request_timeout_seconds=self.settings.model_invocation_timeout_seconds,
            ),
            cipher=self.model_credential_cipher(),
            clock=self.clock(),
            ids=self.id_generator(),
            publisher=self.messaging_event_publisher(),
        )

    # ── P6 channel ──────────────────────────────────────────────────────────

    def channel_webhook_cipher(self):
        """AES-GCM cipher for ChannelSecret rows.

        Reuses the model master key for v1 — both secret tables share the
        same envelope format (nonce(12) || ct || tag(16)). A future
        rotation can split the key version per secret class.
        """
        return self.model_credential_cipher()

    def channel_inbound_registry(self):
        """Dict[ChannelType, InboundAdapter] — parsed once at boot."""
        from deos.modules.channel.adapter.inbound import (
            DingTalkInboundAdapter,
            FeishuInboundAdapter,
            WebInboundAdapter,
            WeChatWorkInboundAdapter,
        )
        from deos.modules.channel.domain.value_objects import ChannelType

        return {
            ChannelType.FEISHU: FeishuInboundAdapter(),
            ChannelType.DINGTALK: DingTalkInboundAdapter(),
            ChannelType.WECHATWORK: WeChatWorkInboundAdapter(),
            ChannelType.WEB: WebInboundAdapter(),
        }

    def channel_outbound_registry(self):
        """Dict[ChannelType, OutboundAdapter] — long-lived singletons.

        Each outbound adapter takes a shared ``httpx.AsyncClient`` so the
        connection pool is reused across deliveries. Feishu / DingTalk /
        WeChatWork adapters carry empty placeholder credentials at boot
        and read ``outbound_config`` from the channel row when sending.
        """
        import httpx
        from deos.modules.channel.adapter.outbound import (
            DingTalkOutboundAdapter,
            FeishuOutboundAdapter,
            WebOutboundAdapter,
            WeChatWorkOutboundAdapter,
        )
        from deos.modules.channel.domain.value_objects import ChannelType

        http = httpx.AsyncClient(timeout=30.0)
        timeout = self.settings.model_invocation_timeout_seconds
        return {
            ChannelType.FEISHU: FeishuOutboundAdapter(
                http=http,
                app_id="",
                app_secret="",
                request_timeout_seconds=timeout,
            ),
            ChannelType.DINGTALK: DingTalkOutboundAdapter(
                http=http,
                webhook_url="",
                request_timeout_seconds=timeout,
            ),
            ChannelType.WECHATWORK: WeChatWorkOutboundAdapter(),
            ChannelType.WEB: WebOutboundAdapter(
                http=http,
                webhook_url=None,
                request_timeout_seconds=timeout,
            ),
        }

    def channel_service(self):
        """Assemble the ChannelService with all adapter dependencies.

        Returns ``None`` if the AES-GCM cipher cannot be built (e.g.
        missing ``EOS_MODEL_MASTER_KEY``) so the lifespan can fall back
        to a no-op registration for legacy dev shells.
        """
        try:
            cipher = self.channel_webhook_cipher()
        except RuntimeError:
            return None

        from deos.modules.channel.adapter.persistence.repositories import (
            SqlChannelDeliveryRepository,
            SqlChannelRepository,
            SqlWebhookSecretRepository,
        )
        from deos.modules.channel.application.services import ChannelService

        sf = self.session_factory().maker()
        return ChannelService(
            channel_repo=SqlChannelRepository(sf),
            delivery_repo=SqlChannelDeliveryRepository(sf),
            secret_repo=SqlWebhookSecretRepository(sf),
            cipher=cipher,
            clock=self.clock(),
            ids=self.id_generator(),
            publisher=self.messaging_event_publisher(),
        )
