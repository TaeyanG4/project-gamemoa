# GAMEMOA Architecture & Refactoring Goal Progress

## Goal
GAMEMOA 프로젝트의 장기 확장성을 위한 전체 아키텍처 점검, 폴더 구조 개선, API Composition Root, Game Manifest/Registry 자동화, Architecture Guard 구축, 기술 부채 완전 제거 및 Game Plugin Architecture 완성을 달성했습니다.

## Target Modular Monolith Architecture
- **Web**: `apps/web` ➔ `@gamemoa/contracts` & `@gamemoa/ui` & `@gamemoa/game-sdk` & `@gamemoa/core`
- **API**: `apps/api` (Composition Root: `container.ts`) ➔ `@gamemoa/core` (Application/Domain/Ports) ➔ `@gamemoa/db` (Cloudflare D1 Adapter)
- **Contracts**: `@gamemoa/contracts` (`packages/contracts`) - Zod request/response schemas & types
- **Game Architecture**: Game Manifest Single Source of Truth + Build-time Registry Generator (`scripts/generate-game-registry.ts`) + Game Template Generator (`scripts/generate-game.ts`)
- **Architecture Guard**: `pnpm architecture:check` (`scripts/verify-architecture.ts`) + `pnpm registry:check` (`scripts/check-registry.ts`) + CI Automated Blocking

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
  - Added `ScoreConfig` (`unit`, `direction`, `min`, `max`, `displayPrefix`, `displaySuffix`) to `GameManifest`.
  - Created `scripts/generate-game-registry.ts` to automatically generate `gameRegistry.generated.ts` containing manifests and manifest-driven score validation logic.
  - Removed manual `switch(gameId)` statements from server-side score validation and formatting.
- [x] **Phase 4: Architecture Guard Construction (`scripts/verify-architecture.ts`)**
  - Created `scripts/verify-architecture.ts` and added `pnpm architecture:check`.
  - Added `Architecture Check` and `Registry Freshness Check` steps to `.github/workflows/ci.yml` to automatically block cross-layer dependency violations in CI.
- [x] **Phase 5: Web Feature-Based Structure Refactoring (`apps/web/app/features/`)**
  - Extracted `apps/web/app/features/auth/` (`authService.ts`, `AuthContext.tsx`).
  - Extracted `apps/web/app/features/scores/` (`api.ts` for localStorage & HTTP score submission).
- [x] **Phase 6: Game Generator & Extensibility Verification**
  - Created `scripts/generate-game.ts` (`pnpm generate:game <slug>`).
  - Added new game `games/aim-test` with a fully functional 30-target arena game.
- [x] **Phase 7: Structural Discrepancy & Tech Debt Removal**
  - Extracted all browser APIs (`window`, `localStorage`, `fetch`, `import.meta.env`) from `packages/core`.
  - Removed hardcoded game ID lists from `D1ScoreRepository` and `apps/api/src/routes/scores.ts`.
  - Removed duplicate `@gamemoa/auth` package and `@gamemoa/db` dependency from `@gamemoa/web`.
  - Automated Aim Test registration in Web Registry and Catalog using `GAME_MANIFESTS`.
- [x] **Phase 8: Full Verification & Remote CI/CD Readiness**
  - Verified local build pipeline: `pnpm generate:registry`, `pnpm architecture:check`, `pnpm registry:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
