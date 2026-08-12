# GAMEMOA Architecture & Refactoring Goal Progress

## Goal
GAMEMOA 프로젝트의 장기 확장성을 위한 전체 아키텍처 점검, 폴더 구조 개선, API Composition Root, Game Manifest/Registry 자동화, Architecture Guard 구축 및 신규 게임 확장성 검증을 완수했습니다.

## Target Modular Monolith Architecture
- **Web**: `apps/web` ➔ `@gamemoa/contracts` & `@gamemoa/ui` & `@gamemoa/game-sdk`
- **API**: `apps/api` (Composition Root: `container.ts`) ➔ `@gamemoa/core` (Application/Domain/Ports) ➔ `@gamemoa/db` (Cloudflare D1 Adapter)
- **Contracts**: `@gamemoa/contracts` (`packages/contracts`) - Zod request/response schemas & types
- **Game Architecture**: Game Manifest Single Source of Truth + Build-time Registry Generator (`scripts/generate-game-registry.ts`) + Game Template Generator (`scripts/generate-game.ts`)
- **Architecture Guard**: `pnpm architecture:check` (`scripts/verify-architecture.ts`) + CI Automated Blocking

## Completed Checkpoints
- [x] **Phase 0: Baseline & Integration Tests**
  - Locked in API behavior with Hono integration tests (`apps/api/test/api.test.ts`).
  - Added web catalog & score validation tests (`apps/web/app/test/catalog.test.ts`).
- [x] **Phase 1: API Contracts Package (`@gamemoa/contracts`)**
  - Created `@gamemoa/contracts` (`packages/contracts`) with Zod schemas & TypeScript types for Auth, Scores, Leaderboard, and Common API Error handling.
  - Linked workspace dependencies across `@gamemoa/shared`, `@gamemoa/api`, `@gamemoa/web`.
- [x] **Phase 2: Core Layering & API Composition Root (`apps/api/src/container.ts`)**
  - Implemented API Composition Root (`createContainer(c.env.DB)`) in `apps/api/src/container.ts`.
  - Refactored `auth.ts` and `scores.ts` route handlers to receive repositories via Dependency Injection, eliminating direct `new D1...Repository` calls in routes.
- [x] **Phase 3: Game Manifest, Server-Safe Validation & Registry Automation**
  - Added `ScoreConfig` (`unit`, `direction`, `min`, `max`) to `GameManifest`.
  - Created `scripts/generate-game-registry.ts` to automatically generate `gameRegistry.generated.ts` containing manifests and manifest-driven score validation logic.
  - Removed manual `switch(gameId)` statements from server-side score validation.
- [x] **Phase 4: Architecture Guard Construction (`scripts/verify-architecture.ts`)**
  - Created `scripts/verify-architecture.ts` and added `pnpm architecture:check`.
  - Added `Architecture Check` step to `.github/workflows/ci.yml` to automatically block cross-layer dependency violations in CI.
- [x] **Phase 5: Web Feature-Based Structure Refactoring (`apps/web/app/features/`)**
  - Extracted `apps/web/app/features/auth/` (`authService.ts`, `AuthContext.tsx`).
- [x] **Phase 6: Game Generator & Extensibility Verification**
  - Created `scripts/generate-game.ts` (`pnpm generate:game <slug>`).
  - Added new game `games/aim-test` without modifying any central backend switch statement, verifying 100% manifest-driven game registration.
- [x] **Phase 7: Full Verification & Remote CI/CD Deployment**
  - Passed all local checks: `install --frozen-lockfile`, `lint`, `architecture:check`, `typecheck`, `test`, `build`.
