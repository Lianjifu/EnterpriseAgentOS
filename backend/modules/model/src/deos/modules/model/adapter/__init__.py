"""Model module — adapter package.

Subpackages:
- crypto/        AES-GCM cipher wrapper for ModelCredential
- persistence/   ORM models + SQL repositories
- llm/           ModelClientFactory (provider → LLMClient)
- http/          FastAPI router + DTOs
"""

from __future__ import annotations
