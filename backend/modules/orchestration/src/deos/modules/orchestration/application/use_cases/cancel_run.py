"""CancelRunUseCase — marks a running WorkflowRun CANCELED.

v1 has no pause / resume; cancel is a single state transition.  If the
run has already finished the call is a no-op and returns the run as-is.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime

from eos_kernel.errors import AppError
from eos_schema.ids import TenantId, WorkflowRunId

from deos.modules.orchestration.application.ports import (
    OrchestrationEventPublisher,
    WorkflowRunRepository,
)
from deos.modules.orchestration.domain.entities import WorkflowRun
from deos.modules.orchestration.domain.errors import WorkflowRunNotFound
from deos.modules.orchestration.domain.events import WorkflowRunCompleted
from deos.modules.orchestration.domain.value_objects import WorkflowRunStatus

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class CancelRunUseCase:
    repository: WorkflowRunRepository
    publisher: OrchestrationEventPublisher | None = None
    policy_guard: object | None = None

    async def execute(
        self, *, tenant_id: TenantId, run_id: WorkflowRunId
    ) -> WorkflowRun:
        run = await self.repository.get(tenant_id=tenant_id, run_id=run_id)
        if run is None:
            raise WorkflowRunNotFound(f"workflow_run {run_id} not found")

        if run.is_terminal():
            return run

        canceled = run.with_status(
            WorkflowRunStatus.CANCELED,
            finished_at=datetime.now(UTC),
        )
        saved = await self.repository.update(canceled)

        if self.publisher is not None:
            try:
                await self.publisher.publish(
                    WorkflowRunCompleted(
                        run_id=saved.id,
                        tenant_id=saved.tenant_id,
                        workspace_id=saved.workspace_id,
                        status=saved.status.value,
                        error_code=saved.error_code,
                        final_output=saved.final_output or {},
                    )
                )
            except AppError:  # pragma: no cover - defensive
                logger.exception("publish WorkflowRunCompleted failed for %s", saved.id)

        return saved


__all__ = ["CancelRunUseCase"]
