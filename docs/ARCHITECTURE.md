# OwOGG 시스템 아키텍처 (ARCHITECTURE)

OwOGG는 **pnpm Workspaces** 및 **Turborepo** 기반의 **Modular Monolith & Game Plugin Architecture**로 설계되어 Cloudflare 에지 인프라에서 구동됩니다.

```text
                                [ Client Browser ]
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
              [ Apps/Web (React 19) ]      [ Apps/API (Hono) ]
              React Router v7 SPA           Cloudflare Workers
                         │                             │
                         ├─────────────────────────────┤
                         ▼                             ▼
               [@owogg/contracts]           [packages/core]
               Zod Request/Response           Domain/Application
                         │                             │
                         └──────────────┬──────────────┘
                                        ▼
                                [packages/db]
                            Cloudflare D1 Adapter
```

---

## 1. 📂 디렉토리 구조 및 레이어 역할

```text
owogg/
├── apps/
│   ├── web/                     # React 19 + React Router v7 SPA 플랫폼 쉘
│   │   ├── app/features/auth/   # Single Source of Truth 인증 클라이언트
│   │   ├── app/features/catalog/# 동적 게임 카탈로그 및 gameLoaders.generated.ts
│   │   └── app/features/scores/ # 클라이언트 점수 API 및 로컬 캐시 헬퍼
│   └── api/                     # Hono API 백엔드 (Cloudflare Workers / Node.js 호환)
│       ├── src/container.ts     # API Composition Root (의존성 주입 컨테이너)
│       ├── src/auth/admin.ts    # ADMIN_USER_IDS + D1 admin_accounts 권한 가드
│       ├── src/routes/          # Thin Controllers (점수, 인증, 랭킹, 크리에이터, 관리자)
│       └── src/infrastructure/  # Discord HTTP Interactions (Ed25519 서명 검증)
├── games/                       # 독립 미니게임 패키지 (@owogg/game-*)
│   ├── reaction-time/           # 반응속도 테스트
│   ├── memory-test/             # 순서 기억력 테스트
│   ├── aim-test/                # 에임 테스트
│   └── typing-test/             # 타자 속도 테스트
├── packages/
│   ├── contracts/               # Zod 스키마 및 DTO 타입 (API Single Source of Truth)
│   ├── game-sdk/                # 게임 매니페스트 및 호스트 셸 계약
│   ├── core/                    # 순수 도메인 로직, 유즈케이스 및 포트 인터페이스
│   ├── db/                      # Cloudflare D1 Repository 구현체 및 SQL 마이그레이션
│   ├── ui/                      # 공통 UI 컴포넌트 및 GameShell
│   └── shared/                  # 공통 상수 및 헬퍼
├── scripts/                     # Architecture Guard, Registry Generator, 파비콘 생성기
└── docs/                        # 기술 사양서 및 운영 문서
```

---

## 2. 📐 레이어 의존성 및 단방향 흐름

```text
apps/web ➔ @owogg/contracts & @owogg/game-sdk & @owogg/core
apps/api ➔ @owogg/contracts & @owogg/core
   ↓
API Composition Root (apps/api/src/container.ts)
   ↓
@owogg/core/application ➔ @owogg/core/domain ➔ @owogg/core/ports
   ↑
@owogg/db (D1 Repository 어댑터 - 게임 카탈로그 매니페스트와 완전 분리)
```

### 2.1 통합 게임 Identity/Version 경계

- D1 `games`는 OWOGG/USER 공통 identity, publisher authority, visibility, live version 포인터를
  저장합니다.
- D1 `game_versions`는 공통 bundle identity와 publish 상태만 저장합니다. USER 심사 상태·심사자·
  반려 사유는 계속 `sandbox_game_versions`에 남습니다.
- A-4 동안 USER의 `sandbox_game_versions` 쓰기는 migration trigger로 `game_versions`에 수렴하지만,
  production runtime read authority는 아직 기존 SYSTEM/Creator 경로에서 전환하지 않습니다.
- `games.live_version_id`는 같은 `games.id`에 속한 `game_versions.id`만 가리킬 수 있습니다.
- 신규 USER version ID는 `game_versions` 공통 숫자 namespace에서 먼저 할당한 뒤 동일한 ID로 USER
  심사 row를 원자적으로 생성합니다.
- 제목·설명·점수·presentation 등 canonical 의미는 B2
  `game-definitions/<slug>/definition.json`에 유지하며 D1 identity/version과 분리합니다.

---

## 3. 🛡️ 아키텍처 가드 규칙 (Architecture Guard Rules)

`pnpm architecture:check` (`scripts/verify-architecture.ts`), `pnpm registry:check` (`scripts/check-registry.ts`), 및 `pnpm format:check`가 CI에서 자동 검증합니다:

1. **`packages/core` 순수성**: `hono`, `react`, `@cloudflare/*`, `@owogg/db`, 브라우저 API(`window`, `localStorage`), `fetch` 호출 또는 프로덕션 URL을 가질 수 없습니다.
2. **`packages/contracts` 독립성**: `react`, `hono`, `@owogg/db`를 import할 수 없습니다.
3. **`apps/web` 격리**: `@owogg/db` 또는 D1 구체 클래스를 직접 import할 수 없습니다.
4. **`games/*` 격리**: `@owogg/db` 또는 `hono`를 import할 수 없습니다.
5. **`apps/api/src/routes` DI 강제**: 구체 `D1...Repository`를 직접 인스턴스화하지 않고 `createContainer` DI 컨테이너를 주입받아 사용합니다.
6. **`packages/db` 디커플링**: `GAME_MANIFEST_MAP`에 의존하지 않으며 게임 정책과 100% 분리된 순수 SQL 실행기 역할만 수행합니다.
7. **레지스트리 불변성**: `gameRegistry.generated.ts`와 `gameLoaders.generated.ts`는 수동 편집이 금지되며 `pnpm generate:registry`로만 생성됩니다.

---

## 4. 🧩 게임 확장 DX (Game Plugin DX)

새 게임을 추가할 때 **중앙 플랫폼 코드 수정은 0회**입니다:

1. `pnpm generate:game <slug>`로 `games/<slug>` 패키지를 자동 생성합니다.
2. `games/<slug>/src/manifest.ts`에 `export const manifest: GameManifest`를 정의합니다.
3. `pnpm generate:registry`를 실행하면 도메인 레지스트리 및 웹 동적 로더가 자동 빌드됩니다.
4. 프론트엔드와 백엔드는 매니페스트 메타데이터를 기반으로 점수 검증, 정렬, 포맷팅, 동적 로딩을 자동 처리합니다.

---

## 5. ⚡ 인프라 및 프로덕션 스택

- **Hosting / Compute**: Cloudflare Workers Static Assets (Web SPA) + Cloudflare Workers (API)
- **Database**: Cloudflare D1 (Serverless SQLite with atomic batch transactions)
- **Security / Crypto**: Web Crypto API (Ed25519 서명 검증, PBKDF2-HMAC-SHA256, Google RS256 JWKS)
- **Assets**: 결정론적 무의존성 래스터라이저(`scripts/generate-favicon.ts`) 기반 파비콘/PWA 아이콘 세트 생성

---

## 관련 문서

- **Staff Role / 권한 / GAME_CREATOR·STREAMER 프로그램 모델**: [`docs/AUTHORIZATION.md`](AUTHORIZATION.md)
- **계정 식별/통합 절차**: [`docs/runbooks/account-linking.md`](runbooks/account-linking.md)
- **소셜 로그인 설정**: [`docs/runbooks/oauth-setup.md`](runbooks/oauth-setup.md)
- **시점 조사 기록** (확장성 점검, 리플레이 타당성, satori+resvg 렌더링 — 2026-08-14):
  [`docs/archive/architecture-investigations-2026-08.md`](archive/architecture-investigations-2026-08.md)
