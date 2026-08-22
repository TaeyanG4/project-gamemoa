# OwOGG 시스템 아키텍처

상태: 기준 문서

마지막 검증: 2026-08-21

기준 소스:

- `apps/web/app/`
- `apps/api/src/`
- `packages/core/src/`
- `packages/db/src/`
- `packages/db/migrations/`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

이 문서는 현재 `main`의 시스템 경계를 설명합니다. 게임 플랫폼의 더 세부적인 identity,
publication, runtime, score 경계는
[Game Platform Architecture](GAME_PLATFORM_ARCHITECTURE.md)가 주 문서입니다.

## 전체 구조

```text
Browser
  │
  ├─ apps/web ── contracts / game-sdk / shared / ui
  │      │
  │      └─ GameHost → IframeRuntime → MessageChannel Bridge → game bundle
  │
  └─ apps/api ── contracts
         │
         ├─ composition root + thin Hono routes
         ▼
      packages/core
      domain + application + ports
         ▲
         │ adapters
      packages/db
         ├─ Cloudflare D1 repositories
         └─ Backblaze B2 storage adapters
```

프로덕션은 Cloudflare Workers/Workers Static Assets 위에서 실행됩니다. API의 영속 데이터는 D1,
게임 canonical document와 bundle 객체는 B2에 저장됩니다.

## 앱의 책임

### `apps/web`

- React Router SPA와 catalog/profile/admin/creator UI를 제공합니다.
- API 계약을 통해 데이터를 가져오며 D1 repository를 직접 사용하지 않습니다.
- `GameHost`가 public game, signed game session, 결과/리더보드 흐름을 조정합니다.
- `IframeRuntime`과 host-side Bridge가 격리된 standalone bundle을 연결합니다.
- 생성된 Web loader는 Git 소스 게임의 build/check 소비자입니다. 프로덕션 runtime authority가
  아니라는 이유만으로 삭제할 수 있는 파일은 아닙니다.

### `apps/api`

- Hono route, 인증/인가 middleware, rate limit, edge cache, Cloudflare binding을 조립합니다.
- `apps/api/src/container.ts`가 core port와 D1/B2 adapter를 연결하는 composition root입니다.
- 공개 게임 API, immutable bundle serving, 점수 접수, USER upload/review, 관리자 기능을 제공합니다.
- route는 정책을 재구현하지 않고 core use case를 호출합니다.

## 패키지의 책임

| 패키지               | 현재 책임                                                                |
| -------------------- | ------------------------------------------------------------------------ |
| `packages/contracts` | Zod 기반 HTTP request/response 계약과 공유 DTO                           |
| `packages/core`      | 순수 domain model, application service/use case, repository/storage port |
| `packages/db`        | D1 repository와 migration, B2 canonical/bundle adapter                   |
| `packages/game-sdk`  | game runtime context와 Host↔Game Bridge protocol/client                  |
| `packages/shared`    | 앱 간 공유 validation, locale, utility                                   |
| `packages/ui`        | 공통 React UI와 game shell 요소                                          |

`packages/core`는 Hono, React, Cloudflare/D1 구현에 의존하지 않습니다. `packages/db`는 core port의
adapter이며 게임 정책이나 생성 registry를 runtime authority로 사용하지 않습니다.

## 공통 Game Platform

```text
D1
├─ games: identity, publisher authority, visibility, live_version_id
├─ game_versions: immutable version/publication facts
└─ game_assets: provider-neutral game asset metadata

B2
├─ game-definitions/<slug>/definition.json: canonical catalog/policy data
└─ games/<gameId>/<versionId>/...: immutable published bundle

ComposedRuntimeGameRegistry
└─ generic identity + live READY version + valid canonical document
```

`ComposedRuntimeGameRegistry`에는 publisher별 runtime branch가 없습니다. OWOGG와 USER 게임 모두
동일한 public/READY/live/canonical 불변식을 통과해야 합니다. generic 상태가 불완전하면 과거
metadata로 fallback하지 않고 fail closed 합니다.

Web은 `GAME_MANIFESTS`를 catalog/source metadata로만 사용합니다. Source game package dynamic
loader는 gameplay 경로가 아니며, 게임 실행은 항상 generic versioned bundle을 iframe에서
제공합니다.

Publication target은 `(gameId, versionId, contentHash)`입니다. `GamePublicationService`가 상태를
`PUBLISHING`으로 바꾸고 개별 파일을 기록한 뒤 `.owogg-manifest.json`을 마지막에 기록하고, 같은
target에 대해서만 `READY`를 기록합니다. 실패하거나 일부만 기록된 버전은 제공되지 않습니다.

## USER 제어 영역

USER 게임은 generic runtime과 별도로 아래 제어 데이터를 유지합니다.

- `sandbox_games`: developer 소유권, review slot, 편집 가능한 control-plane metadata, visibility
- `sandbox_game_versions`: 원본 archive, 심사 상태, reviewer/reason, upload workflow
- creator 프로그램 자격, review queue, audit trail, approve/reject/revoke/republish
- 사용자별 동시 심사 slot 최대 2개

Migration trigger와 repository write가 USER identity/version/assets를 generic tables로
수렴시킵니다. 수렴은 심사를 제거하지 않습니다. Publication `READY`는 bundle이 완전하게 기록된
상태이고 moderation `APPROVED`는 관리자가 버전을 승인한 상태입니다.

```text
READY != APPROVED
```

## OWOGG bootstrap 제어 영역

OWOGG 게임은 `games/*` 소스와 `game-registry/*` 입력에서 생성된 `GAME_DEFINITIONS`를 사용합니다.
배포 중 `pnpm bootstrap:official-games`가 다음을 결정론적으로 보장합니다.

- `{ type: "OWOGG" }` identity와 영구 slug 예약
- source bundle의 SHA-256 content hash
- generic numeric version과 B2 canonical/bundle
- 동일한 READY hash 재사용, 변경 hash의 새 version publication 후 live activation

이 경로는 USER/sandbox/review row를 만들지 않습니다. Git bootstrap과 향후 interactive
official-admin publication의 우선순위는 아직 결정되지 않았으며 F-1에서 선택하지 않습니다.

## runtime과 점수 경계

```text
/play/:slug
→ generic registry가 live READY version 확인
→ /games/<gameId>/<versionId>/index.html
→ GameHost → IframeRuntime → Bridge
```

`/official-games/*`는 현재 serving surface가 아닙니다. API regression test와 architecture guard가
그 경로의 재도입을 막습니다. 현재 경로는 숫자 game/version 기반 immutable URL뿐입니다.

점수는 signed game session으로 묶입니다. 서버는 attempt를 한 번만 소비하고 game/version/
difficulty binding, 현재 availability, canonical score policy를 다시 검증합니다. iframe 메시지나
클라이언트 표시값만으로 점수를 신뢰하지 않습니다.

## 인증과 인가

일반 사용자 session, 관리자 step-up/session, staff role, 개별 permission, 프로그램 entitlement,
publisher authority는 서로 다른 개념입니다. 상세 모델은 [Authorization](AUTHORIZATION.md)을
따릅니다. 표시 이름이나 slug는 권한의 증거가 아닙니다.

## 배포 흐름

`.github/workflows/deploy.yml`은 검증된 정확한 SHA를 대상으로 다음 순서를 사용합니다.

```text
D1 migrations
→ API Worker deploy
→ API health/provenance
→ OWOGG generic game bootstrap
→ Web build/deploy
→ Web smoke/provenance
→ optional Discord command sync
```

bootstrap이 Web build보다 먼저 실행되므로 배포된 카탈로그와 bundle이 generic runtime authority에
준비된 뒤 Web이 공개됩니다.

## 자동 경계 검증

- `pnpm architecture:check`: 레이어 의존성, 금지된 legacy runtime/route/release-map 패턴 검사
- `pnpm registry:check`: generated game registry freshness 검사
- `pnpm docs:check`: 상대 Markdown 링크, 인덱스, migration metadata 검사
- `pnpm typecheck:scripts`와 `pnpm test:scripts`: scripts 자체의 타입과 테스트 검사

`StaticGameRegistry` runtime authority, `CreatorGameHost`, `transitionalCreatorGameResolver`,
publisher별 runtime 선택, `/official-games` serving, release-map publication은 현재 구조가 아닙니다.
다만 이 이름을 금지하는 negative architecture guard는 의도적인 회귀 방지이므로 유지합니다.

## 함께 읽기

- [Game Platform Architecture](GAME_PLATFORM_ARCHITECTURE.md)
- [Database](DATABASE.md)
- [Authorization](AUTHORIZATION.md)
- [Game Creation Guide](GAME_CREATION_GUIDE.md)
