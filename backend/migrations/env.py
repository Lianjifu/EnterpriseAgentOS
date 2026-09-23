"""Alembic env for Enterprise Agent OS.

Imports every module's metadata so `alembic revision --autogenerate` picks
up new tables. Connection URL comes from env (EOS_DATABASE_URL).
"""

from __future__ import annotations

import asyncio
import os
from logging.config import fileConfig
from typing import TYPE_CHECKING

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

if TYPE_CHECKING:
    from sqlalchemy.engine import Connection

# Import the global Base; every model attaches itself on import.
from eos_persistence.base import Base
import eos_persistence.pgvector

# Import each module's models so they register on Base.metadata.
from deos.modules.identity.adapter.persistence import models as identity_models
from deos.modules.agent_runtime.adapter.persistence import (
    models as agent_runtime_models,
)
from deos.modules.tool.adapter.persistence import models as tool_models
from deos.modules.skill.adapter.persistence import models as skill_models
from deos.modules.knowledge.adapter.persistence import models as knowledge_models
from deos.modules.orchestration.adapter.persistence import (
    models as orchestration_models,
)
from deos.modules.agent_factory.adapter.persistence import (
    models as agent_factory_models,
)
from deos.modules.evaluation.adapter.persistence import (
    models as evaluation_models,
)

# Memory (P4) is wired in once modules/memory lands — placeholder for
# memory_models import; left as a comment to keep env.py importable even
# before the module ships.
# from deos.modules.memory.adapter.persistence import models as memory_models

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# URL from env wins over the placeholder in alembic.ini
database_url = os.environ.get("EOS_DATABASE_URL") or config.get_main_option("sqlalchemy.url")
config.set_main_option("sqlalchemy.url", database_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations without a live connection."""
    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations with an async engine."""
    cfg_section = config.get_section(config.config_ini_section, {})
    cfg_section["sqlalchemy.url"] = database_url
    connectable = async_engine_from_config(
        cfg_section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
