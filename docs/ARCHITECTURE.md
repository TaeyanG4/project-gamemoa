# GAMEMOA Architecture & Monorepo Design

GAMEMOA is designed as a **Modular Monolith** using **pnpm Workspaces** and **Turborepo**.

```text
gamemoa/
├── apps/
│   ├── web/                     # Platform Shell & Client App (React Router v7 + Cloudflare)
│   │   ├── app/features/auth/   # Single Source of Truth Auth Client (Google GIS, Discord OAuth)
│   │   ├── app/features/catalog/# Dynamic Game Catalog & Registry Loader
│   │   └── app/features/scores/ # Client Score API & LocalStorage Helpers
│   └── api/                     # Hono API Backend (Cloudflare Workers / Node.js portable)
│       └── src/container.ts     # API Composition Root (Dependency Injection Container)
├── games/
│   ├── reaction-time/           # Plug-and-Play Reaction Time Module (@gamemoa/game-reaction-time)
│   ├── memory-test/             # Plug-and-Play Memory Test Module (@gamemoa/game-memory-test)
│   └── aim-test/                # Plug-and-Play Aim Test Module (@gamemoa/game-aim-test)
├── packages/
│   ├── contracts/               # Shared Zod Schemas & DTO Types (@gamemoa/contracts)
│   ├── game-sdk/                # Game Manifest & SDK Host Contracts (@gamemoa/game-sdk)
│   ├── core/                    # Pure Domain Entities, Application Services & Ports (@gamemoa/core)
│   │   └── src/registry/        # Auto-generated Game Registry (gameRegistry.generated.ts)
│   ├── db/                      # Cloudflare D1 Repository Adapters & SQL Migrations (@gamemoa/db)
│   ├── ui/                      # Shared UI Component Primitives & GameShell Container (@gamemoa/ui)
│   └── shared/                  # Common Utilities (@gamemoa/shared)
├── scripts/
│   ├── generate-game.ts         # Game Package Generator CLI (pnpm generate:game <slug>)
│   ├── generate-game-registry.ts# Build-time Game Registry Generator (pnpm generate:registry)
│   ├── check-registry.ts        # Registry Freshness Verifier (pnpm registry:check)
│   └── verify-architecture.ts   # Architecture Guard Rule Verifier (pnpm architecture:check)
└── .github/workflows/
    ├── ci.yml                   # CI Workflow (Install ➔ Lint ➔ Arch Check ➔ Registry Check ➔ Typecheck ➔ Test ➔ Build)
    └── deploy.yml               # CD Workflow (workflow_run ➔ D1 Migrate ➔ API Deploy ➔ Health/Smoke Test)
```

## Layer Dependency Architecture

```text
apps/web ➔ @gamemoa/contracts & @gamemoa/game-sdk & @gamemoa/core
apps/api ➔ @gamemoa/contracts & @gamemoa/core
   ↓
API Composition Root (apps/api/src/container.ts)
   ↓
@gamemoa/core/application ➔ @gamemoa/core/domain ➔ @gamemoa/core/ports
   ↑
@gamemoa/db (Cloudflare D1 Infrastructure Adapter)
```

## Architecture Guard Rules

`pnpm architecture:check` (`scripts/verify-architecture.ts`) and `pnpm registry:check` (`scripts/check-registry.ts`) run on every CI build to automatically enforce boundary rules:

1. **`packages/core`**: Must NOT import `hono`, `react`, `@cloudflare/*`, or `@gamemoa/db`.
2. **`packages/contracts`**: Must NOT import `react`, `hono`, or `@gamemoa/db`.
3. **`apps/web`**: Must NOT import `@gamemoa/db` or D1 concrete classes.
4. **`games/*`**: Must NOT import `@gamemoa/db` or `hono`.
5. **`apps/api/src/routes`**: Must NOT directly instantiate concrete `D1...Repository` classes (must use `createContainer` DI).
6. **`apps/web/package.json`**: Must NOT list `@gamemoa/db` or legacy `@gamemoa/auth` as dependencies.
7. **`packages/core` purity**: Must NOT contain browser APIs (`window`, `localStorage`), HTTP `fetch` calls, or hardcoded environment URLs.
8. **Registry freshness**: `gameRegistry.generated.ts` must match `pnpm generate:registry` output 100%.

## Game Extensibility DX

Adding a new game requires **0 central code modifications**:
1. Run `pnpm generate:game <game-slug>` to scaffold `games/<game-slug>`.
2. Fill `src/manifest.ts` with `scoreConfig` (`unit`, `direction`, `min`, `max`, `displayPrefix`, `displaySuffix`).
3. `pnpm generate:registry` automatically compiles all game manifests into `gameRegistry.generated.ts`.
4. Frontend and backend automatically utilize manifest metadata for score validation, ordering, and display formatting.
