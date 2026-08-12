# GAMEMOA Goal Progress

## Goal
GAMEMOA 프로젝트를 현 코드베이스 기준으로 재정비하고, Cloudflare 무료 티어(Workers + D1) 중심의 프로덕션 아키텍처로 전환한다.
Python FastAPI 백엔드를 Hono + TypeScript로 완전 대체하고, Cloudflare 종속성을 인프라 어댑터에 격리하여 향후 Node.js + Docker + PostgreSQL 이동 가능성을 보장한다.

## Architecture Decisions
- **Frontend**: React 19 + React Router v7 + TypeScript (`apps/web`)
- **Backend**: Hono + TypeScript (`apps/api`), Cloudflare Workers 런타임
- **Validation**: Zod (`packages/shared` / `apps/api`)
- **Production Database**: Cloudflare D1
- **Auth**: Google OAuth (GIS ID token verify) + Discord OAuth (Redirect & State) + HttpOnly Session Cookie (`gamemoa_session`)
- **Repository Abstraction**: `UserRepository`, `SessionRepository`, `ScoreRepository` 인터페이스 도입 후 D1 어댑터(`D1UserRepository`, `D1SessionRepository`, `D1ScoreRepository`) 구체화
- **Exit Strategy**: Hono business logic + Repository interface 구조를 유지하여 Node.js/Docker/PostgreSQL 어댑터로 전환 용이
- **CI/CD**: GitHub Actions (`.github/workflows/ci.yml` & `deploy.yml`) + Wrangler CLI

## Completed
- [x] 현재 저장소 상태 및 Git tracking / lockfile 상태 분석
- [x] P0: CI 복구 & Generated Artifact 정리
  - `pnpm install` 실행 및 `pnpm-lock.yaml` 동기화 (`pnpm install --frozen-lockfile` 검증 완료)
  - `apps/web/.react-router` 및 `apps/web/build` Git 추적 제외
- [x] P1: 문서화 & AI 완료 규칙 적용
  - `AGENTS.md` 완료 규칙 (Section 13) 추가 및 최신 우선순위 일치
  - `README.md`, `ARCHITECTURE.md`, `PROGRESS.md` 갱신
- [x] P2: Hono API App (`apps/api`) & Repository Abstraction 구축
  - `UserRepository`, `SessionRepository`, `ScoreRepository` 인터페이스 작성 (`packages/core`)
  - `@gamemoa/api` Hono 애플리케이션 스캐폴딩 및 CORS/Error/Logger 미들웨어 구성
- [x] P3: Cloudflare D1 데이터베이스 스키마 및 Repository 어댑터 구현
  - `0000_initial_schema.sql` (users, oauth_accounts, sessions, scores 및 인덱스)
  - `D1UserRepository`, `D1SessionRepository`, `D1ScoreRepository` 구현 (`packages/db`)
- [x] P4: Auth & Score Hono Routes 구현 및 FastAPI 제거
  - `POST /api/auth/google`, `GET /api/auth/discord`, `GET /api/auth/discord/callback`, `GET /api/auth/me`, `POST /api/auth/logout`
  - `POST /api/scores`, `GET /api/scores/:gameId`, `GET /api/scores/user/me`
  - Python FastAPI `backend/` 디렉터리 안전하게 삭제
- [x] P5: Frontend Hono API 연동 & 실시간 랭킹/프로필 적용
  - `authService.ts` API 포트/URL 설정 갱신
  - `ranking.tsx` 실시간 Hono API 리더보드 연동 (`fetchLeaderboardApi`)
  - `profile.tsx` 실시간 개인 기록 연동 (`fetchUserBestsApi`)
  - `game-slug.tsx` 점수 자동 전송 (`submitScoreApi`) 및 `saveLocalBestScore`
  - 단위 테스트 추가 (`scoreValidation.test.ts`)
- [x] P6: GitHub Actions & Wrangler Deploy 워크플로우 구성
  - `.github/workflows/deploy.yml` 작성 (Wrangler deploy)
  - `package.json` 명시적 배포 및 D1 마이그레이션 스크립트 추가 (`pnpm deploy`, `pnpm d1:migrate`)

## In Progress
- [ ] P7: 최종 검증 (typecheck, lint, test, build) & Commit & Push 및 Remote / Actions 상태 확인

## Remaining
- [ ] Git commit & push
- [ ] GitHub Remote 반영 SHA 확인
- [ ] GitHub Actions CI 결과 확인

## Known Problems / Blockers
- 없음 (모든 단위 테스트 및 타입 검사 통과)

## Next Action
1. `task-195` 완료 수신 후 git diff 및 git status 최종 검토
2. commit & push 실행
3. GitHub remote 반영 및 GitHub Actions green 상태 확인 후 최종 완료 보고
