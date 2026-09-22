"""Model module domain types."""

from deos.modules.model.domain.entities import (
    Model,
    ModelCredential,
    QuotaCounter,
    RoutingPolicy,
)
from deos.modules.model.domain.errors import (
    CredentialNotFound,
    InvalidModelSpec,
    ModelAlreadyExists,
    ModelDisabled,
    ModelError,
    ModelNotFound,
    QuotaExceeded,
    RoutingPolicyNotFound,
)
from deos.modules.model.domain.events import (
    ModelCredentialRotated,
    ModelInvoked,
    ModelQuotaExceeded,
    ModelRegistered,
)
from deos.modules.model.domain.value_objects import (
    ModelProvider,
    QuotaWindow,
    RoutingStrategy,
)

__all__ = [
    "CredentialNotFound",
    "InvalidModelSpec",
    "Model",
    "ModelAlreadyExists",
    "ModelCredential",
    "ModelCredentialRotated",
    "ModelDisabled",
    "ModelError",
    "ModelInvoked",
    "ModelNotFound",
    "ModelProvider",
    "ModelQuotaExceeded",
    "ModelRegistered",
    "QuotaCounter",
    "QuotaExceeded",
    "QuotaWindow",
    "RoutingPolicy",
    "RoutingPolicyNotFound",
    "RoutingStrategy",
]