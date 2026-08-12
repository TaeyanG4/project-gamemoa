# GAMEMOA Architecture & Monorepo Design

GAMEMOA is designed as a **Modular Monolith** using **pnpm Workspaces** and **Turborepo**.

```text
gamemoa/
├── apps/
│   ├── web/                     # Platform Shell & SSR App (React Router v7 + Cloudflare)
│   │   └── app/features/        # Modular Web Features (auth, catalog, leaderboard, profile)
│   └── api/                     # Hono API Backend (Cloudflare Workers / Node.js portable)
│       └── src/container.ts     # API Composition Root (Dependency Injection Container)
├── games/
│   ├── reaction-time/           # Plug-and-Play Mini-game Module (@gamemoa/game-reaction-time)
│   ├── memory-test/             # Plug-and-Play Memory Test Module (@gamemoa/game-memory-test)
│   └── aim-test/                # Plug-and-Play Aim Test Module (@gamemoa/game-aim-test)
├── packages/
│   ├── contracts/               # Shared Zod Schemas & DTO Types (@gamemoa/contracts)
│   ├── game-sdk/                # Game Manifest & SDK Host Contracts (@gamemoa/game-sdk)
│   ├── core/                    # Pure Domain Entities, Application Services & Ports (@gamemoa/core)
│   │   └── src/registry/        # Auto-generated Game Registry (gameRegistry.generated.ts)
│   ├── db/                      # Cloudflare D1 Repository Adapters & SQL Migrations (@gamemoa/db)
│   ├── ui/                      # Shared UI Component Primitives & GameShell Container (@gamemoa/ui)
│   ├── auth/                    # Shared Auth Re-exports (@gamemoa/auth)
│   └── shared/                  # Common Utilities (@gamemoa/shared)
├── scripts/
│   ├── generate-game.ts         # Game Package Generator CLI (pnpm generate:game <slug>)
│   ├── generate-game-registry.ts# Build-time Game Registry Generator (pnpm generate:registry)
│   └── verify-architecture.ts   # Architecture Guard Rule Verifier (pnpm architecture:check)
└── .github/workflows/
    ├── ci.yml                   # CI Workflow (Install ➔ Lint ➔ Arch Check ➔ Typecheck ➔ Test ➔ Build)
    └── deploy.yml               # CD Workflow (workflow_run ➔ D1 Migrate ➔ API Deploy ➔ Health/Smoke Test)
```

## Layer Dependency Architecture

```text
apps/web ➔ @gamemoa/contracts & @gamemoa/game-sdk
apps/api ➔ @gamemoa/contracts & @gamemoa/core
   ↓
API Composition Root (apps/api/src/container.ts)
   ↓
@gamemoa/core/application ➔ @gamemoa/core/domain ➔ @gamemoa/core/ports
   ↑
@gamemoa/db (Cloudflare D1 Infrastructure Adapter)
```

## Architecture Guard Rules

`pnpm architecture:check` (`scripts/verify-architecture.ts`) runs on every CI build to automatically block boundary violations:

1. **`packages/core`**: Must NOT import `hono`, `react`, `@cloudflare/*`, or `@gamemoa/db`.
2. **`packages/contracts`**: Must NOT import `react`, `hono`, or `@gamemoa/db`.
3. **`apps/web`**: Must NOT import `@gamemoa/db` or D1 concrete classes.
4. **`games/*`**: Must NOT import `@gamemoa/db` or `hono`.
5. **`apps/api/src/routes`**: Must NOT directly instantiate concrete `D1...Repository` classes (must use `createContainer` DI).

## Game Extensibility DX

Adding a new game is fully manifest-driven:
1. Run `pnpm generate:game <game-slug>` to scaffold `games/<game-slug>`.
2. Fill `src/manifest.ts` with `scoreConfig` (`unit`, `direction`, `min`, `max`).
3. `scripts/generate-game-registry.ts` automatically compiles all game manifests into `gameRegistry.generated.ts` with manifest-driven score validation. No central switch statements in backend or DB logic need to be modified.
