# GAMEMOA Architecture & Monorepo Design

GAMEMOA is designed as a **Modular Monolith** using **pnpm Workspaces** and **Turborepo**.

```text
gamemoa/
├── apps/
│   └── web/                     # Platform Shell & SSR App (React Router v7 + Cloudflare)
├── games/
│   └── reaction-time/           # Plug-and-Play Mini-game Module (@gamemoa/game-reaction-time)
├── packages/
│   ├── game-sdk/                # Module Contract, Host Interfaces & Event Emitters
│   ├── ui/                      # Shared UI Components & GameShell Container
│   ├── core/                    # Domain Entities & Business Ports
│   ├── db/                      # Drizzle ORM & Cloudflare D1 Schemas
│   ├── auth/                    # Better-Auth Security Layer
│   └── shared/                  # Common Zod Schemas & Utilities
├── docs/                        # Architecture & Progress Documentation
├── GAMEMOA_BLUEPRINT.md         # Blueprint & Design Constraints
└── AGENTS.md                    # Agent Behavioral Rules & CI Constraints
```

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
