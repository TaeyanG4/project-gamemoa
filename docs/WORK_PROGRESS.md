# GAMEMOA 작업 진행 현황 (WORK_PROGRESS)

# 현재 목표

**프로덕션 하드닝 + 보안 + Discord 활성화 + Wiki 스프린트 (Phase J)** — 이번 세션에서 리더보드 SQL
무결성, Creator UNKNOWN/0 지표 구분, Admin Origin 정확 일치, Creator provider CI/CD 배선, Admin Center
다층 Step-Up 인증을 완료했습니다. Discord 온보딩/명령어 자동화와 공개 Wiki는 아직 착수하지 않았습니다.

---

## 완료 (이번 세션)

### 1. 리더보드 SQL 무결성 (일반 + Creator)

- [x] `D1ScoreRepository.getLeaderboard`: `ORDER BY score LIMIT N` → JS 중복 제거 방식을
      `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY score <dir>, created_at ASC, id ASC)`
      기반 SQL-레벨 개인 최고 기록(PB) 선별로 교체. 한 사용자가 원시 행 150개 이상을 보유해도
      다른 사용자를 밀어내지 않음.
- [x] `D1CreatorRepository.getCreatorRankings` (score 모드): 동일 PB 원칙 적용, 플랫폼 필터는
      JOIN 대신 `EXISTS`로 전환(행 중복 방지), 총 개수/페이지네이션이 진짜 PB 집합 기준.
- [x] `packages/db/test/leaderboardPersonalBest.test.ts`,
      `creatorLeaderboardPersonalBest.test.ts`: Node 내장 `node:sqlite`(`--experimental-sqlite`,
      추가 네이티브 의존성 없음)로 실제 SQL을 실행해 검증. Cloudflare 로컬 D1 엔진에서도
      `ROW_NUMBER()` 지원을 수동 확인.

### 2. Creator 지표 UNKNOWN vs 공식 0 구분

- [x] 마이그레이션 `0014_creator_audience_known.sql`: `audience_count_known` 가산 컬럼(안전한
      보수적 백필 — 기존 양수만 KNOWN, 그 외 전부 UNKNOWN).
- [x] YouTube/CHZZK/SOOP 초기 인증(`verifyOwnershipCode`) 어댑터의 "미제공 시 0" 기본값 버그
      제거(Twitch는 이미 정상). 6시간/14일 재조회 경로는 기존에도 정상이었음.
- [x] `D1CreatorRepository`/`D1CreatorReviewRepository`가 `audience_count_known`을 읽어 UNKNOWN을
      `null`로 노출(0으로 강제 변환 금지). `CreatorPlatformAccount.audienceCount`,
      contracts DTO를 `number | null`로 변경.
- [x] Admin 심사 큐/프로필 UI: UNKNOWN은 "확인 불가", KNOWN 0은 "0명"으로 표시.
- [x] 문서화: `docs/CREATOR_SYSTEM.md` §3-1.

### 3. Admin Origin 정확 일치 하드닝

- [x] `isTrustedAdminOrigin`: `startsWith` 제거, `new URL(origin).origin === new URL(FRONTEND_URL).origin`
      정확 비교. localhost는 `FRONTEND_URL` 자체가 localhost일 때만 개발 예외로 허용(프로덕션은
      절대 우회 불가). `apps/api/test/adminAuth.test.ts`로 회귀 테스트.

### 4. Creator Provider CI/CD 배선

- [x] `.github/workflows/deploy.yml`: YouTube/Twitch/CHZZK/SOOP client ID/redirect URI(`--var`,
      선택적) 및 client secret/API key(`wrangler secret`)를 완전 배선. `CREATOR_ENABLED_PROVIDERS`
      Variable 신설.
- [x] `scripts/verify-production.ts`: `GET /api/creators/providers` 기반 readiness 게이트 —
      `CREATOR_ENABLED_PROVIDERS`에 선언된 provider만 `configured=false`를 배포 실패로 처리,
      미선언 provider는 상태만 보고. 실제 프로덕션 대상으로 성공/실패 경로 모두 수동 검증 완료.
- [x] 문서화: `docs/CREATOR_SYSTEM.md` §5-1, `docs/PRODUCTION_INTEGRATIONS.md` 신설.

### 5. Admin Center 다층 Step-Up 인증

- [x] 마이그레이션 `0015_admin_auth.sql`: `admin_step_up_challenges`, `admin_sessions`,
      `admin_login_attempts` (모든 토큰은 SHA-256 해시만 저장, 원본 `gamemoa_session` 토큰 해시에
      바인딩).
- [x] `packages/core`: `ADMIN_AUTH_POLICY`(5분 step-up TTL, 30분 admin 세션 TTL, 15분/5회 rate
      limit, PBKDF2 210,000 iterations), `isAdminGoogleSub`, `evaluateLoginRateLimit`(순수 함수),
      `AdminAuthUseCases`/`AdminAuthRepository` 포트.
- [x] `apps/api/src/auth/adminPassword.ts`: Web Crypto PBKDF2-HMAC-SHA256 해시/검증,
      `pbkdf2_sha256$iter$salt$hash` 레코드, timing-safe 비교. `scripts/admin-password-hash.ts`
      (`pnpm admin:password:hash`) — 비밀번호는 stdin 전용, 인자/로그 노출 금지.
  - Google ID Token 검증(`verifyGoogleToken`)에 `iat` 추가, step-up은 발급 5분 초과 토큰을 거부
    (암호학적으로 유효해도 "신선하지 않음"으로 차단).
- [x] `POST /api/admin/auth/google`(canonical sub 허용 목록 + 현재 GAMEMOA 계정과의 OAuth 연결
      검증) → `POST /api/admin/auth/login`(rate limit → step-up 소비 → PBKDF2 검증) →
      `gamemoa_admin_session` 발급. `POST /api/admin/auth/logout`, `GET /api/admin/me`
      (`{authenticated, eligible, adminAuthenticated, stepUpRequired}`만 반환).
- [x] `/api/admin/overview`, `/api/admin/creators/*`(GET 포함) 전체를 `requireElevatedAdmin`으로
      마이그레이션 — `ADMIN_USER_IDS`만으로는 더 이상 접근 불가.
- [x] 일반 GAMEMOA 로그아웃 시 해당 세션에 바인딩된 관리자 세션도 함께 revoke.
      6시간 Cron(기존 Featured 재심사 스케줄러)에 만료 challenge/세션/로그인 시도 바운디드 정리
      추가(새 백그라운드 서비스 없음).
- [x] 웹 `/admin`: GAMEMOA 로그인 요구 → 403 안내 → 2단계(Google Step-Up → 관리자 로그인) →
      대시보드(+로그아웃 버튼) 상태 기계로 재구현.
- [x] 테스트: `packages/core/test/adminAuth.test.ts`(순수 정책),
      `apps/api/test/adminPassword.test.ts`(PBKDF2), `packages/db/test/D1AdminAuthRepository.test.ts`
      (실제 SQLite로 challenge replay/expiry/session binding/rate-limit/cleanup),
      `apps/api/test/adminAuthFlow.test.ts`(실제 RS256 서명 JWT + 실제 SQLite로 전체
      Google→로그인→대시보드→로그아웃 흐름, stale 토큰 거부, sub 불일치 거부, rate limit 429,
      `ADMIN_USER_IDS` 제거 즉시 반영 end-to-end 검증).
- [x] 문서화: `docs/ADMIN_GUIDE.md` 전면 개정, `docs/PRODUCTION_INTEGRATIONS.md`에 설정값 정리.

### 검증

- [x] `pnpm format`, `pnpm architecture:check`, `pnpm registry:check`, `pnpm lint`,
      `pnpm typecheck`, `pnpm test`, `pnpm build` 로컬 GREEN.
- [x] 마이그레이션 `0014`, `0015` 로컬 D1 적용 검증 및 `0014`는 실제 Cloudflare 로컬 D1 엔진에서
      `ROW_NUMBER()` 지원까지 수동 재확인.

---

## 남은 작업 (다음 세션에서 이어서 진행)

이번 세션은 여기서 안전하게 커밋/푸시/원격 검증까지 완료하고 마감합니다. 아래는 마스터 스프린트 지시서의
미착수 항목입니다 (원본 지시서 섹션 29–50, 74 참고).

1. **Discord 온보딩/명령어 자동화 (Phase F/G/H)**:
   - `pnpm discord:commands:check`, `pnpm discord:commands:register:guild`,
     `DISCORD_COMMAND_SYNC_ENABLED`/`DISCORD_TEST_GUILD_ID` GitHub Actions 연동.
   - `/discord/setup` 온보딩 페이지, `/discord` Hub 단계 시각화(설치→연결→서버 등록→플레이).
   - `/admin`에 Discord readiness 진단 섹션(Bot Token 등 비밀은 Worker에 절대 두지 않음).
2. **공개 Wiki (Phase I)**: `/wiki`, `/wiki/discord/*` 등 신규 라우트, 정보 구조, `/discord/guide`와의
   연결. 정적 React 라우트로 구현(무거운 CMS/Markdown 프레임워크 도입 금지).
3. **문서 정합성 전체 점검**: 이번 세션에서 다룬 문서는 갱신했으나, `docs/DISCORD_INTEGRATION.md`,
   `docs/DISCORD_BOT_GUIDE.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`는 Discord/Wiki 작업 시
   함께 갱신 필요.
4. **테스트 매트릭스 보강**: 원본 지시서 §28의 admin 테스트 매트릭스 중 일부(예: replayed Google
   challenge의 매우 세부적인 변형, Origin spoof 조합)는 핵심 케이스만 커버됨 — 필요 시 확장.

## 다음 작업 (Next Action)

`Discord 온보딩/명령어 자동화 (Phase F/G/H) 구현 → 공개 Wiki (Phase I) 구현 → 문서 정합성 전체 점검`

이 순서대로 새 세션에서 이어서 진행합니다. 시작 시 `git log`, `git status`, 이 문서의 "완료" 섹션으로
현재 상태를 재확인한 뒤 처음부터 다시 설계하지 말고 이어서 진행하세요.
