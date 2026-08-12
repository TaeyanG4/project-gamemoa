# GAMEMOA Goal Progress

## Goal
GAMEMOA 프로젝트의 Cloudflare Production CI/CD를 실제 배포 및 헬스 체크/스모크 테스트까지 100% 완수한다.
- Production API Worker: `gamemoa-api` (`https://gamemoa-api.gamemoa.workers.dev`)
- Production Web Worker Assets: `gamemoa-web` (`https://gamemoa-web.gamemoa.workers.dev`)
- Production Database: Cloudflare D1 `gamemoa-d1` (`e55f84c5-e3a3-4547-8aa3-7a8ec186a02e`)

## Architecture & Production Deployment Status
- **API Worker**: `https://gamemoa-api.gamemoa.workers.dev` (GET `/` & `/api/health` 200 OK)
- **Web Worker Assets**: `https://gamemoa-web.gamemoa.workers.dev` (Routes `/`, `/games`, `/ranking`, `/profile`, `/games/reaction-time`, `/games/memory-test` 200 OK)
- **Database**: Cloudflare D1 `gamemoa-d1` (Migration `0000_initial_schema.sql` applied)
- **CI/CD Pipeline**:
  - `CI`: `pnpm install --frozen-lockfile` ➔ `lint` ➔ `typecheck` ➔ `test` ➔ `build`
  - `Deploy`: `on: workflow_run` (CI success only on `main`) ➔ exact SHA checkout ➔ `pnpm d1:migrate:prod` ➔ `Deploy API` ➔ `API Health Check` ➔ `Build Web` ➔ `Deploy Web` ➔ `Web Smoke Test`

## Completed
- [x] Cloudflare CLI (`wrangler whoami`) 및 계정 권한 확인 (`Taeyang95@naver.com's Account`)
- [x] Production D1 Database 생성 (`gamemoa-d1`, ID: `e55f84c5-e3a3-4547-8aa3-7a8ec186a02e`) 및 `apps/api/wrangler.jsonc` 연동
- [x] D1 마이그레이션 적용 (`0000_initial_schema.sql` remote 적용 완료)
- [x] `gamemoa-api` Worker 실제 Cloudflare 배포 및 `/api/health` 200 OK 검증 완료
- [x] `gamemoa-web` React Router SPA / Static Assets 배포 및 전 라우트 스모크 테스트 (200 OK) 검증 완료
- [x] CORS 및 Cross-site Credentials (HttpOnly SameSite=None on Secure) 설정 반영
- [x] GitHub Actions CD Workflow (`.github/workflows/deploy.yml`) 전면 개선
  - `workflow_run` 기반 CI 성공 후 동작
  - exact commit SHA (`github.event.workflow_run.head_sha`) 체크아웃
  - Concurrency 제어 (`gamemoa-production`)
  - 자동 D1 마이그레이션 + API 배포 + Health Check + Web 배포 + Web Smoke Test
- [x] 문서화 (`README.md`, `ARCHITECTURE.md`, `PROGRESS.md`, `WORK_PROGRESS.md`) 최신 배포 주소 및 가이드 반영

## User Action Required for Production OAuth Console
- **Google Cloud Console**:
  - Authorized JavaScript Origins: `https://gamemoa-web.gamemoa.workers.dev`
- **Discord Developer Portal**:
  - Redirect URI: `https://gamemoa-api.gamemoa.workers.dev/api/auth/discord/callback`
- **Cloudflare Secrets** (필요시 CLI 실행):
  - `pnpm exec wrangler secret put DISCORD_CLIENT_SECRET --config apps/api/wrangler.jsonc`
