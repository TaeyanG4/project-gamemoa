# GAMEMOA Architecture & Monorepo Design

GAMEMOA is designed as a **Modular Monolith** using **pnpm Workspaces** and **Turborepo**.

```text
gamemoa/
├── apps/
│   ├── web/                     # Platform Shell & SSR App (React Router v7 + Cloudflare)
│   └── api/                     # Hono API Backend (Cloudflare Workers / Node.js portable)
├── games/
│   ├── reaction-time/           # Plug-and-Play Mini-game Module (@gamemoa/game-reaction-time)
│   ├── memory-test/             # Plug-and-Play Memory Test Module (@gamemoa/game-memory-test)
│   └── aim-test/                # Plug-and-Play Aim Test Module (@gamemoa/game-aim-test)
├── packages/
│   ├── game-sdk/                # Module Contract, Host Interfaces & Event Emitters
│   ├── ui/                      # Shared UI Components & GameShell Container
│   ├── core/                    # Domain Entities, Port Interfaces & Repositories
│   ├── db/                      # D1 Adapters, Migrations & SQLite/Postgres Schemas
│   ├── auth/                    # Client Auth Service & Auth Context
│   └── shared/                  # Common Zod Schemas & Utilities
├── docs/                        # Architecture, Progress & Work Documentation
├── GAMEMOA_BLUEPRINT.md         # Blueprint & Design Constraints
└── AGENTS.md                    # Agent Behavioral Rules & CI Constraints
```

## Production & Exit Strategy Architecture

```text
HTTP Request
     ↓
Hono App (apps/api)
     ↓
Route Handler
     ↓
Domain Services (packages/core)
     ↓
Repository Interface (UserRepository / ScoreRepository / SessionRepository)
     ↓
 ┌───────────────────────────┴───────────────────────────┐
 ↓                                                       ↓
Cloudflare D1 Adapter (Production)       PostgreSQL / SQLite Adapter (Future Exit)
```

- **Production Target**: Cloudflare Workers + Cloudflare D1
- **Cloudflare Isolation**: Business logic & routes depend only on Hono & Repository interfaces. No concrete `env.DB` calls inside domain logic.
- **Future Exit Strategy**: Portable Hono app can run on Node.js / Docker with PostgreSQL repository adapters without altering domain services or API contracts.

## Plugin Architecture

All mini-games implement `@gamemoa/game-sdk` interfaces:

```typescript
export interface GameManifest {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly shortDescription: string;
  readonly description: string;
  readonly modes: readonly GameMode[];
  readonly status: GameStatus;
  readonly categories: readonly string[];
  readonly tags: readonly string[];
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly thumbnail: string;
  readonly accent?: string;
  readonly estimatedRoundSeconds?: number;
  readonly requiresAuth: boolean;
  readonly supportsLeaderboard: boolean;
  readonly version: string;
}
```

The web shell dynamically loads games via standard module imports from `apps/web/app/features/catalog/registry.ts`.

