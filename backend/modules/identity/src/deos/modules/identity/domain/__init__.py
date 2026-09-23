"""Identity domain types.

Domain code MUST NOT import any framework / ORM / transport. All I/O is
expressed through ports (defined in application/ports/).
"""

from deos.modules.identity.domain.api_key import APIKey, APIKeyStatus
from deos.modules.identity.domain.events import (
    APIKeyIssued,
    APIKeyRevoked,
    DomainEvent,
    TenantCreated,
    UserRegistered,
    WorkspaceCreated,
)
from deos.modules.identity.domain.tenant import Tenant, TenantStatus
from deos.modules.identity.domain.user import User, UserStatus
from deos.modules.identity.domain.workspace import Workspace, WorkspaceStatus

__all__ = [
    "APIKey",
    "APIKeyIssued",
    "APIKeyRevoked",
    "APIKeyStatus",
    "DomainEvent",
    "Tenant",
    "TenantCreated",
    "TenantStatus",
    "User",
    "UserRegistered",
    "UserStatus",
    "Workspace",
    "WorkspaceCreated",
    "WorkspaceStatus",
]
