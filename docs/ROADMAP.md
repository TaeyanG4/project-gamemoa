# GAMEMOA Future Roadmap & Expansion Plan

GAMEMOA is architected as a highly modular, plug-and-play mini-game platform.  
With the completion of the 2nd Architecture Stabilization and Game Plugin Architecture, adding new games and expanding platform features follows a streamlined path.

---

## 🎯 Short-Term Roadmap (Next Sprint)

### 1. New Mini-Game Additions
Using `pnpm generate:game <slug>` to expand the catalog:
- ⌨️ **Typing Speed Test (타자 속도 테스트)**: WPM / CPM measurement & accuracy calculation.
- 🎨 **Color Blindness Test (색각 이상 테스트)**: Similar color grid detection under time limit.
- 🖐️ **CPS Test (클릭 속도 테스트)**: 10-second clicks per second measurement.

### 2. UI/UX Refinements
- **Dark Mode / Theme Switcher**: Toggle theme tokens smoothly via Tailwind CSS v4 variables.
- **Sound Effects & Audio Options**: Optional web audio sound effects for game clicks, success, and game over.

---

## 🚀 Mid-Term Roadmap (Quarterly Goals)

### 1. Social & Engagement
- **Shareable Score Cards**: Generate OG images/canvas image downloads for personal bests.
- **Weekly Tournaments**: Automated weekly leaderboard reset with badge achievements.

### 2. Multi-Player & Real-Time (Cloudflare Durable Objects Evaluation)
- Evaluate Cloudflare Durable Objects / WebSockets for real-time 1v1 Reaction & Aim battles when platform traffic grows.

---

## ☁️ Cloudflare Exit Strategy (Portability Assurance)

The architecture retains 100% portability:
- **API Engine**: Built on Hono (`@gamemoa/api`), which runs seamlessly on Node.js (`@hono/node-server`), Bun, Deno, or Docker container.
- **Persistence**: Abstracted via `ScoreRepository`, `UserRepository`, `SessionRepository` interfaces in `@gamemoa/core`. Migrating from Cloudflare D1 to PostgreSQL (Prisma/Drizzle/Kysely) requires only creating `PostgresScoreRepository` without touching domain logic.
