"""CreateKnowledgePackageUseCase.

Validates that the package name is unique inside the tenant + workspace
and persists the new ``KnowledgePackage``. Raises
``KnowledgePackageNameConflict`` when the (tenant_id, name) pair is
already taken.

Tier B: funnels every registration through a :class:`KnowledgeVetter`
so unsigned / untrusted packs are rejected before they land in the DB.
The vetter is a port (``KnowledgeVetter``) — production wiring decides
whether it's a no-op (``EOS_KNOWLEDGE_SIGNING_MODE=disabled``),
file-backed (``local``), or in-memory (tests).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from eos_schema.ids import TenantId, UserId, WorkspaceId

from deos.modules.knowledge.application.ports import (
    KnowledgeEventPublisher,
    KnowledgeRepository,
)
from deos.modules.knowledge.application.vetter import KnowledgeVetter
from deos.modules.knowledge.domain.entities import KnowledgePackage
from deos.modules.knowledge.domain.errors import KnowledgePackageNameConflict
from deos.modules.knowledge.domain.events import KnowledgePackageCreated

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class CreateKnowledgePackageUseCase:
    repository: KnowledgeRepository
    publisher: KnowledgeEventPublisher | None = None
    policy_guard: object | None = None
    vetter: KnowledgeVetter | None = None

    async def execute(
        self,
        *,
        tenant_id: TenantId,
        workspace_id: WorkspaceId,
        name: str,
        description: str = "",
        metadata: dict[str, Any] | None = None,
        created_by: UserId | None = None,
        signature: str = "",
        signer_key_id: str = "",
        image_digest: str = "",
    ) -> KnowledgePackage:
        if self.policy_guard is not None:
            from eos_vault.actor import ActorContext
            await self.policy_guard.check(  # type: ignore[attr-defined]
                actor=ActorContext(
                    tenant_id=tenant_id,
                    workspace_id=workspace_id,
                    principal_id=created_by,
                ),
                action="knowledge:package:create",
                resource={"workspace_id": str(workspace_id)},
            )

        existing = await self.repository.list_packages(
            tenant_id=tenant_id, workspace_id=workspace_id, limit=200
        )
        for p in existing:
            if p.name == name:
                raise KnowledgePackageNameConflict(
                    f"knowledge package '{name}' already exists in workspace {workspace_id}",
                )

        package = KnowledgePackage.create(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            name=name,
            description=description,
            metadata=metadata,
            created_by=created_by,
            signature=signature,
            signer_key_id=signer_key_id,
            image_digest=image_digest,
        )
        # Vetter runs BEFORE the persistence write so unsigned /
        # untrusted packs never reach the DB.
        if self.vetter is not None:
            await self.vetter.vet(package)

        saved = await self.repository.add_package(package)

        if self.publisher is not None:
            try:
                await self.publisher.publish(
                    KnowledgePackageCreated(
                        package_id=saved.id,
                        tenant_id=saved.tenant_id,
                        workspace_id=saved.workspace_id,
                        name=saved.name,
                        created_by=saved.created_by,
                    )
                )
            except Exception:
                logger.exception(
                    "publish KnowledgePackageCreated failed for %s", saved.id
                )

        return saved


__all__ = ["CreateKnowledgePackageUseCase"]
