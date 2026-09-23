"""Tool module domain types.

Domain code MUST NOT import any framework / ORM / transport. All I/O is
expressed through ports (defined in application/ports/).
"""

from deos.modules.tool.domain.entities import (
    AuthConfig,
    AuthConfigType,
    SpecOperation,
    Tool,
    ToolCall,
    ToolCallStatus,
    ToolProtocol,
)
from deos.modules.tool.domain.errors import (
    InvalidToolSpec,
    ToolAlreadyExists,
    ToolCallTimeout,
    ToolDisabled,
    ToolError,
    ToolNotFound,
    ToolVersionMismatch,
    UpstreamUnavailable,
)
from deos.modules.tool.domain.events import (
    ToolCompleted,
    ToolDeleted,
    ToolFailed,
    ToolInvoked,
    ToolRegistered,
    ToolUpdated,
)

__all__ = [
    "AuthConfig",
    "AuthConfigType",
    "InvalidToolSpec",
    "SpecOperation",
    "Tool",
    "ToolAlreadyExists",
    "ToolCall",
    "ToolCallStatus",
    "ToolCallTimeout",
    "ToolCompleted",
    "ToolDeleted",
    "ToolDisabled",
    "ToolError",
    "ToolFailed",
    "ToolInvoked",
    "ToolNotFound",
    "ToolProtocol",
    "ToolRegistered",
    "ToolUpdated",
    "ToolVersionMismatch",
    "UpstreamUnavailable",
]
