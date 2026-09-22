"""EOS secrets vault.

Resolves ``ref`` strings (e.g. ``env:KEY_NAME``) to secret material.
P5 ships env + file backends as placeholders; P10 replaces them with a
real Vault / AWS Secrets Manager client.
"""

from __future__ import annotations

from eos_vault.actor import ActorContext
from eos_vault.crypto import (
    CryptoError,
    InvalidCiphertext,
    InvalidKey,
    decrypt,
    derive_key,
    encrypt,
    generate_key,
)
from eos_vault.env_vault import EnvVaultSecretsResolver
from eos_vault.errors import (
    InvalidSecretRef,
    SecretAccessDenied,
    SecretNotFound,
    VaultError,
)
from eos_vault.file_vault import FileVaultSecretsResolver
from eos_vault.no_op import NoOpSecretsResolver
from eos_vault.resolver import (
    SecretRef,
    VaultSecretsResolver,
    parse_ref,
    resolve_value,
)

__all__ = [
    "ActorContext",
    "CryptoError",
    "EnvVaultSecretsResolver",
    "FileVaultSecretsResolver",
    "InvalidCiphertext",
    "InvalidKey",
    "InvalidSecretRef",
    "NoOpSecretsResolver",
    "SecretAccessDenied",
    "SecretNotFound",
    "SecretRef",
    "VaultError",
    "VaultSecretsResolver",
    "decrypt",
    "derive_key",
    "encrypt",
    "generate_key",
    "parse_ref",
    "resolve_value",
]
