# GAMEMOA Architecture & Refactoring Goal Progress

## Goal

GAMEMOA 프로젝트의 장기 확장성을 위한 전체 아키텍처 점검, 폴더 구조 개선, API Composition Root, Game Manifest/Registry 자동화, Architecture Guard 구축, 기술 부채 완전 제거, 2차 Architecture Stabilization 및 Game Plugin Architecture 완성을 달성했습니다.

## Target Modular Monolith Architecture

- **Web**: `apps/web` ➔ `@gamemoa/contracts` & `@gamemoa/ui` & `@gamemoa/game-sdk` & `@gamemoa/core`
- **API**: `apps/api` (Composition Root: `container.ts`) ➔ `@gamemoa/core` (Application/Domain/Ports) ➔ `@gamemoa/db` (Cloudflare D1 Adapter)
- **Contracts**: `@gamemoa/contracts` (`packages/contracts`) - Zod request/response schemas & types
- **Game Architecture**: Game Manifest Single Source of Truth + Build-time Dual Registry Generator (`scripts/generate-game-registry.ts`) + Game Template Generator (`scripts/generate-game.ts`)
- **Architecture Guard**: `pnpm architecture:check` (`scripts/verify-architecture.ts`) + `pnpm registry:check` (`scripts/check-registry.ts`) + `pnpm format:check` + CI Automated Blocking

## Completed Checkpoints

- [x] **Phase 0: Baseline & Baseline Lock**
  - Verified baseline commit `352a3be` and production health (`https://gamemoa-api.gamemoa.workers.dev/api/health` -> `{ status: "ok" }`, `https://gamemoa-web.gamemoa.workers.dev/` -> `200`).
- [x] **Phase 1: Game Registry & Web Loaders Dual Automation (P1)**
  - Updated `scripts/generate-game-registry.ts` to dynamically scan `games/*/package.json` package names and `src/manifest.ts`.
  - Auto-generates both `packages/core/src/registry/gameRegistry.generated.ts` AND `apps/web/app/features/catalog/gameLoaders.generated.ts`.
  - Standardized `export const manifest` across all game packages.
  - Enhanced `scripts/check-registry.ts` to check freshness of both manifest and loader registry files.
- [x] **Phase 2: Decouple D1 Score Repository from Game Catalog Policy (P2)**
  - Completely removed `GAME_MANIFEST_MAP` import from `D1ScoreRepository`.
  - `D1ScoreRepository` is now a pure SQL persistence adapter.
  - `getUserPersonalBests(userId)` returns raw aggregates (`min_score`, `max_score`), and `getLeaderboard(gameId, limit, direction)` accepts ordering direction parameter.
- [x] **Phase 3: API Contracts Single Source of Truth (P3)**
  - Moved `scoreSubmissionSchema`, `LeaderboardQuerySchema`, and DTO schemas into `@gamemoa/contracts`.
  - Re-exported schemas in `@gamemoa/shared` to eliminate definition duplication.
- [x] **Phase 4: Core Layering & Application Use Cases (P4, P5)**
  - Restructured `packages/core/src/` into `domain/`, `application/`, `ports/`, `errors/`, `registry/`.
  - Implemented `ScoreUseCases` in Application Layer (`packages/core/src/application/scoreUseCases.ts`).
  - Updated API Composition Root (`apps/api/src/container.ts`) to instantiate repositories and `ScoreUseCases`.
  - Refactored `apps/api/src/routes/scores.ts` into a thin HTTP controller.
- [x] **Phase 5: Security Hardening (P7)**
  - Added Origin/CSRF verification guard middleware on state-changing API endpoints (`POST`, `PUT`, `DELETE`, `PATCH`).
- [x] **Phase 6: Aim Test UX Polish & Responsiveness (P8)**
  - Made Aim Test arena responsive using percentage coordinates (`xPercent`, `yPercent`) and aspect ratio `aspect-[4/3]`.
  - Extracted pure aim test logic into `games/aim-test/src/logic.ts` with unit tests in `games/aim-test/test/aimTest.test.ts`.
- [x] **Phase 7: Tooling & Wrangler Cleanup (P9, P10, P11)**
  - Unified Wrangler version (`^4.121.0`) across root, `apps/web`, and `apps/api`.
  - Replaced inline `node -e` build script with explicit script `scripts/prepare-web-build.ts`.
  - Added `Format Check` (`pnpm format:check`) step to `.github/workflows/ci.yml`.
- [x] **Phase 8: Full Quality Gate Verification & CI/CD Green**
  - Verified local quality gate pipeline: `pnpm generate:registry` ➔ `pnpm architecture:check` ➔ `pnpm registry:check` ➔ `pnpm format:check` ➔ `pnpm lint` ➔ `pnpm typecheck` ➔ `pnpm test` ➔ `pnpm build` (All Green!).
