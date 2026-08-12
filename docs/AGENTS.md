# AGENTS.md — GAMEMOA 코딩 및 개발 규칙 명세서

이 파일은 AI 코딩 에이전트(Codex, Claude Code, Antigravity)가 코드를 수정하거나 기능을 확장할 때 반드시 준수해야 하는 강제 규칙 명세서입니다.

> **아키텍처 방향**: **Modular Monolith & Cloudflare Free Tier Production**  
> GAMEMOA의 핵심 비즈니스 로직과 도메인 레이어는 Hono 및 Repository abstraction 인터페이스를 통해 Cloudflare 인프라와 격리되며, 향후 **Node.js + Docker + PostgreSQL** 환경으로 이탈(Exit Strategy) 가능한 구조를 유지합니다. 모든 문서 설명 본문은 **한국어(KOREAN)**로 작성합니다.

---

## 1. 🛡️ 아키텍처 경계 및 레이어 강제 규칙 (Architecture Guard)

`pnpm architecture:check` (`scripts/verify-architecture.ts`) 및 `pnpm registry:check` (`scripts/check-registry.ts`)가 CI에서 자동 검사하며, 위반 시 CI 빌드가 즉시 실패합니다.

1. **Game Loader 수동 등록 금지**: `apps/web/app/features/catalog/registry.ts`에 게임 로더를 수동으로 등록하지 않으며, `pnpm generate:registry`를 통해 자동 생성된 `gameLoaders.generated.ts`를 사용합니다.
2. **생성된 파일 결정론성 및 불변성**: 생성 파일(`gameRegistry.generated.ts`, `gameLoaders.generated.ts`)은 Prettier 경로별 설정으로 캐노니컬(canonical)하게 생성되며, 수동 편집을 엄금합니다. `pnpm registry:check`는 `pnpm format` 실행 후에도 0 diff 통과해야 합니다.
3. **Game Manifest Export 규칙**: 모든 미니게임 패키지(`games/*`)는 `src/manifest.ts`에서 `export const manifest` 규칙을 준수해야 합니다.
4. **Domain/Core 순수성 (`packages/core`)**: Browser API (`window`, `localStorage`, `fetch`), Hono, Cloudflare bindings, React, `@gamemoa/db` 어댑터, 프로덕션 URL을 절대 포섭하거나 import하지 않습니다.
5. **API Contract 일원화 (`packages/contracts`)**: API 요청/응답 Zod 스키마 및 DTO 타입은 `@gamemoa/contracts`에 위치하며, `@gamemoa/shared`에 중복 정의하지 않습니다.
6. **Persistence Adapter 순수성 (`packages/db`)**: D1 저장소 어댑터는 `GAME_MANIFEST_MAP`에 의존하지 않으며 순수 SQL 실행 역할만 수행합니다. 게임 점수 정렬 및 포맷 정책은 Application Layer에서 결정합니다.
7. **Web App (`apps/web`)**: `@gamemoa/db` 또는 D1 concrete repository를 직접 import하지 않습니다.
8. **Games (`games/*`)**: `@gamemoa/db` 또는 Hono/Cloudflare bindings를 import하지 않습니다.
9. **API Routes (`apps/api/src/routes`)**: Thin Controller 역할을 수행하며 `new D1UserRepository` 등 Concrete Infrastructure를 직접 생성하지 않고 Composition Root (`apps/api/src/container.ts`) DI를 사용합니다.

---

## 2. 🎮 신규 게임 추가 규칙 (Game Addition DX)

1. 모든 게임은 `src/manifest.ts`에 `GameManifest` (id, slug, title, scoreConfig: unit, direction, min, max)를 정의합니다.
2. 중앙 backend score validation이나 web catalog의 switch 문을 수동 수정하지 않습니다.
3. `pnpm generate:game <game-slug>` 명령어로 게임 스캐폴드를 자동 생성하고, `pnpm generate:registry` (`scripts/generate-game-registry.ts`)가 빌드 타임 이중 레지스트리를 자동 갱신합니다.

---

## 3. 🚨 시크릿, 마이그레이션 및 락파일 관리 규칙 (Strict Package Manifest Rule)

1. **시크릿 커밋 절대 금지**: API 토큰, OAuth Client Secret, 개인 키, `.env` / `.dev.vars` 파일을 절대 Git에 저장하거나 로그에 출력하지 않습니다.
2. **마이그레이션 불변성 (Immutable Migrations)**: 이미 프로덕션에 적용된 마이그레이션 파일(`apps/api/migrations/*`)을 임의 수정하거나 삭제하지 않으며, DB 스키마 변경 시 반드시 새 마이그레이션 파일로 수행합니다.
3. **패키지 락파일 동기화 강제 절차**: 워크스페이스 내 어떠한 `package.json`이라도 의존성 추가/삭제/수정 등 변경 발생 시 반드시:
   1. `pnpm install` 실행
   2. `pnpm-lock.yaml` diff 검토
   3. `pnpm install --frozen-lockfile` 검증
   4. `pnpm verify` 사전 품질 게이트 실행  
      절차를 준수해야 하며, `pnpm-lock.yaml`이 동기화되지 않은 커밋을 절대 허용하지 않습니다.

---

## 4. ✅ 작업 완료 및 검증 규칙 (Definition of Done)

모든 AI Agent는 코드 및 문서 수정 후 다음 품질 게이트(`pnpm verify`) 및 원격 검증 절차를 완수해야 합니다:

1. `pnpm generate:registry`
2. `pnpm format`
3. `pnpm verify` (frozen install, format check, arch check, registry check, lint, typecheck, test, build 통합 검증)
4. `git status` 및 `git diff` 검토
5. `git commit` & `git push origin main`
6. GitHub Actions **CI Status = GREEN** 확인
7. Cloudflare Deploy **Status = GREEN** 확인 및 **Commit SHA Provenance** 일치 확인
8. 프로덕션 API Health Check (`/api/health`) & Web Smoke Check 수행

- **Local Validation 성공만으로 완료라 보고하지 않습니다.**
- **GitHub Actions CI 및 Deploy Green, 그리고 배포 커밋 SHA가 원격과 100% 일치할 때만 최종 완료 처리합니다.**
