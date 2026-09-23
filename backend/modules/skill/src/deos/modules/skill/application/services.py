"""SkillService — composition root for use cases.

Each use case is a thin dataclass holding its ports. `SkillService`
binds them to the UnitOfWork + outbound adapters and is itself created
by `SkillServiceFactory.for_session(session)` so per-request state is
fresh and the use cases can stay stateless.

Mirrors the ToolService pattern from P2 to keep the code paths
symmetric.
"""

from __future__ import annotations

from dataclasses import dataclass

from deos.modules.skill.application.invocation_runner import InvocationRunner
from deos.modules.skill.application.ports import (
    RunTokenIssuer,
    SkillArtifactStore,
    SkillEventPublisher,
    SkillInstallRepository,
    SkillInvocationRepository,
    SkillRepository,
    UnitOfWork,
)
from deos.modules.skill.application.use_cases import (
    CancelInvocationUseCase,
    DisableSkillUseCase,
    GetActiveInstallUseCase,
    GetInvocationUseCase,
    GetSkillUseCase,
    InstallSkillUseCase,
    InvokeSkillUseCase,
    ListInvocationsUseCase,
    ListSkillsUseCase,
    RegisterSkillUseCase,
    UpdateSkillUseCase,
)


@dataclass(slots=True)
class SkillService:
    uow_factory: type[UnitOfWork]
    publisher: SkillEventPublisher
    run_token_issuer: RunTokenIssuer
    runner: InvocationRunner
    skill_repository: SkillRepository
    install_repository: SkillInstallRepository
    invocation_repository: SkillInvocationRepository
    artifacts: SkillArtifactStore
    run_token_ttl_seconds: int = 300

    register_skill: RegisterSkillUseCase | None = None
    update_skill: UpdateSkillUseCase | None = None
    disable_skill: DisableSkillUseCase | None = None
    list_skills: ListSkillsUseCase | None = None
    get_skill: GetSkillUseCase | None = None
    install_skill: InstallSkillUseCase | None = None
    invoke_skill: InvokeSkillUseCase | None = None
    cancel_invocation: CancelInvocationUseCase | None = None
    get_invocation: GetInvocationUseCase | None = None
    list_invocations: ListInvocationsUseCase | None = None
    get_active_install: GetActiveInstallUseCase | None = None

    def __post_init__(self) -> None:
        self.register_skill = RegisterSkillUseCase(
            uow_factory=self.uow_factory, publisher=self.publisher
        )
        self.update_skill = UpdateSkillUseCase(
            uow_factory=self.uow_factory, publisher=self.publisher
        )
        self.disable_skill = DisableSkillUseCase(
            uow_factory=self.uow_factory, publisher=self.publisher
        )
        self.list_skills = ListSkillsUseCase(uow_factory=self.uow_factory)
        self.get_skill = GetSkillUseCase(uow_factory=self.uow_factory)
        self.install_skill = InstallSkillUseCase(
            uow_factory=self.uow_factory,
            publisher=self.publisher,
            run_token_issuer=self.run_token_issuer,
            run_token_ttl_seconds=self.run_token_ttl_seconds,
        )
        self.invoke_skill = InvokeSkillUseCase(
            uow_factory=self.uow_factory,
            publisher=self.publisher,
            runner=self.runner,
        )
        self.cancel_invocation = CancelInvocationUseCase(
            uow_factory=self.uow_factory, runner=self.runner
        )
        self.get_invocation = GetInvocationUseCase(uow_factory=self.uow_factory)
        self.list_invocations = ListInvocationsUseCase(uow_factory=self.uow_factory)
        self.get_active_install = GetActiveInstallUseCase(uow_factory=self.uow_factory)

    @classmethod
    def from_parts(
        cls,
        *,
        uow_factory: type[UnitOfWork],
        publisher: SkillEventPublisher,
        run_token_issuer: RunTokenIssuer,
        runner: InvocationRunner,
        skill_repository: SkillRepository,
        install_repository: SkillInstallRepository,
        invocation_repository: SkillInvocationRepository,
        artifacts: SkillArtifactStore,
        run_token_ttl_seconds: int = 300,
    ) -> SkillService:
        return cls(
            uow_factory=uow_factory,
            publisher=publisher,
            run_token_issuer=run_token_issuer,
            runner=runner,
            skill_repository=skill_repository,
            install_repository=install_repository,
            invocation_repository=invocation_repository,
            artifacts=artifacts,
            run_token_ttl_seconds=run_token_ttl_seconds,
        )


__all__ = ["SkillService"]
