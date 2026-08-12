# AGENTS.md — GAMEMOA Coding Contract

이 파일은 AI 코딩 에이전트(Codex, Claude Code, Antigravity)용 강제 규칙 명세이다.

> 아키텍처 방향: **Modular Monolith & Cloudflare Free Tier Production**  
> GAMEMOA의 핵심 비즈니스 로직과 도메인 레이어는 Hono 및 Repository abstraction 인터페이스를 통해 Cloudflare 인프라와 격리되며, 향후 **Node.js + Docker + PostgreSQL** 환경으로 이탈(Exit Strategy) 가능한 구조를 유지한다.

## 1. 아키텍처 경계 및 종속성 강제 규칙 (Architecture Guard)

`pnpm architecture:check` (`scripts/verify-architecture.ts`)가 CI에서 자동 검사하며, 위반 시 CI가 즉시 실패한다.

- **Domain/Core (`packages/core`)**: Infrastructure(DB, Cloudflare, Hono, React)를 절대 import하지 않는다.
- **Contracts (`packages/contracts`)**: Pure TypeScript 타입과 Zod Schema만 위치하며, React, Hono, DB를 import하지 않는다.
- **Web App (`apps/web`)**: `@gamemoa/db` 또는 D1 concrete repository를 직접 import하지 않는다.
- **Games (`games/*`)**: `@gamemoa/db` 또는 Hono/Cloudflare bindings를 import하지 않는다.
- **API Routes (`apps/api/src/routes`)**: `new D1UserRepository` 등 Concrete Infrastructure를 직접 생성하지 말고, Composition Root (`apps/api/src/container.ts`) DI를 사용한다.

## 2. 신규 게임 추가 규칙 (Game Addition DX)

- 모든 게임은 `src/manifest.ts`에 `GameManifest` (id, slug, title, scoreConfig: unit, direction, min, max)를 정의한다.
- 중앙 backend score validation이나 web catalog의 switch 문을 수동 수정하지 않는다.
- `pnpm generate:game <slug>` 명령어로 게임 스캐폴드를 자동 생성하고, `pnpm generate:registry` (`scripts/generate-game-registry.ts`)가 빌드 타임 레지스트리 `gameRegistry.generated.ts`를 자동 갱신한다.

## 3. AI 작업 완료 규칙 (Strict Completion Rule)

모든 AI Agent는 코드 수정 후 다음 단계를 완수해야 한다:

1. `pnpm lint`
2. `pnpm architecture:check`
3. `pnpm typecheck`
4. `pnpm test`
5. `pnpm build`
6. `git diff` / `git status` 검토
7. `git commit` & `git push origin main`
8. GitHub remote commit SHA 반영 확인
9. GitHub Actions CI Green & Cloudflare Deploy Green 확인
10. 확인 완료 후 최종 보고서 제출

- CI 실패 시 완료 보고 금지.
- Git push 실패 시 완료 보고 금지.
