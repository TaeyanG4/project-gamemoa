# OwOGG Game Platform 아키텍처

상태: 기준 문서

마지막 검증: 2026-08-21

기준 소스:

- `packages/core/src/modules/game/`
- `packages/core/src/application/gamePublicationService.ts`
- `packages/core/src/application/officialGameBootstrap.ts`
- `apps/api/src/routes/games.ts`
- `apps/api/src/routes/gameServing.ts`
- `apps/web/app/features/game/GameHost.tsx`
- `packages/db/migrations/0029_unified_game_identity.sql`
- `packages/db/migrations/0031_game_version_write_convergence.sql`
- `packages/db/migrations/0032_generic_score_acceptance.sql`
- `packages/db/migrations/0033_generic_game_assets.sql`

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

## 공통 플랫폼

- `games`는 숫자 identity, 명시적 `OWOGG | USER(userId)` publisher authority, visibility, 삭제 상태,
  현재 live-version pointer를 소유합니다.
- `game_versions`는 provider-neutral bundle identity와 publication 사실을 소유합니다. publication
  target은 불변 tuple `(gameId, versionId, contentHash)`입니다.
- `game_assets`는 provider-neutral 게임 단위 asset metadata를 소유합니다. Bundle bytes는 B2에서
  불변이며 version 범위로 유지됩니다.
- `GameCanonicalDocument`는 title, description, policy, presentation, difficulty, catalog 의미를
  소유합니다. publisher identity, live-version 상태, 환경 URL, secret은 소유하지 않습니다.
- `GamePublicationService`는 유일한 file/manifest publication loop입니다. manifest를 마지막에 쓰고,
  검증한 동일 publication target에만 READY를 표시합니다.
- `RuntimeGameRegistry`, `GameHost`, `IframeRuntime`, Bridge, signed Game Session, generic score
  acceptance는 publisher-neutral production 경로입니다.

## USER 제어 영역

USER workflow는 `sandbox_games`, `sandbox_game_versions`, review queue, 두 개의 review slot,
approval/reject/revoke, audit trail, creator entitlement를 의도적으로 유지합니다. sandbox version row는
공통 숫자 version ID를 공유하고 provider-neutral publication 사실을 `game_versions`로 수렴하지만,
review status는 독립적입니다. READY는 APPROVED가 아니며 READY가 아닌 version은 승인할 수 없습니다.
실패한 publication은 동일한 숫자 version과 source archive로 다시 시도합니다.

## OWOGG bootstrap 제어 영역

네 개의 source game 폴더와 `GAME_DEFINITIONS`는 Git이 관리하는 입력입니다. 결정론적 build는
SHA-256 content hash를 생성하고, 배포 bootstrap은 OWOGG identity, 숫자 version, canonical parity,
영구 slug 예약, live 활성화를 보장합니다. USER, sandbox, review row는 만들지 않습니다. 변경되지 않은
READY hash는 기존 version을 재사용하고, 변경된 hash는 활성화 전에 새 version을 할당하고
publication합니다.

## official-admin publication 권한 결정

현재 production authority는 결정론적 Git 배포 bootstrap입니다. 대화형 official-admin upload를 얇은
API wrapper로 안전하게 추가할 수는 없습니다. 이후 배포가 bootstrap을 실행해 Git 관리 version을
다시 활성화할 수 있기 때문입니다. 이 API를 구현하기 전에 향후 product/control-plane 결정으로
다음 model 중 하나를 선택하고 명시해야 합니다.

- **선택지 A — Git 권한 원천:** 배포 bootstrap이 계속 OWOGG live version을 제어하며, admin tooling이
  이를 독립적으로 대체할 수 없습니다.
- **선택지 B — Admin 권한 원천:** admin 관리 version이 live pointer를 제어하고, 배포 bootstrap은
  seed/ensure 역할만 합니다.
- **선택지 C — 명시적 provenance와 precedence:** publication provenance/authority를 저장하고,
  결정론적인 conflict와 activation precedence를 정의합니다.

이 문서는 선택지를 기록하지만 어느 것도 선택하거나 구현하지 않습니다.

## 알려진 확장성 부채

다음은 현재 아키텍처의 correctness blocker가 아니라 후속 performance 주제입니다.

- public list/detail 조합에는 여러 B2 canonical read가 필요할 수 있습니다(N+1 동작).
- 불변 canonical과 manifest read는 범위가 제한된 edge/application caching 후보입니다.
- public-list 조합 비용은 catalog 크기에 따라 증가하므로, 장기적으로 batching이나 materialized read
  model을 사용해야 합니다.
- 반복되는 availability 조합은 짧은 수명의 cache 결과를 공유할 수 있지만 D1 kill-switch와
  live-version correctness는 계속 primary-authority read여야 합니다.

모든 최적화는 잘못된 canonical/manifest를 fail-closed로 처리하는 동작을 보존해야 합니다. score
acceptance, signed-session consumption, kill-switch mutation, 현재 live-version enforcement를 stale
replica로 옮겨서는 안 됩니다.
