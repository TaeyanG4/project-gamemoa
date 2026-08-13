# GAMEMOA 아키텍처 및 모노레포 설계 (ARCHITECTURE)

GAMEMOA는 **pnpm Workspaces** 및 **Turborepo** 기반의 **Clean Monorepo & Game Plugin Architecture**로 설계되었습니다.

```text
gamemoa/
├── apps/
│   ├── web/                     # 플랫폼 쉘 및 웹 앱 (React Router v7 SPA)
│   │   ├── app/features/auth/   # Single Source of Truth 인증 클라이언트 (Google GIS, Discord OAuth)
│   │   ├── app/features/catalog/# 동적 게임 카탈로그 및 레지스트리 로더
│   │   │   └── gameLoaders.generated.ts # 자동 생성된 웹 동적 임포트 로더
│   │   └── app/features/scores/ # 클라이언트 점수 API 및 저장소 헬퍼
│   └── api/                     # Hono API 백엔드 (Cloudflare Workers / Node.js portable)
│       ├── src/container.ts     # API Composition Root (의존성 주입 컨테이너)
│       ├── src/auth/admin.ts    # 명시적 ADMIN_USER_IDS 서버 권한 가드
│       ├── src/routes/adminCreators.ts # 보호된 Creator 수동 심사 Thin Controller
│       └── src/infrastructure/discord/ # Discord HTTP Interactions (Ed25519 서명 검증, 명령어 정의/핸들러) — Gateway 없음
├── games/
│   ├── reaction-time/           # 반응속도 테스트 게임 모듈 (@gamemoa/game-reaction-time)
│   ├── memory-test/             # 순서 기억력 테스트 게임 모듈 (@gamemoa/game-memory-test)
│   └── aim-test/                # 에임 테스트 게임 모듈 (@gamemoa/game-aim-test)
├── packages/
│   ├── contracts/               # Zod 요청/응답 스키마 및 DTO 타입 (@gamemoa/contracts)
│   ├── game-sdk/                # 게임 매니페스트 및 호스트 계약 (@gamemoa/game-sdk)
│   ├── core/                    # 순수 도메인 엔티티, 유즈케이스 및 포트 (@gamemoa/core)
│   │   ├── src/domain/          # 순수 도메인 엔티티 (점수 검증, 진행도/레벨 공식, 도전과제 정의, 닉네임/국가 정책, Featured 자격 정책)
│   │   ├── src/application/     # 애플리케이션 유즈케이스 (ScoreUseCases, PersonalizationUseCases, IdentityUseCases, AccountMergeUseCases, ProgressionUseCases, AchievementUseCases, ProfileUseCases, DiscordLinkUseCases, CreatorUseCases)
│   │   ├── src/ports/           # 저장소 포트 인터페이스 (UserRepository, AccountMergeRepository, ProgressionRepository, AchievementRepository, DiscordLinkRepository, CreatorRepository, CreatorReviewRepository 포함)
│   │   └── src/registry/        # 자동 생성된 도메인 레지스트리 (gameRegistry.generated.ts)
│   ├── db/                      # Cloudflare D1 저장소 어댑터 및 SQL 마이그레이션 (@gamemoa/db)
│   │   └── migrations/         # 0000 초기 스키마, 0002 점수 인증 무결성, 0003 계정 식별(UNIQUE(user_id,provider)), 0004 계정 통합 챌린지, 0005 진행도(XP/레벨/도전과제) + 닉네임/국가 메타데이터, 0006 Discord 계정 연동 챌린지, 0009-0010 Discord 길드/XP, 0010-0011 Creator 파운데이션/지표, 0012 Creator 심사 잡, 0013 수동 심사 감사/14일 재검증
│   ├── ui/                      # 공통 UI 컴포넌트 및 GameShell 컨테이너 (@gamemoa/ui)
│   └── shared/                  # 공통 유틸리티 및 re-export (@gamemoa/shared)
├── scripts/
│   ├── generate-game.ts         # 새 게임 생성 스캐폴딩 CLI (pnpm generate:game <slug>)
│   ├── generate-game-registry.ts# 빌드 타임 이중 레지스트리 자동 생성기 (pnpm generate:registry)
│   ├── generate-favicon.ts      # 결정론적 파비콘/PNG/ICO 자산 생성기 (pnpm generate:favicon)
│   ├── prepare-web-build.ts     # SPA 빌드 준비 스크립트
│   ├── post-web-build.ts        # 버전 provenance + SPA 셸 파비콘 링크 주입 스크립트
│   ├── check-registry.ts        # 레지스트리 최신성 및 불변성 검증기 (pnpm registry:check)
│   └── verify-architecture.ts   # 아키텍처 가드 레이어 경계 검증기 (pnpm architecture:check)
└── .github/workflows/
    ├── ci.yml                   # CI 워크플로우 (Install ➔ Format ➔ Lint ➔ Arch ➔ Registry ➔ Typecheck ➔ Test ➔ Build)
    └── deploy.yml               # CD 워크플로우 (workflow_run ➔ D1 Migrate ➔ API Deploy ➔ Health/Smoke Check)
```

---

## 1. 📐 레이어 의존성 아키텍처 (Layer Dependency Architecture)

```text
apps/web ➔ @gamemoa/contracts & @gamemoa/game-sdk & @gamemoa/core
apps/api ➔ @gamemoa/contracts & @gamemoa/core
   ↓
API Composition Root (apps/api/src/container.ts)
   ↓
@gamemoa/core/application (ScoreUseCases) ➔ @gamemoa/core/domain ➔ @gamemoa/core/ports
   ↑
@gamemoa/db (Cloudflare D1 저장소 어댑터 - 게임 카탈로그 매니페스트와 완전 분리)
```

- `apps/api/src/routes`는 세션 인증과 `ADMIN_USER_IDS` 서버 설정을 통과한 뒤에만 Creator 수동 심사 자료를 조회하거나 결정할 수 있습니다.
- `apps/api/src/index.ts`의 단일 Cron 핸들러는 6시간 취득 심사와 14일 Featured 재검증을 별도 repository query와 bounded batch로 실행합니다.
- `creator_review_audit_log`는 일반 API에서 UPDATE/DELETE하지 않는 append-only 감사 원장입니다.

---

## 2. 🛡️ 아키텍처 가드 규칙 (Architecture Guard Rules)

`pnpm architecture:check` (`scripts/verify-architecture.ts`), `pnpm registry:check` (`scripts/check-registry.ts`), 및 `pnpm format:check`는 모든 CI 빌드 시 실행되어 아래의 경계 규칙을 자동으로 검증합니다:

1. **`packages/core`**: `hono`, `react`, `@cloudflare/*`, 또는 `@gamemoa/db`를 import할 수 없습니다.
2. **`packages/contracts`**: `react`, `hono`, 또는 `@gamemoa/db`를 import할 수 없습니다.
3. **`apps/web`**: `@gamemoa/db` 또는 D1 구체 클래스를 직접 import할 수 없습니다.
4. **`games/*`**: `@gamemoa/db` 또는 `hono`를 import할 수 없습니다.
5. **`apps/api/src/routes`**: 구체 `D1...Repository` 클래스를 직접 생성할 수 없으며, `createContainer` 의존성 주입을 사용해야 합니다.
6. **`apps/web/package.json`**: `@gamemoa/db` 또는 구 `@gamemoa/auth`를 의존성으로 포함할 수 없습니다.
7. **`packages/core` 순수성**: 브라우저 API (`window`, `localStorage`), HTTP `fetch` 호출, 또는 프로덕션 환경 URL을 가질 수 없습니다.
8. **`packages/db` 디커플링**: `GAME_MANIFEST_MAP` 또는 `GAME_MANIFESTS`를 import할 수 없으며, D1 저장소는 게임 정책과 100% 분리됩니다.
9. **레지스트리 최신성 및 불변성**: `gameRegistry.generated.ts`와 `gameLoaders.generated.ts`는 `pnpm generate:registry` 결과와 100% 일치해야 합니다.

---

## 3. 🧩 게임 확장 DX (Game Extensibility DX)

새 게임을 추가할 때 **중앙 코드 수정이 전혀 필요하지 않습니다 (0회)**:

1. `pnpm generate:game <game-slug>` 명령어를 통해 `games/<game-slug>` 모듈을 생성합니다.
2. `src/manifest.ts`에 `export const manifest` (`scoreConfig` 단주, 정렬 방향, 최소/최대값, 접두사, 접미사)를 정의합니다.
3. `pnpm generate:registry`를 실행하면 도메인 레지스트리(`gameRegistry.generated.ts`)와 웹 로더 레지스트리(`gameLoaders.generated.ts`)가 자동으로 빌드 타임 컴파일됩니다.
4. 프론트엔드와 백엔드는 매니페스트 메타데이터를 활용하여 점수 검증, 정렬, 웹 동적 임포트, 포맷팅을 자동으로 처리합니다.

---

## 4. 🧬 계정 식별/통합 및 파비콘 (Identity & Brand)

1. **계정 식별 모델**: Google/Discord 로그인을 기본적으로 별도 GAMEMOA 계정으로 분리하며, 이메일은 자동 병합 근거가 아닙니다. 정규 식별자는 `provider` + `provider_user_id`이며, `IdentityUseCases`가 연결/연결해제 도메인 규칙(`ACCOUNT_ALREADY_LINKED`, `PROVIDER_ALREADY_LINKED`, `LAST_AUTH_PROVIDER`)을 담당합니다. LOGIN과 LINK 흐름은 명시적으로 분리됩니다.
2. **Primary Account Wins 통합**: `AccountMergeUseCases` + `AccountMergeRepository`가 단기/일회용 `account_merge_challenges`(마이그레이션 `0004`) 기반 원자 통합을 수행합니다. D1 `batch` 단일 트랜잭션으로 Secondary 게임/개인화/세션 데이터를 삭제하고 Secondary OAuth 식별자를 Primary로 이전한 뒤 Secondary 사용자를 삭제합니다. 기록은 합집합하지 않고 Primary 데이터만 유지합니다.
3. **Google JWT 검증**: 프로덕션은 `oauth2.googleapis.com/tokeninfo`에 의존하지 않고 Google OpenID JWKS로 로컬 RS256 서명 검증과 `iss`/`aud`/`exp`/`sub` 검증을 수행합니다.
4. **파비콘**: 캐노니컬 원본은 `apps/web/public/favicon.svg`이며, 결정론적 `scripts/generate-favicon.ts`(의존성 없는 PNG/ICO 인코더 + 초과샘플링 래스터라이저)가 동일 파라메트릭 디자인에서 `favicon.ico`, PNG(16/32/48/180/192/512), `apple-touch-icon.png`, `site.webmanifest`를 생성합니다. SPA `index.html` 셸에 파비콘/애플터치/매니페스트 링크가 주입됩니다. 상세 절차는 `docs/runbooks/oauth-setup.md` 및 `docs/runbooks/account-linking.md`를 참조.
