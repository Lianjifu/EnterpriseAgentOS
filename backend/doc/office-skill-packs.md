# A6 — Office Skill Packs: Authoring, Signing, Trust Store

P10 ships with 4 pre-signed **office** skill packs in
[`backend/packs/office/skills/`](../../packs/office/skills/).  This
document explains how they are built, signed, and verified at runtime.

## Pack format

A pack directory contains exactly three files:

```
<pack_id>/
    manifest.json     # 12 canonical fields, json.dumps(sort_keys=True)
    signature.json    # {"signature": "<b64>", "signer_key_id": "<hex>"}
    entrypoint.py     # def main(argv: list[str]) -> dict stub
```

`manifest.json` covers the **12 canonical fields** that the vetter
signs over:

```
name, version, description, entrypoint, image, image_digest,
parameters_schema, artifact_uri, network_policy, cpu_quota,
memory_bytes, timeout_seconds
```

Any change to one of these fields requires a fresh signature — the
[`scripts/pack_sign.py`](../../scripts/pack_sign.py) CLI is the only
supported way to (re)sign.

## Authoring flow

```bash
cd backend

# 1. (one-time) Generate a dev keypair
uv run --frozen python scripts/dev_signing_keygen.py \
    -o .eos/skill-trust -p eos-office-dev

# 2. (one-time) Seed the trust store with the public half
uv run --frozen python scripts/pack_trust_seed.py \
    .eos/skill-trust/eos-office-dev.pub.pem .eos/skill-trust

# 3. (per-pack change) Sign a pack
uv run --frozen python scripts/pack_sign.py \
    packs/office/skills/skp.office.email_triage \
    -k .eos/skill-trust/eos-office-dev.priv.pem

# 4. (one-time) Migration + boot
alembic upgrade head   # picks up 0016_skill_signing

EOS_SKILL_SIGNING_MODE=local \
EOS_SKILL_TRUST_DIR=./.eos/skill-trust \
EOS_PLATFORM_SEED_OFFICE_SKILL_PACKS=true \
EOS_PLATFORM_OFFICE_SKILL_PACKS_ROOT=$(pwd)/packs/office/skills \
    uv run --frozen python -m deos.composition.main
# Expected log: "seeded 4 office skill packs (vetter=local, trust_keys=1, ...)"
```

## Configuration

| Env var | Default | Meaning |
|---|---|---|
| `EOS_SKILL_SIGNING_MODE` | `disabled` | `disabled` = `NoOpSkillVetter` (dev/test opt-out). `local` = `LocalTrustStoreSkillVetter` (fails boot if trust dir is missing/empty). `vault` = not implemented in A6 (boot fails with a clear error). |
| `EOS_SKILL_TRUST_DIR` | `./.eos/skill-trust` | Directory of `<key_id>.pub.pem` files used by `local` mode. |
| `EOS_PLATFORM_SEED_OFFICE_SKILL_PACKS` | `true` | If `true`, the lifespan walker registers every pack in `EOS_PLATFORM_OFFICE_SKILL_PACKS_ROOT` against the demo tenant + workspace. |
| `EOS_PLATFORM_OFFICE_SKILL_PACKS_ROOT` | `packs/office/skills` | Root directory for pack directories (relative paths resolve against the backend root). |

## Trust store mechanics

`LocalTrustStoreSkillVetter` scans `<trust_dir>/*.pub.pem` **once at
construction** and builds an in-memory `{key_id: Ed25519PublicKey}`
cache.  Empty / missing directories fail boot — there is no silent
`NoOpSkillVetter` fallback (A2 close-out gap).  `key_id` is
`sha256(pem_bytes).hexdigest()`.

Repeat key lookups are O(1) dict lookups against the cache.  Trust
store rotations require process restart; for hot-rotation use the
`vault` mode (Tier B).

## Runtime gate

`RegisterSkillUseCase` runs the vetter **before** any persistence
write.  Unsigned packages raise `SkillSignatureInvalid` (HTTP 400);
keys not in the trust store raise `SkillSignerUntrusted` (HTTP 400).
The same gate applies to `UpdateSkillUseCase` when the caller
re-supplies the triple.

`assert_image_digest_matches` is wired but not yet invoked — A6 uses
deterministic placeholder digests and the registry integration is a
follow-up.  Documented inline with `# TODO A6` markers.

## Testing

```bash
cd backend

# Signing + wire-up + HTTP integration (49 A6 cases)
uv run --frozen pytest \
    modules/skill/tests/unit/test_skill_signing_wireup.py \
    modules/skill/tests/unit/test_skill_signing_and_vetter.py \
    modules/skill/tests/unit/test_pack_loader.py \
    modules/skill/tests/unit/test_pack_sign.py \
    modules/skill/tests/integration/test_skill_http_signing.py \
    --no-cov -p no:cacheprovider

# Full skill module regression (87 cases incl. A6)
uv run --frozen pytest modules/skill/tests/ --no-cov -p no:cacheprovider
```

## Out of scope (Tier B / future)

- Knowledge / Plan / Workflow / Scenario pack signing — separate vetters needed
- `VaultBackedSkillVetter` — Tier B (fails loud today if `skill_signing_mode=vault`)
- Runtime entrypoint behavior — each pack's `entrypoint.py` is a stub
- `assert_image_digest_matches` enforcement at install time
- Per-tenant pack overrides (workspace-level trust stores)