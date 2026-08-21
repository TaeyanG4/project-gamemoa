# OwOGG Game Platform Architecture

이 문서는 현재 production의 게임 identity, publication, runtime, score 경계를 설명합니다. USER와
OWOGG는 같은 runtime/storage 모델을 사용하지만 authorization과 publication control plane은 서로
다릅니다.

```text
OwOGG Game Platform
├─ D1
│  ├─ GameIdentity (games)
│  ├─ GameVersion (game_versions)
│  ├─ GameAsset (game_assets)
│  └─ settings / visibility / live-version state
├─ B2
│  ├─ GameCanonicalDocument: game-definitions/<slug>/definition.json
│  └─ immutable bundle: games/<gameId>/<versionId>/...
├─ GamePublicationService
│  └─ PUBLISHING → files → manifest last → READY
├─ RuntimeGameRegistry
├─ /play/:slug → /games/<gameId>/<versionId>/index.html
├─ GameHost → IframeRuntime → Bridge → game code
└─ signed, one-use Game Session → generic score acceptance
```

## Shared platform

- `games` owns numeric identity, explicit `OWOGG | USER(userId)` publisher authority, visibility,
  deletion state, and the current live-version pointer.
- `game_versions` owns provider-neutral bundle identity and publication facts. A publication target
  is the immutable tuple `(gameId, versionId, contentHash)`.
- `game_assets` owns provider-neutral game-level asset metadata. Bundle bytes remain immutable and
  version-scoped in B2.
- `GameCanonicalDocument` owns title, description, policy, presentation, difficulty, and catalog
  semantics. It does not own publisher identity, live-version state, environment URLs, or secrets.
- `GamePublicationService` is the only file/manifest publication loop. It writes the manifest last
  and marks READY only for the same validated publication target.
- `RuntimeGameRegistry`, `GameHost`, `IframeRuntime`, Bridge, signed Game Session, and generic score
  acceptance are publisher-neutral production paths.

## USER control plane

The USER workflow deliberately retains `sandbox_games`, `sandbox_game_versions`, review queue,
two review slots, approval/reject/revoke, audit trail, and creator entitlement. The sandbox version
row shares the generic numeric version ID and converges provider-neutral publication facts into
`game_versions`, but review status remains independent: READY is not APPROVED, and a non-READY
version cannot be approved. Failed publication retries the same numeric version and source archive.

## OWOGG bootstrap control plane

The four source game folders and `GAME_DEFINITIONS` are Git-managed inputs. The deterministic build
produces a SHA-256 content hash, and the deployment bootstrap ensures OWOGG identity, numeric
version, canonical parity, permanent slug reservation, and live activation. It creates no USER,
sandbox, or review row. An unchanged READY hash reuses its version; a changed hash allocates and
publishes a new version before activation.

## Official-admin publication authority decision

Current production authority is the deterministic Git deployment bootstrap. An interactive
official-admin upload cannot safely be added as a thin API wrapper: a later deploy could run the
bootstrap and re-activate the Git-managed version. A future product/control-plane decision must
choose and specify one of these models before such an API is implemented:

- **Option A — Git authoritative:** deployment bootstrap continues to control the OWOGG live
  version; admin tooling cannot independently supersede it.
- **Option B — Admin authoritative:** admin-managed versions control the live pointer and deployment
  bootstrap becomes seed/ensure-only.
- **Option C — Explicit provenance and precedence:** persist publication provenance/authority and
  define deterministic conflict and activation precedence.

E-3 records these options but does not select or implement one.

## Known scalability debt

These are follow-up performance topics, not correctness blockers in the current architecture:

- public list/detail composition can require multiple B2 canonical reads (N+1 behavior);
- immutable canonical and manifest reads are candidates for bounded edge/application caching;
- public-list composition cost grows with catalog size and should eventually use batching or a
  materialized read model;
- repeated availability composition can share short-lived cache results while D1 kill-switch and
  live-version correctness remain primary-authority reads.

Any optimization must preserve fail-closed malformed canonical/manifest handling and must not move
score acceptance, signed-session consumption, kill-switch mutation, or current live-version
enforcement onto stale replicas.
