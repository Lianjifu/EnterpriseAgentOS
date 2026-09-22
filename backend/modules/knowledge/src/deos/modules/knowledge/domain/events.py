"""Knowledge domain events emitted through the messaging bus."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from eos_kernel.events import DomainEvent
from eos_schema.ids import (
    KnowledgeAssetId,
    KnowledgePackageId,
    TenantId,
    UserId,
    WorkspaceId,
)


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _event_id() -> UUID:
    return uuid4()


@dataclass(slots=True, frozen=True)
class KnowledgePackageCreated(DomainEvent):
    TOPIC = "knowledge.package.created"

    package_id: KnowledgePackageId
    tenant_id: TenantId
    workspace_id: WorkspaceId
    name: str
    created_by: UserId | None = None
    event_id: UUID = field(default_factory=_event_id)
    occurred_at: datetime = field(default_factory=_utcnow)
    event_name: str = "knowledge.package.created"

    def to_payload(self) -> dict[str, Any]:
        return {
            "package_id": str(self.package_id),
            "tenant_id": str(self.tenant_id),
            "workspace_id": str(self.workspace_id),
            "name": self.name,
            "created_by": str(self.created_by) if self.created_by else None,
        }


@dataclass(slots=True, frozen=True)
class KnowledgeAssetUploaded(DomainEvent):
    TOPIC = "knowledge.asset.uploaded"

    asset_id: KnowledgeAssetId
    package_id: KnowledgePackageId
    tenant_id: TenantId
    workspace_id: WorkspaceId
    name: str
    byte_size: int
    event_id: UUID = field(default_factory=_event_id)
    occurred_at: datetime = field(default_factory=_utcnow)
    event_name: str = "knowledge.asset.uploaded"

    def to_payload(self) -> dict[str, Any]:
        return {
            "asset_id": str(self.asset_id),
            "package_id": str(self.package_id),
            "tenant_id": str(self.tenant_id),
            "workspace_id": str(self.workspace_id),
            "name": self.name,
            "byte_size": self.byte_size,
        }


@dataclass(slots=True, frozen=True)
class KnowledgeAssetIngested(DomainEvent):
    """Emitted after an asset finishes chunking + embedding."""

    TOPIC = "knowledge.asset.ingested"

    asset_id: KnowledgeAssetId
    package_id: KnowledgePackageId
    tenant_id: TenantId
    workspace_id: WorkspaceId
    chunk_count: int
    event_id: UUID = field(default_factory=_event_id)
    occurred_at: datetime = field(default_factory=_utcnow)
    event_name: str = "knowledge.asset.ingested"

    def to_payload(self) -> dict[str, Any]:
        return {
            "asset_id": str(self.asset_id),
            "package_id": str(self.package_id),
            "tenant_id": str(self.tenant_id),
            "workspace_id": str(self.workspace_id),
            "chunk_count": self.chunk_count,
        }


@dataclass(slots=True, frozen=True)
class KnowledgeAssetRevoked(DomainEvent):
    TOPIC = "knowledge.asset.revoked"

    asset_id: KnowledgeAssetId
    package_id: KnowledgePackageId
    tenant_id: TenantId
    workspace_id: WorkspaceId
    revoked_by: UserId
    event_id: UUID = field(default_factory=_event_id)
    occurred_at: datetime = field(default_factory=_utcnow)
    event_name: str = "knowledge.asset.revoked"

    def to_payload(self) -> dict[str, Any]:
        return {
            "asset_id": str(self.asset_id),
            "package_id": str(self.package_id),
            "tenant_id": str(self.tenant_id),
            "workspace_id": str(self.workspace_id),
            "revoked_by": str(self.revoked_by),
        }


@dataclass(slots=True, frozen=True)
class KnowledgePackageRevoked(DomainEvent):
    TOPIC = "knowledge.package.revoked"

    package_id: KnowledgePackageId
    tenant_id: TenantId
    workspace_id: WorkspaceId
    revoked_by: UserId
    event_id: UUID = field(default_factory=_event_id)
    occurred_at: datetime = field(default_factory=_utcnow)
    event_name: str = "knowledge.package.revoked"

    def to_payload(self) -> dict[str, Any]:
        return {
            "package_id": str(self.package_id),
            "tenant_id": str(self.tenant_id),
            "workspace_id": str(self.workspace_id),
            "revoked_by": str(self.revoked_by),
        }


__all__ = [
    "KnowledgeAssetIngested",
    "KnowledgeAssetRevoked",
    "KnowledgeAssetUploaded",
    "KnowledgePackageCreated",
    "KnowledgePackageRevoked",
]
