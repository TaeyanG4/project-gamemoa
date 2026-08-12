# GAMEMOA — 시스템 설계 및 블루프린트 (GAMEMOA_BLUEPRINT)

> **기준일**: 2026-08-12  
> **목적**: GAMEMOA 미니게임 플랫폼의 현재 프로덕션 아키텍처 및 미래 확장 로드맵 명세서  
> **언어 규칙**: 본 문서의 설명 문장은 한국어(KOREAN)로 작성되며, 기술명/패키지명/코드/경로/API명은 표준 표기법을 유지합니다.

---

## 1. 🏗️ 프로덕션 시스템 아키텍처 (Current Architecture)

GAMEMOA는 **Modular Monolith + Game Plugin Architecture** 기반으로 구축되어 Cloudflare 에지 인프라에서 구동됩니다.

```text
                                [ Client Browser ]
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
              [ Apps/Web (React 19) ]      [ Apps/API (Hono) ]
              React Router v7 SPA           Cloudflare Workers
                         │                             │
                         ├─────────────────────────────┤
                         ▼                             ▼
               [@gamemoa/contracts]           [packages/core]
               Zod Request/Response           Domain/Application
                         │                             │
                         └──────────────┬──────────────┘
                                        ▼
                                [packages/db]
                            Cloudflare D1 Adapter
```

### 1.1 구성 요소별 역할

1. **`apps/web`**: React 19 및 React Router v7 (SPA Mode) 기반의 플랫폼 웹 UI shell. 접이식 사이드바, 카테고리 칩 필터, 비주얼 스포트라이트, 16:10 카드 등 고밀도 UI/UX 제공.
2. **`apps/api`**: Hono 및 Cloudflare Workers 기반의 고성능 API 백엔드. CORS 및 Origin/CSRF 검증, OAuth 인증, 점수 제출 및 랭킹 조회 처리. Composition Root(`container.ts`)를 통해 의존성을 주입함.
3. **`packages/contracts`**: Zod 요청/응답 스키마 및 TypeScript DTO 타입. 프론트엔드와 백엔드가 공유하는 단일 계약 소스(Single Source of Truth).
4. **`packages/core`**: 프레임워크 및 인프라 종속성이 제거된 순수 도메인엔티티, 점수 검증 규칙(`domain`), 유즈케이스(`application/ScoreUseCases`), 포트 인터페이스(`ports`).
5. **`packages/db`**: Cloudflare D1 (SQL) 스키마, 마이그레이션 및 저장소 어댑터 구현체 (`D1UserRepository`, `D1SessionRepository`, `D1ScoreRepository`). 게임 매니페스트 정책에 직접 의존하지 않는 순수 SQL 어댑터.
6. **`games/*`**: 독립적인 미니게임 패키지 (`@gamemoa/game-reaction-time`, `@gamemoa/game-memory-test`, `@gamemoa/game-aim-test`).

---

## 2. 🧩 게임 플러그인 아키텍처 (Game Plugin Architecture)

새 미니게임을 추가할 때 중앙 웹/백엔드 로더 코드를 수동 수정하지 않고 빌드 타임 자동 생성기를 통해 플랫폼에 연결됩니다.

### 2.1 미니게임 계약 (Game Manifest & Module)

모든 미니게임 패키지(`games/<game-slug>`)는 다음과 같이 표준화된 매니페스트를 노출합니다:

```ts
// games/<game-slug>/src/manifest.ts
import type { GameManifest } from "@gamemoa/game-sdk";

export const manifest: GameManifest = {
  id: "aim-test",
  slug: "aim-test",
  title: "에임 테스트",
  shortDescription: "30개의 무작위 타겟을 빠르고 정확하게 클릭하세요!",
  description: "화면에 생성되는 타겟을 신속하게 타격하여 정밀도와 반응속도를 측정합니다.",
  modes: ["single"],
  status: "published",
  categories: ["action", "popular"],
  tags: ["에임", "FPS", "반응속도", "순발력"],
  minPlayers: 1,
  maxPlayers: 1,
  thumbnail: "/games/aim-test/thumbnail.svg",
  accent: "#f43f5e",
  estimatedRoundSeconds: 30,
  requiresAuth: false,
  supportsLeaderboard: true,
  version: "0.0.1",
  scoreConfig: {
    unit: "ms",
    direction: "asc",
    min: 500,
    max: 180000,
    displaySuffix: " ms",
  },
};
```

### 2.2 이중 레지스트리 자동 생성 (Dual Registry Generator)

`pnpm generate:registry` (`scripts/generate-game-registry.ts`) 실행 시:

1. `packages/core/src/registry/gameRegistry.generated.ts`: 백엔드/도메인용 매니페스트 맵 및 점수 범위 유효성 검증 함수 자동 생성.
2. `apps/web/app/features/catalog/gameLoaders.generated.ts`: 프론트엔드 Vite 정적 동적 임포트(Static Dynamic Imports) 맵 `GAME_LOADERS` 자동 생성.

---

## 3. 🔐 인증 및 보안 아키텍처 (Authentication & Security)

### 3.1 세션 인증 및 Cookie 관리

- **Google OAuth (GIS)** & **Discord OAuth 2.0** 지원.
- 로그인 성공 시 서버에서 무작위 세션 토큰을 생성하고, D1 데이터베이스에 세션을 저장한 후 `HttpOnly`, `SameSite=None` (또는 로컬 개발 시 `Lax`), `Secure` 세션 쿠키(`gamemoa_session`)를 발급.

### 3.2 Security Guard

- **Origin Check Guard**: API 서버(`apps/api/src/index.ts`)는 상태 변경 HTTP 요청(`POST`, `PUT`, `DELETE`, `PATCH`)에 대해 `Origin` 헤더를 `FRONTEND_URL` 및 허용 도메인과 비교 검증하여 CSRF 위협 차단.
- **Architecture Guard**: `scripts/verify-architecture.ts` 및 `scripts/check-registry.ts`를 통해 CI 빌드 시 레이어 위반(예: `packages/core` 내 브라우저 API 또는 D1 어댑터 사용)을 자동으로 차단.

---

## 4. 🔄 Cloudflare 탈출 전략 (Exit Strategy)

GAMEMOA의 비즈니스 로직 및 저장소 구조는 Cloudflare 전용 API에 얽매이지 않도록 설계되었습니다:

- **API 백엔드**: Hono 프레임워크 기반으로 작성되어 Node.js (`@hono/node-server`), Bun, Deno 또는 Docker 컨테이너 환경으로 쉽게 이식 가능.
- **데이터베이스 저장소**: `packages/core`의 포트 인터페이스 (`ScoreRepository`, `UserRepository`, `SessionRepository`)를 준수하므로, Cloudflare D1 대신 PostgreSQL/MySQL 기반 ORM 어댑터로 교체 가능.

---

## 5. 🚀 향후 확장 로드맵 (Future Roadmap)

1. **실시간 멀티플레이어 (Realtime Multiplayer)**:
   - Cloudflare Durable Objects 및 WebSockets 기반 1v1 대전방/룸 동기화 (필요 시 `apps/realtime` 모듈 확장).
2. **소셜 & 업적 (Social & Achievements)**:
   - 개인 최고 기록 이미지/카탈로그 카드 다운로드 및 주간 랭킹 시즌제 적용.
