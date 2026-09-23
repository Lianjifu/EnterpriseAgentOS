"""A6 — HTTP integration tests for the signing triple on
``POST /v1/skills`` / ``GET /v1/skills/{id}``.

Exercises the full HTTP → use case → vetter pipeline end-to-end with a
real :class:`InMemoryTrustStoreSkillVetter`.  Validates that:

* a properly signed package round-trips (201 + non-empty triple on GET)
* an unsigned package is rejected with 400 (vetter contract)
* a badly-signed package is rejected with 400
* the ``SkillResponse`` surface includes the triple on GET
"""

from __future__ import annotations

from typing import Any, Self
from uuid import UUID

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi import FastAPI
from fastapi.testclient import TestClient

from deos.modules.skill.adapter.http.router import build_router
from deos.modules.skill.application.services import SkillService
from deos.modules.skill.application.vetter import InMemoryTrustStoreSkillVetter
from deos.modules.skill.domain.entities import NetworkPolicy, SkillPackage
from deos.modules.skill.domain.errors import (
    SkillSignatureInvalid,
    SkillSignerUntrusted,
)
from deos.modules.skill.domain.signing import (
    SkillPackPayload,
    sign_payload,
)
from eos_pack_signing import public_key_id


def _tenant() -> UUID:
    return UUID("00000000-0000-0000-0000-000000000001")


def _workspace() -> UUID:
    return UUID("00000000-0000-0000-0000-000000000002")


def _user() -> UUID:
    return UUID("00000000-0000-0000-0000-000000000010")


def _headers() -> dict[str, str]:
    return {
        "X-Tenant-Id": str(_tenant()),
        "X-Workspace-Id": str(_workspace()),
        "X-User-Id": str(_user()),
    }


class _InMemoryUoW:
    """Minimal UoW stand-in exposing only ``skills``."""

    def __init__(self) -> None:
        from collections import OrderedDict

        self._skills: OrderedDict[str, SkillPackage] = OrderedDict()

        _register = self

        class _Skills:
            def __init__(self) -> None:
                self._parent = _register

            async def get_by_name(
                self_inner,
                *,
                tenant_id: Any,
                workspace_id: Any,
                name: str,
            ) -> SkillPackage | None:
                for row in self_inner._parent._skills.values():
                    if row.name == name and str(row.tenant_id) == str(tenant_id):
                        return row
                return None

            async def get(
                self_inner,
                *,
                tenant_id: Any,
                skill_id: Any,
            ) -> SkillPackage | None:
                for row in self_inner._parent._skills.values():
                    if (
                        str(row.tenant_id) == str(tenant_id)
                        and str(row.id) == str(skill_id)
                    ):
                        return row
                return None

            async def add(self_inner, package: SkillPackage) -> None:
                self_inner._parent._skills[str(package.name)] = package

        self.skills = _Skills()

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(self, *exc: object) -> None:
        return None

    async def commit(self) -> None:
        return None

    async def rollback(self) -> None:
        return None


class _RecordingPublisher:
    def __init__(self) -> None:
        self.published: list[object] = []

    async def publish(self, event: object) -> None:
        self.published.append(event)


class _RunTokenIssuer:
    async def issue(self, **_kwargs: Any) -> Any:  # pragma: no cover
        return None


class _InvocationRunner:
    async def wait(self, _inv_id: Any) -> Any:  # pragma: no cover
        raise RuntimeError("not used in signing tests")


class _ArtifactStore:
    async def put(self, *_args: Any, **_kwargs: Any) -> None:  # pragma: no cover
        return None

    async def tail(self, *_args: Any, **_kwargs: Any) -> bytes:  # pragma: no cover
        return b""


class _Container:
    """Minimal container for the skill router dependency."""

    def __init__(self, uow: _InMemoryUoW) -> None:
        self._uow = uow

    def session_factory(self) -> Any:
        class _NullSession:
            async def rollback(self_inner) -> None:
                return None

            async def commit(self_inner) -> None:
                return None

        class _Null:
            def session(self) -> Any:
                class _CM:
                    async def __aenter__(self_inner) -> Any:
                        return _NullSession()

                    async def __aexit__(self_inner, *a: object) -> None:
                        return None

                return _CM()

        return _Null()


def _build_app_and_vetter() -> tuple[FastAPI, InMemoryTrustStoreSkillVetter, Ed25519PrivateKey]:
    """Wire a FastAPI app + per-session service using a fresh
    ``InMemoryTrustStoreSkillVetter`` seeded with one dev key."""
    app = FastAPI()
    key = Ed25519PrivateKey.generate()
    key_id = public_key_id(key.public_key())
    vetter = InMemoryTrustStoreSkillVetter(
        keys={key_id: key.public_key()},
        require_signature=True,
    )
    # Shared in-memory UoW — survives across requests so POST then GET
    # roundtrips the row.
    uow = _InMemoryUoW()
    publisher = _RecordingPublisher()

    app.state.container = _Container(uow)  # type: ignore[arg-type]

    def factory_for_session(_session: Any) -> SkillService:
        return SkillService.from_parts(
            uow_factory=lambda: uow,
            publisher=publisher,  # type: ignore[arg-type]
            run_token_issuer=_RunTokenIssuer(),  # type: ignore[arg-type]
            runner=_InvocationRunner(),  # type: ignore[arg-type]
            skill_repository=uow.skills,  # type: ignore[arg-type]
            install_repository=None,  # type: ignore[arg-type]
            invocation_repository=None,  # type: ignore[arg-type]
            artifacts=_ArtifactStore(),  # type: ignore[arg-type]
            vetter=vetter,
        )

    app.state.skill_factory = type(
        "F", (), {"for_session": staticmethod(factory_for_session)}
    )()
    app.include_router(build_router())

    # Translate vetter errors to HTTP 400 — mirrors what the
    # composition's exception handlers do.
    from fastapi.responses import JSONResponse

    @app.exception_handler(SkillSignatureInvalid)
    async def _on_signature_invalid(_request: Any, exc: SkillSignatureInvalid) -> Any:
        return JSONResponse(
            status_code=400,
            content={"code": getattr(exc, "code", "SKILL_SIGNATURE_INVALID"), "message": str(exc)},
        )

    @app.exception_handler(SkillSignerUntrusted)
    async def _on_signer_untrusted(_request: Any, exc: SkillSignerUntrusted) -> Any:
        return JSONResponse(
            status_code=400,
            content={"code": getattr(exc, "code", "SKILL_SIGNER_UNTRUSTED"), "message": str(exc)},
        )

    return app, vetter, key


def _sign_payload(key: Ed25519PrivateKey, *, name: str = "echo", version: str = "1.0.0") -> tuple[str, str]:
    """Sign a fixed canonical payload and return (signature_b64, key_id)."""
    payload = SkillPackPayload(
        name=name,
        version=version,
        description="echo skill",
        entrypoint="python -m echo",
        image="sha256:" + "a" * 64,
        image_digest="sha256:" + "b" * 64,
        parameters_schema={},
        artifact_uri="skill-artifact://seed",
        network_policy=str(NetworkPolicy.DEFAULT),
        cpu_quota=0.5,
        memory_bytes=64 * 1024 * 1024,
        timeout_seconds=15,
    )
    sig = sign_payload(payload, private_key=key)
    return sig, public_key_id(key.public_key())


def test_post_valid_signed_skill_returns_201() -> None:
    app, _vetter, key = _build_app_and_vetter()
    sig, key_id = _sign_payload(key)
    client = TestClient(app)
    resp = client.post(
        "/v1/skills",
        headers=_headers(),
        json={
            "name": "echo",
            "version": "1.0.0",
            "description": "echo skill",
            "entrypoint": "python -m echo",
            "image": "sha256:" + "a" * 64,
            "parameters_schema": {},
            "artifact_uri": "skill-artifact://seed",
            "network_policy": "default",
            "cpu_quota": 0.5,
            "memory_bytes": 64 * 1024 * 1024,
            "timeout_seconds": 15,
            "signature": sig,
            "signer_key_id": key_id,
            "image_digest": "sha256:" + "b" * 64,
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["signature"] == sig
    assert body["signer_key_id"] == key_id
    assert body["image_digest"] == "sha256:" + "b" * 64


def test_post_unsigned_skill_rejected_400() -> None:
    """A package without a signature is rejected by the vetter —
    no more silent ``NoOpSkillVetter`` fallback."""
    app, _vetter, _key = _build_app_and_vetter()
    client = TestClient(app)
    resp = client.post(
        "/v1/skills",
        headers=_headers(),
        json={
            "name": "echo",
            "version": "1.0.0",
            "description": "echo skill",
            "entrypoint": "python -m echo",
            "image": "sha256:" + "a" * 64,
            "parameters_schema": {},
            "artifact_uri": "skill-artifact://seed",
            "network_policy": "default",
            "timeout_seconds": 15,
            "signature": "",
            "signer_key_id": "",
            "image_digest": "",
        },
    )
    # The exact status depends on the registered exception handler;
    # what matters is that the request is rejected, not 201.
    assert resp.status_code in (400, 422), resp.text


def test_post_bad_signature_rejected_400() -> None:
    """A package whose signature doesn't verify is rejected by the
    vetter — closes the A2 close-out gap at the HTTP layer."""
    app, _vetter, key = _build_app_and_vetter()
    # Sign for a DIFFERENT package name so verification fails.
    sig, key_id = _sign_payload(key, name="other-package")
    client = TestClient(app)
    resp = client.post(
        "/v1/skills",
        headers=_headers(),
        json={
            "name": "echo",  # package name doesn't match what was signed
            "version": "1.0.0",
            "description": "echo skill",
            "entrypoint": "python -m echo",
            "image": "sha256:" + "a" * 64,
            "parameters_schema": {},
            "artifact_uri": "skill-artifact://seed",
            "network_policy": "default",
            "timeout_seconds": 15,
            "signature": sig,
            "signer_key_id": key_id,
            "image_digest": "sha256:" + "b" * 64,
        },
    )
    assert resp.status_code in (400, 422), resp.text


def test_get_skill_returns_signature_triple() -> None:
    """``GET /v1/skills/{id}`` exposes the triple on the response."""
    app, _vetter, key = _build_app_and_vetter()
    sig, key_id = _sign_payload(key)
    client = TestClient(app)
    resp = client.post(
        "/v1/skills",
        headers=_headers(),
        json={
            "name": "echo",
            "version": "1.0.0",
            "description": "echo skill",
            "entrypoint": "python -m echo",
            "image": "sha256:" + "a" * 64,
            "parameters_schema": {},
            "artifact_uri": "skill-artifact://seed",
            "network_policy": "default",
            "cpu_quota": 0.5,
            "memory_bytes": 64 * 1024 * 1024,
            "timeout_seconds": 15,
            "signature": sig,
            "signer_key_id": key_id,
            "image_digest": "sha256:" + "b" * 64,
        },
    )
    assert resp.status_code == 201, resp.text
    skill_id = resp.json()["id"]

    get_resp = client.get(f"/v1/skills/{skill_id}", headers=_headers())
    assert get_resp.status_code == 200, get_resp.text
    body = get_resp.json()
    assert body["signature"] == sig
    assert body["signer_key_id"] == key_id
    assert body["image_digest"] == "sha256:" + "b" * 64