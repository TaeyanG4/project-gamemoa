# GAMEMOA 작업 진행 현황 (WORK_PROGRESS)

# 현재 목표

**Admin/Streamer/Discord/Wiki/i18n 대형 스프린트 (Phase K)**. 실행 순서 A→F 중
**A(Admin)~E(i18n 기반+화면 번역 확장)까지 여러 세션에 걸쳐 완료**했습니다. Phase F(전체
회귀·프로덕션 검증)는 매 세션 마지막에 함께 수행하고 결과를 아래에 기록합니다.

```
A. Admin Login Recovery & Managed Admin Accounts     ← 완료
B. Streamer Ranking Semantics & Platform Icons        ← 완료
C. Discord Onboarding / Command Automation            ← 완료
D. Public Wiki                                        ← 완료
E. Four-Language i18n Foundation & Rollout             ← 기반+주요 화면 완료, 나머지는 운영자 지시로 일시 보류
F. Full Regression / Production Verification           ← 매 세션 수행
G. Discord Bot UX/기능 고도화 (신규, 현재 진행 중)      ← Embed 전환 완료, 후속 기능 확장 대기
```

---

## 완료 (최신 세션 — 보안 정리, Admin 외부 설정, i18n 확장)

### GitGuardian 오탐 정리

`apps/api/test/adminAuthFlow.test.ts`, `apps/api/test/adminAccounts.test.ts`의 테스트 픽스처
문자열(`"bootstrap-admin"`/`"temporary-bootstrap-pw"` 등)이 GitGuardian에 "Username Password"
패턴으로 오탐 신고되었습니다. **실제 자격 증명이 아니며**(로컬 SQLite 전용 테스트 픽스처, 실제
배포에 전혀 사용되지 않음), 운영자가 이전에 요청했던 임시 bootstrap 자격 증명과도 무관함을
재확인했습니다(그 값 자체는 이 문서를 포함해 저장소 어디에도 기록하지 않습니다). 향후 오탐을
막기 위해 흩어진 리터럴을 `BOOTSTRAP_TEST_USERNAME` 등 이름 있는 상수로 교체했습니다.

### Admin 최초 bootstrap 외부 설정 — repository 쪽 차단 요인 해소

- [x] 운영자 승인 하에, 이미 인증되어 있던 `wrangler`(taeyang95@naver.com)로 프로덕션 D1을
      **읽기 전용**으로 조회해 운영자의 GAMEMOA 사용자 ID(`1`, "Taeyang (G4)", Google·Discord
      모두 연결됨)를 확인했습니다.
- [x] GitHub Actions Variable `ADMIN_USER_IDS=1`을 설정했습니다(`gh variable set`). 같은 세션의
      배포로 즉시 반영 확인.
- [ ] **최초 SUPERADMIN bootstrap 자체는 여전히 운영자가 직접 완료해야 합니다** — 서버가 아니라
      운영자 브라우저에서 `/admin` 방문 → Google 본인 확인(실제 클릭) → "초기 관리자 설정" 폼에
      원하는 아이디/비밀번호 직접 입력. 코딩 세션은 비밀번호를 절대 입력하거나 저장하지
      않습니다. (다음 세션 시작 시 `admin_accounts` 행 존재 여부로 완료 확인 가능.)

### i18n 화면 번역 확장

- [x] `dict.loginModal`(제목/부제/닫기/Google·Discord 버튼/로딩/미설정 문구) — `LoginModal.tsx`
      전체 연결.
- [x] `dict.games`(eyebrow/제목/게임 수 문구/검색창 placeholder/빈 상태 2종) — `/games` 전체 연결.
- [x] `dict.ranking`(3개 메인 탭, 전체 종목/전체 플랫폼 필터, 점수/XP 모드 전환, 테이블 헤더 전체,
      로딩/에러/재시도, 3개 탭 각각의 빈 상태, 1/2/3위 배지 텍스트) — `/ranking` 전체 연결.
- [x] `dict.profile`(탭 전환, 가입일, 로그아웃, 레벨/XP, 즐겨찾기/최근 플레이/도전과제/게임별 기록
      섹션, 닉네임·국가 편집 폼과 쿨다운 에러, 연동 계정 연결/해제, Creator 채널 소유권 인증 및
      Featured 심사 상태 — `/profile` 전체 화면 텍스트 연결 완료). `COUNTRY_OPTIONS` 국가명은
      여전히 한국어 고정(스코프 밖).
- [x] `dict.wiki` — `WikiLayout`(사이드바 5개 섹션/15개 항목, prev/next 푸터, 목차 aria-label)과
      Wiki 홈(`/wiki`: 5개 카테고리 카드, 히어로, 설치 가이드 유도 문구) 연결.
      `features/wiki/navigation.ts`를 `buildWikiSections(dict.wiki)` 함수로 전환(기존 정적
      `WIKI_SECTIONS` export 제거). Wiki 본문 17개 상세 라우트(약 1,300줄, 장문 설명/단계별
      가이드/FAQ)는 셸만 다국어화되고 본문은 여전히 한국어 고정 — 별도 규모의 후속 작업으로 남김.
- [x] `dict.discord` / `dict.discordSetup` / `dict.discordGuide` / `dict.discordServers` /
      `dict.discordServerSlug` / `dict.discordServerManage` / `dict.discordLink` — Discord 6개
      라우트(Hub/설치 가이드/이용 가이드/서버 디렉토리/서버 공개 페이지/서버 관리/계정 연동) 전체
      화면 텍스트 연결 완료. 각 라우트 `meta()`는 기존 관례대로(정적 함수, 훅 접근 불가) 로케일화
      제외.
- [x] `docs/I18N.md` §6 커버리지 목록 갱신.

### 검증

- [x] `pnpm verify` 전체 GREEN(로그인 모달/게임/랭킹 사전 확장 포함).

---

## 완료 (같은 세션 후반 — 번역 작업 일시 보류, Discord 봇 기능/완성도 보완)

운영자 지시(2026-08-13): "번역은 나중에 완성도가 높아지면 실행하자 순서를 조정해서 디스코드 봇으로써
기능과 완성도를 보완하자" — Wiki 본문 번역 등 남은 i18n 작업은 보류하고, Discord 봇 메시지 UX
고도화(Embed 전환)로 전환.

### `/gamemoa` 봇 응답 전체 Discord Embed 전환

- [x] `games`/`link`/`profile`/`play`/`rank`/`leaderboard`/`server` 및 모든 에러/폴백 경로를
      평문 `content`에서 Discord Embed로 전환. GAMEMOA 브랜드 팔레트(`apps/web/app/app.css`)를
      그대로 사용(브랜드 인디고/XP 앰버/서버 퍼플/성공 그린/에러 레드).
- [x] 썸네일 추가: `/profile`은 호출한 Discord 유저 본인 아바타, `/rank`·`/leaderboard`·`/server`는
      등록된 길드 아이콘.
- [x] `types.ts`에 `DiscordEmbed`/`DiscordEmbedField`/`DiscordEmbedFooter`/`DiscordEmbedThumbnail`
      최소 스키마 추가.
- [x] `discordInteractionHandlers.test.ts`: 기존 games/link/profile/unknown 테스트를 embed 구조
      검증으로 갱신 + play/rank/leaderboard/server(이전에는 테스트 커버리지가 전혀 없었음) 신규
      테스트 7건 추가.

### 리뷰 패스에서 발견/수정한 실제 버그 (같은 세션, 사용자 요청: "문제 없는지 점검 및 검토")

- [x] **마크다운 마스킹 링크 취약점**: Embed의 `description`/`field.value`는 평문 `content`와
      달리 `[텍스트](url)` 마스킹 링크를 완전히 렌더링합니다. GAMEMOA 닉네임은 마크다운 특수문자
      제한이 없어(`validateNickname`은 길이/제어문자만 검사), 악의적 사용자가 닉네임을
      `[Free Nitro](evil.example)` 형태로 설정하면 **공개** `/gamemoa leaderboard` 임베드에
      클릭 가능한 피싱 링크가 그대로 노출될 수 있었습니다. `escapeMarkdown()` 헬퍼를 추가해
      Discord 길드 이름·GAMEMOA 닉네임 등 사용자 제어 문자열을 모든 임베드 삽입 지점에서
      이스케이프 처리. 회귀 테스트 2건 추가(공개 리더보드/서버 임베드 각각 마스킹 링크 무력화
      검증).
- [x] `ranking.tsx` Creator 탭의 플랫폼 필터 pill에 하드코딩된 한국어 `"치지직 (CHZZK)"`/
      `"SOOP (아프리카)"` 발견 — `dict.ranking.platformChzzk`/`platformSoop`로 이관.
- [x] 공용 `PlatformIcon.tsx`(랭킹/Wiki Creator 인증 페이지 등에서 재사용)의 `aria-label`/`title`에
      동일한 하드코딩 한국어("...채널", "검증된 플랫폼") 발견 — `dict.platformIcon`으로 이관,
      `useI18n()` 연결.
- [x] `docs/WORK_PROGRESS.md`에 Discord embed 커밋(직전 세션 턴) 기록이 누락되어 있던 것을 발견,
      이번에 보완 기록.
- [x] 저장소 전체 `pnpm verify`를 turbo 캐시 무시(`--force`)로 재실행하여 실제로 전부 그린인지
      재확인(47/47 태스크, 0 캐시 히트).

### 검증

- [x] `pnpm --filter @gamemoa/api` 전체 테스트 GREEN(15/15 discord 핸들러 테스트 포함, 신규 보안
      회귀 테스트 2건 포함).
- [x] `pnpm verify` 전체 GREEN.

---

## 완료 (같은 세션 — Admin 최초 부트스트랩 및 그 과정에서 발견한 프로덕션 치명 버그 2건)

운영자가 "관리자 본인 확인" 화면 스크린샷과 함께 초기 관리자 아이디/비밀번호(`admin1234`)를
전달하며 직접 설정을 요청. 그대로 쓰지 않고 아래 순서로 처리:

### 1) 최초 SUPERADMIN 계정을 웹 부트스트랩 엔드포인트 없이 직접 D1에 생성

- 주어진 비밀번호는 앱 자체 정책(`ADMIN_ACCOUNT_POLICY`: 최소 12자, 아이디와 동일 문자열 금지)을
  애초에 통과하지 못하는 값이었고, 저장소 자체에 "관리자 비밀번호를 AI 채팅에 붙여넣지 말 것"이라는
  규칙이 이미 문서화(`scripts/admin-password-hash.ts` 주석)되어 있어 그대로 쓰지 않음.
- 대신 무작위 임시 비밀번호를 로컬(스크래치패드, 저장소 밖)에서 생성 → 앱과 동일한
  PBKDF2-HMAC-SHA256 알고리즘으로 해시 → `admin_accounts`에 SUPERADMIN 행을 **`/api/admin/bootstrap`
  웹 엔드포인트를 전혀 거치지 않고** 직접 INSERT(`must_change_password=1`). 운영자 요청("혹시
  모를 버그 있을지 모르니 백그라운드에서 직접 설정")과 일치하는 방식.
- 부트스트랩·로그인 게이트 코드(`resolveAdminEligibility`, `isAdminUserId`,
  `isTrustedAdminOrigin`)를 직접 리뷰 — root 세션 + `ADMIN_USER_IDS` + 이 GAMEMOA 계정에 실제
  연동된 Google 계정의 신선한(iat 검증) OIDC step-up을 모두 요구하는 구조로, 익명 공격자가 뚫을
  틈은 찾지 못함.
- 임시 스크립트/SQL 파일은 사용 직후 삭제, `git status` 클린 확인 — 저장소에는 아무 흔적도 남지
  않음.

### 2) Google 본인 확인 버튼이 안 보이는 버그 (레이스 컨디션)

운영자가 실제로 `/admin`에 방문했을 때 1단계("Google 본인 확인") 버튼이 아예 렌더링되지 않는
빈 박스만 보임(에러 메시지도, 로딩 표시도 없음).

- **원인**: `GoogleStepUpPanel`(`apps/web/app/routes/admin.tsx`)이 Google 공식 버튼을
  `containerRef`로 가리키는 DOM에 렌더링하는데, 그 컨테이너 `<div>`가 `!scriptReady` 상태일
  때만 마운트되고 있었음. `root.tsx`가 모든 페이지에서 Google Identity Services 스크립트를
  미리 로드해두므로, `/admin` 방문 시 이미 스크립트가 준비된 상태(흔한 경우)라면 `useEffect`가
  `setScriptReady(true)`를 호출한 바로 그 동기 실행 흐름 안에서 `containerRef.current`를
  확인 — 이 시점엔 React가 아직 그 리렌더링을 커밋하지 않아 `containerRef.current`가 여전히
  `null`. `renderButton` 호출이 조용히 건너뛰어지고 재시도 로직도 없어 영구히 빈 박스만 남음.
- **수정**: 컨테이너 `<div>`를 `scriptReady`와 무관하게 항상 마운트하고, 로딩 상태는 그 위에
  겹치는 오버레이로 처리 — effect의 첫 실행 시점에 이미 ref가 DOM에 연결되어 있도록 변경.
  같은 패턴 재발 방지용 회귀 테스트(`apps/web/app/test/adminStepUp.test.ts`, 소스 패턴 검사
  방식 — 이 저장소의 기존 웹 라우트 테스트 스타일과 동일) 추가.
- 커밋 `58007a7`로 배포, CI/Deploy/provenance/smoke 전부 그린 확인.

### 3) 로그인 시도 시 `Internal server error`(500) — Cloudflare Workers PBKDF2 반복 횟수 상한

버튼 수정 후 운영자가 실제로 Google 본인 확인 → 로그인을 시도했으나 500 에러 발생.
`wrangler tail`로 프로덕션 로그를 실시간 확인해 원인 특정:

```
Unhandled Hono Error: NotSupportedError: Pbkdf2 failed: iteration counts above 100000
are not supported (requested 210000).
```

- **원인**: `ADMIN_AUTH_POLICY.PBKDF2_ITERATIONS`가 `210_000`으로 설정되어 있었는데, **Cloudflare
  Workers의 `crypto.subtle.deriveBits`는 PBKDF2 반복 횟수를 100,000까지만 허용**합니다.
  Node.js에는 이 제한이 없어 로컬 `node --test` 스위트에서는 전혀 드러나지 않았고, 실제 Workers
  런타임에서 로그인을 시도해야만 재현되는 버그였습니다.
- `admin_login_attempts`/`admin_sessions`에 아무 행도 생성되지 않은 것으로 보아 예외가
  `verifyAdminPassword` 내부(해시 검증 자체) 단계에서 발생 — 아이디/비밀번호 문제가 아니라
  해시 검증 자체가 프로덕션에서 항상 실패하는 구조였습니다.
- **이 버그는 이번에 처음 생긴 게 아니라 관리자 계정 시스템이 처음 만들어진 이후로 계속
  있었던 것으로 보입니다** — 웹 부트스트랩 폼을 정상적으로 썼어도 `hashAdminPassword()`가
  Worker 안에서 210,000회 반복을 시도하는 순간 똑같이 터졌을 것입니다. 즉 지금까지 이 관리자
  계정 시스템은 프로덕션에서 한 번도 정상 동작한 적이 없었습니다.
- **수정**: `packages/core/src/domain/adminAuth.ts`의 `PBKDF2_ITERATIONS`를 `210_000` →
  `100_000`(Workers 상한)으로 수정, 원인을 코드 주석으로 남김. 이미 생성해둔 SUPERADMIN 계정의
  `password_hash`를 100,000회 반복으로 재해시하여 프로덕션 D1에 직접 UPDATE(운영자에게 새 임시
  비밀번호 재발급 — 이전 것은 폐기). `docs/ADMIN_GUIDE.md`의 "210,000 iterations" 서술 2곳
  정정. `packages/core`/`apps/api` 테스트 전체 재실행(173 + 135 통과), 하드코딩된 210000 값에
  의존하는 테스트 없음을 grep으로 확인.

### 검증

- [x] `pnpm verify` 전체 GREEN.
- [x] 코드 배포(CI → Deploy → provenance 일치 → `pnpm smoke:prod`) 완료.
- [x] **운영자가 새 임시 비밀번호로 실제 로그인 성공 확인** — `wrangler tail`에서
      `POST /api/admin/auth/login 200`, 이어서 `POST /api/admin/settings/password 200`(강제
      비밀번호 변경)까지 정상 흐름 확인. 관리자 계정 시스템이 이번에 최초로 실제 프로덕션에서
      끝까지 동작함.

---

## 완료 (같은 세션 — Discord 봇 실사용 준비: 설치 링크/명령어 등록/Interactions Endpoint 진단, 아이콘 통일)

운영자가 `/discord/setup` 가이드를 실제로 따라해보며 3가지 문제를 보고: (1) 1단계 설치 링크가
안 보임, (2) `/gamemoa` 명령어가 전혀 동작하지 않고 서버 멤버 목록에 봇 자체가 안 보임,
(3) 명령어를 등록한 뒤에도 "애플리케이션이 응답하지 않았어요" 에러.

### 1) 설치 링크 + Bot Token 발급 → 테스트 서버에 즉시 명령어 등록

- `GET /api/discord/status` 확인 결과 `DISCORD_PUBLIC_KEY`는 설정되어 있었지만
  `installUrl: null` — `DISCORD_INSTALL_URL` 미설정이 원인.
- 운영자가 Developer Portal에서 설치 링크(공개값, 안전하게 채팅으로 공유 가능)와 Bot Token(민감값)을
  발급. Bot Token은 운영자가 로컬 `setx`로 직접 설정 — 채팅에는 절대 노출하지 않음.
  - **주의**: `setx`는 레지스트리(`HKCU\Environment`)에만 기록되고 이미 떠 있는 프로세스에는
    반영되지 않는다 — `$env:VAR`로 확인하면 안 보이는 게 정상. `[Environment]::GetEnvironmentVariable(name,"User")`로
    레지스트리를 직접 읽어 값이 실제로 설정됐는지(내용은 노출하지 않고 길이만) 확인하는 방식을
    사용.
- `DISCORD_INSTALL_URL`을 GitHub Variable로 설정 → CI 재실행(`gh run rerun`)으로 재배포 →
  `/api/discord/status`에서 반영 확인.
- `pnpm discord:commands:register:guild`를 운영자의 테스트 길드에 실행 — 토큰은 PowerShell
  세션 안에서만 로드했다가 사용 직후 `Remove-Item Env:\DISCORD_BOT_TOKEN`으로 즉시 제거. 길드
  전용 등록이라 전역 전파 대기 없이 즉시 사용 가능.
- 이후 향후 배포마다 전역 명령어가 자동 동기화되도록 `DISCORD_COMMAND_SYNC_ENABLED=true`도 설정
  (배포 워크플로의 "Sync Discord Commands" 잡이 이 값으로 게이트됨 — `DISCORD_BOT_TOKEN`
  시크릿은 이미 설정됨).

### 2) "애플리케이션이 응답하지 않았어요" — Interactions Endpoint URL 미등록

명령어 등록 후에도 실행 시 에러. `wrangler tail`로 확인한 결과 **`POST /api/discord/interactions`
요청 자체가 로그에 단 한 번도 찍히지 않음** — 즉 Discord가 애초에 우리 서버로 요청을 보낸 적이
없었습니다. `DISCORD_PUBLIC_KEY`가 서버에 설정된 것과, Developer Portal의 "Interactions Endpoint
URL" 필드에 실제 주소를 입력해 저장하는 것은 별개의 단계인데 후자가 누락되어 있었습니다.
운영자에게 `https://gamemoa-api.gamemoa.workers.dev/api/discord/interactions`를 General
Information → Interactions Endpoint URL에 저장하도록 안내(저장 시 Discord가 즉시 PING
검증을 하므로, PUBLIC_KEY가 이미 올바르면 바로 통과함) — **다음 세션 시작 시 실제로 명령어가
동작하는지 확인 필요** (이 문서 작성 시점에는 아직 운영자의 재시도 결과 확인 전).

### 3) 아이콘 통일 — 파비콘/PWA/앱 아이콘을 헤더의 실제 로고와 일치시킴

운영자가 홈페이지 헤더(왼쪽 위, `Header.tsx`)의 실제 로고 — `bg-gradient-to-tr from-brand
to-accent-purple` 배지 안의 흰색 `Gamepad2`(게임패드) 아이콘 — 를 보여주며 파비콘도 이것과
통일하고, Discord 봇 아이콘도 통일해달라고 요청.

- 확인해보니 **사이트에 아이콘 정체성이 두 개 존재**했음: (a) Header/Sidebar/Footer가 실제
  라이브로 렌더링하는 Lucide `Gamepad2` + 그라데이션 배지, (b) `favicon.svg`/PNG 세트는 이와
  무관한 "2x2 둥근 사각형 타일" 디자인(브랜드 인디고 단색 그라데이션). 셋 다(Header/Sidebar/
  Footer) 게임패드 디자인을 쓰고 있어 이쪽이 실제 사이트 정체성으로 판단, **파비콘 쪽을 헤더에
  맞춰 재설계**.
- `scripts/generate-favicon.ts`(외부 이미지 라이브러리 없이 zlib+수기 CRC32로 PNG/ICO를 직접
  인코딩하는 결정론적 생성기, 애널리틱 rounded-rect/circle 커버리지 테스트로 픽셀 채색)의
  도형 정의를 "4개 타일"에서 "게임패드 몸체(둥근 사각+양끝 원으로 그립 표현) + D패드 십자 +
  버튼 2개"로 교체. 그라데이션도 헤더와 동일하게 brand(#6366f1) → accent-purple(#a855f7),
  방향도 `to-tr`(왼쪽 아래 → 오른쪽 위)로 일치.
- `favicon.svg`(수기 작성 원본)도 동일 도형으로 재작성, `pnpm generate:favicon`으로 전체
  세트(16/32/48/180/192/512px PNG, ICO, site.webmanifest) 재생성 후 각 크기를 육안으로 확인
  (16px에서도 게임패드로 인식 가능한 굵고 단순한 형태 유지).
- 새 `favicon-512x512.png`를 Discord 앱 아이콘/봇 아바타용으로도 운영자에게 재전달 — 사이트
  파비콘·PWA 아이콘·Discord 아이콘이 전부 동일한 이미지로 통일됨.
- 검증: `turbo run lint typecheck test build --force` 47/47, 0 캐시 히트. 파비콘 파일을
  참조하는 테스트 없음을 확인(존재 여부만 `pnpm smoke:prod`가 체크).

### 검증

- [x] `pnpm verify` 및 강제 재실행 전부 GREEN.
- [ ] Interactions Endpoint URL 등록 후 `/gamemoa` 명령어 실제 동작 여부 — 다음 세션에서 먼저
      확인.
- [ ] 새 파비콘/Discord 아이콘이 실제 배포된 프로덕션과 Discord 클라이언트에 반영됐는지 육안
      확인(배포 직후 브라우저/Discord 캐시로 인해 즉시 안 바뀌어 보일 수 있음 — 강력 새로고침
      필요할 수 있음).

---

## 완료 (Phase B~E — Admin/Streamer/Discord/Wiki/i18n 기반)

### Phase B: 스트리머 랭킹 정책 & 플랫폼 아이콘

- [x] **자격 규칙 확정**: `D1CreatorRepository.getCreatorRankings`가 `creator_profiles.status =
'VERIFIED'`만으로 자격을 판단하지 않도록 수정 — 플랫폼 필터가 없을 때도 항상
      `EXISTS(creator_platform_accounts 중 verification_status='VERIFIED', platform ∈
{YOUTUBE,CHZZK,SOOP,TWITCH})`를 추가로 요구합니다. 프로필 status가 VERIFIED이지만 실제
      VERIFIED 플랫폼 계정이 하나도 없는 경우를 랭킹에서 안전하게 제외합니다(stale-status 방어).
      score/xp 두 모드 모두 동일 조건 적용, 다중 플랫폼 인증자도 행 중복 없음(기존 EXISTS 서브쿼리
      구조 유지).
- [x] **플랫폼 아이콘**: `apps/web/app/components/ui/PlatformIcon.tsx` 신규 — 이모지(▶️🟢🔵💜)
      대신 브랜드 색상 원형 배지(YouTube는 재생 삼각형, CHZZK/SOOP/Twitch는 글자 배지) 로컬 SVG,
      외부 이미지 hotlink 없음. `aria-label`/`title` 포함, VERIFIED 계정의 `channelUrl`만 링크되며
      `target="_blank" rel="noopener noreferrer"`. `/ranking` 테이블의 오른쪽 끝 "플랫폼" 컬럼에
      배치(기존 텍스트 위주 "연동 채널" 컬럼 제거), 플랫폼 필터 pill에도 재사용.
- [x] 테스트: `packages/db/test/creatorStreamerEligibility.test.ts` 신규(YouTube/CHZZK/SOOP/Twitch
      단독 인증 각각 포함, 4개 모두 인증 시 1행, 미인증 제외, "profile VERIFIED이지만 플랫폼
      미인증" 제외, 일부만 VERIFIED일 때 아이콘 노출 범위, 플랫폼 필터 상호 배타성, Featured가
      순위값에 영향 없음, xp 모드 동일 규칙).

### Phase C: Discord 온보딩 / 명령어 자동화

- [x] `/discord/setup` 신규 라우트: 5단계(설치→계정 연결→서버 등록→`/gamemoa games`→
      `/gamemoa play`) 안내. 실제로 확인 가능한 상태(계정 연결 여부·관리 서버 수)만 "완료"로
      표시하고, 확인 불가한 "설치 완료 여부"는 항상 "직접 확인"으로 정직하게 표시(허위 완료 표시
      금지). `/discord` Hub에 설치 CTA(`DISCORD_INSTALL_URL` 있을 때만)와 설치 가이드 링크 추가.
- [x] `apps/api/src/infrastructure/discord/commandDrift.ts`: Discord 생성 필드(id/application_id/
      version/guild_id 등)를 무시하고 name/description/options/subcommands/choices만 의미
      비교하는 순수 함수. `pnpm discord:commands:check`(전역 또는 `--guild <id>`)가 이를 사용해
      실제 등록 상태와 로컬 SSoT(`commands.ts`)의 드리프트를 진단.
- [x] `pnpm discord:commands:register:guild`: `DISCORD_TEST_GUILD_ID` 길드에 즉시 반영되는 명령어
      등록(개발/테스트 전용, 전역 등록의 ~1시간 전파 지연 우회).
- [x] `.github/workflows/deploy.yml`: 배포 provenance 검증 이후 마지막 단계로
      `DISCORD_COMMAND_SYNC_ENABLED="true"`일 때만 전역 명령어 자동 동기화. 미설정 시 안전하게
      스킵, 활성화됐는데 자격 증명 누락 시 명확히 실패. Bot Token은 Worker 런타임에 배선하지
      않음(GitHub Actions Secret으로만 전달).
- [x] `/admin` Discord 통합 상태 카드 확장: OAuth/HTTP Interactions/설치 링크/명령어 자동 동기화
      설정 여부, 활성 서버 수, 기대 Interactions Endpoint, 로컬 서브커맨드 목록 — Bot
      Token/Client Secret/Public Key 원문은 절대 노출하지 않음.
- [x] 테스트: `apps/api/test/discordCommandDrift.test.ts`(Discord 생성 필드 무시, 누락/추가/
      description/options/choices 드리프트 감지, 순서 무관성) — 실제 Discord API 호출 없이 순수
      비교 로직만 검증(일반 CI에서 라이브 Discord 호출 없음 유지).

### Phase D: 공개 Wiki

- [x] `/wiki` 및 하위 17개 라우트 신규(정적 React 라우트, CMS/마크다운 프레임워크 도입 없음):
      `/wiki/getting-started`, `/wiki/discord`(+`install`/`account-link`/`server-registration`/
      `commands`/`xp`/`troubleshooting`), `/wiki/account`(+`merge`), `/wiki/games`(+`ranking`/
      `xp`), `/wiki/creator`(+`verification`/`featured`).
- [x] 공통 `WikiLayout`/`WikiCallout`/`WikiSteps`/`WikiFaqItem` 컴포넌트로 사이드 목차·이전/다음
      내비게이션·콜아웃을 재사용(라우트 트리 4배 복제 없음).
- [x] Discord 명령어 문서는 실제 커맨드 소스(`DISCORD_SUBCOMMANDS`) 기준으로만 작성, 존재하지
      않는 명령어 문서화 금지. 문제 해결 페이지는 지시서 원문의 증상 목록(자동완성 미노출, 일반
      메시지로 전송됨, 응답 없음, 이미 연결됨, 서버 미등록, 등록 후보 없음, 멤버 목록 미노출,
      오프라인으로 보임)을 그대로 다룸 — 어떤 경우에도 일반 사용자에게 Bot Token을 요구하지 않음.
      XP 문서는 지시서의 정확한 예시(글로벌 25,000→25,010, Guild A 0→10, Guild B 0)를 사용.
- [x] Footer에 Wiki 링크 추가.

### Phase E: 4개 언어 i18n — 기반 완료, 화면 번역은 우선순위 상위 항목만 (정직한 범위 기록)

- [x] **아키텍처**: 새 의존성 없이 타입-안전 내부 사전(`Dictionary` 인터페이스 +
      `apps/web/app/features/i18n/dictionary.ts`) 채택 — i18next 대비 락파일 변경/의존성 리스크
      없음. 상세는 `docs/I18N.md` 신설.
- [x] **지원 로케일**: `ko-KR`(기본)/`en-US`/`ja-JP`/`zh-CN`.
      `packages/core/src/domain/i18nPolicy.ts`(`SUPPORTED_LOCALES`, `resolveLocale`,
      `matchBrowserLocale`) + `packages/contracts/src/i18n.ts`(`SupportedLocaleSchema`, 다른
      플랫폼 enum과 동일 관례로 독립 미러링).
- [x] **저장**: 마이그레이션 `0017_user_locale.sql`(`users.locale`, nullable). `UserRepository`/
      `D1UserRepository`/`D1SessionRepository`에 locale 필드 배선. `ProfileUseCases.updateLocale`
      (닉네임/국가와 달리 쿨다운 없음 — 언어는 즉시 전환). `POST /api/profile/locale` 신규.
      게스트는 `localStorage`("gamemoa_locale")만 사용.
- [x] **해석 순서**: 인증 사용자 저장값 → 게스트/현재 `localStorage` → `navigator.languages` 매칭
      → `ko-KR`. 로그인 사용자가 저장된 값이 없으면 현재 로컬 선호도를 1회 채택해 서버에 저장(요구
      사항의 "adopt current preference once" 규칙), 세션당 1회로 제한.
- [x] **선택기**: `apps/web/app/components/ui/LanguageSelector.tsx`(접근성 있는 select, 즉시 적용,
      새로고침 불필요) — 현재 Footer(전역, 게스트 포함)에 배치. `document.documentElement.lang`도
      함께 갱신.
- [x] **번역 적용 범위(정직하게 기록)**: 전역 헤더(검색 placeholder, 즐겨찾기, 로그인/로그아웃,
      사용자 드롭다운), 전역 푸터 전체, 홈 화면 "미니게임 라인업" 제목, 언어 선택기 자체.
      **아직 미적용**(다음 세션): 로그인 모달, 게임 카탈로그, 랭킹, 프로필, 계정 관리, Discord
      Hub/설정/가이드/서버, Wiki 본문, Admin 흐름, 공통 로딩/에러/빈 상태. `common` 사전 섹션은
      이미 정의되어 있어 즉시 연결 가능한 상태입니다. 라우트 `meta()`(title/description)는 React
      Router 정적 함수라 이번 스코프에서 로케일화하지 않았습니다.
- [x] 브랜드/제품명 비번역 원칙 유지, 내부 enum과 번역 문자열 완전 분리(권한/DB 값에 번역 문자열
      미사용).

### 보너스: 관리자 계정 ↔ 계정 통합(Primary Account Wins) 안전장치

Phase A에서 만든 관리형 admin_accounts와 기존 계정 통합 기능의 상호작용을 점검한 결과, Secondary
계정이 활성 관리자 계정이면 병합 시 그 권한이 조용히 사라지는 안전 결함을 발견해 즉시 수정했습니다.

- [x] `AccountMergeUseCases.confirmMerge`에 `adminAccountRepo.findByUserId(secondaryId)` 확인
      추가 — Secondary가 `ACTIVE` 관리자 계정이면 `MERGE_ADMIN_CONFLICT`로 병합을 차단(Primary가
      관리자인 경우는 영향 없음). `apps/api/src/routes/auth.ts`에 409 응답 + 안내 메시지 추가.
      `docs/WIKI`(`/wiki/account/merge`)에도 이 불변식을 명시.
- [x] 테스트 3건 추가(`packages/core/test/accountMergeUseCases.test.ts`): Secondary가 ACTIVE
      관리자면 차단, DISABLED면 허용, Primary가 관리자인 경우는 영향 없음.

### 검증

- [x] `pnpm verify`(install --frozen-lockfile, format:check, architecture:check, registry:check,
      lint, typecheck, test, build) 전체 GREEN. 로컬 D1에 `0017_user_locale.sql` 적용 검증 완료.
- [x] 신규/변경 테스트: core 173개, db 63개, api 126개, web 16개 — 전부 GREEN(정확한 수치는 각
      패키지 `pnpm test` 출력 참고).

---

## 이전 세션 완료 내역 (Phase A/J, 참고용 — 회귀 없음)

<details>
<summary>펼치기</summary>

**Phase A — Admin Login Recovery & Managed Admin Accounts**: 프로덕션 `ADMIN_USER_IDS` 미설정이
근본 원인이었던 관리자 로그인 불가 문제를 진단·복구. D1 `admin_accounts` 관리형 계정 모델(마이그레이션
`0016`), 첫 SUPERADMIN 안전 bootstrap, 강제 비밀번호 변경, `/admin/accounts` 계정 관리, 감사 로그,
Google Step-Up UI를 실제 보이는 버튼으로 교체. 상세는 `docs/ADMIN_GUIDE.md`.

**Phase J 이전 — 리더보드 SQL PB 정확성, Creator UNKNOWN/0 구분, Admin Origin 정확 일치, Creator
provider CI/CD 배선, Discord Phase F/G/H1/H2, Creator Phase D/E1/E2A/E2B** 등. 상세는 각 도메인
문서(`docs/CREATOR_SYSTEM.md`, `docs/DISCORD_INTEGRATION.md`, `docs/ADMIN_GUIDE.md`) 참고.

</details>

---

## Phase F: 전체 회귀 / 프로덕션 검증 (이번 세션 수행 결과)

아래 "최종 보고" 섹션(대화 응답)에 시작/최종 SHA, CI/Deploy 결과, provenance, smoke 결과를
기록했습니다. 이 문서에는 반복 기재하지 않고 요약만 남깁니다 — 실제 최신 상태는 `git log`와 GitHub
Actions 기록이 원본입니다.

## 남은 작업 (다음 세션에서 이어서 진행)

1. **i18n 번역은 운영자 지시로 일시 보류 상태**(2026-08-13: "번역은 나중에 완성도가 높아지면
   실행하자") — Wiki 본문 17개 상세 라우트(장문 설명·단계별 가이드·FAQ, 약 1,300줄 — 셸/내비게이션
   은 완료), `COUNTRY_OPTIONS` 국가명 다국어화 모두 **운영자가 다시 번역을 진행하자고 명시적으로
   말하기 전까지 착수하지 마세요.** 현재 우선순위는 아래 2번(Discord 봇 기능/완성도).
2. **Discord 봇 기능/완성도 보완 (진행 중, 현재 우선순위)** — 운영자가 메시지 UX 고도화(Embed
   전환)를 1순위로 선택. `/gamemoa` 전체 응답의 Embed 전환은 완료했고, 리뷰 패스에서 마크다운
   마스킹 링크 취약점을 발견해 함께 수정했습니다(위 섹션 참고). 운영자가 물어봤던 다른 선택지
   (신규 명령어/옵션 확장, 게임 선택 Autocomplete)는 아직 착수 전 — 다음에 이어서 진행할 후보:
   - `/gamemoa leaderboard`에 주간(weekly) 옵션 추가(`getGuildLeaderboard`는 이미 `period`
     파라미터를 지원하므로 커맨드 옵션만 추가하면 됨).
   - `/gamemoa help` 명령어 신설.
   - `/gamemoa achievements`(도전과제 확인) 신설.
   - `/gamemoa play game:` 옵션을 정적 `choices`에서 Discord Autocomplete 상호작용으로 전환(게임
     추가 시 명령어 재등록 없이 자동 반영).
3. **Admin bootstrap 관련 작업은 운영자가 직접 진행하기로 함**(2026-08-13 지시: "admin은 추후
   내가 테스트 해볼게") — 코딩 세션은 admin 로그인/bootstrap 플로우를 더 이상 건드리거나
   검증하지 않습니다. `ADMIN_USER_IDS`는 이전 세션에 이미 설정 완료된 상태이며, 나머지는 운영자의
   `/admin` 브라우저 조작이 필요합니다. admin i18n 번역(표시 문자열만이라도)도 의도적으로
   보류했습니다 — 운영자가 admin 테스트를 완료했다고 알려주면 그때(그리고 번역 작업을 다시
   시작하기로 한 뒤) admin UI 텍스트(표시 문자열만, 로직 불변)의 i18n 연결을 진행하세요.
4. **외부 설정 대기**(repository만으로 완결 불가, 선택 사항): Discord 명령어 자동 동기화를 원하면
   `DISCORD_COMMAND_SYNC_ENABLED=true` + `DISCORD_APPLICATION_ID`/`DISCORD_BOT_TOKEN`/
   `DISCORD_TEST_GUILD_ID`(선택) 등록. 미설정이어도 배포에는 영향 없음.
5. **실사용자 E2E 인수 테스트**: 실제 Discord 서버 설치/등록, Creator 플랫폼 인증, 4개 언어 실환경
   확인은 운영자의 실계정 조작이 필요해 이 세션에서 완결할 수 없었습니다.

## 다음 작업 (Next Action)

**0순위(다음 세션 시작 시 가장 먼저 확인)**:

1. Admin 로그인 자체는 이번 세션에 실제 성공까지 확인됨(§ 위 참고) — 재확인 불필요.
2. **Discord Interactions Endpoint URL을 운영자가 실제로 등록했는지, 등록 후 `/gamemoa`
   명령어가 정상 동작하는지 확인.** 안 된다면 `wrangler tail --format pretty`로
   `/api/discord/interactions`에 요청이 실제로 들어오는지부터 확인 — 요청 자체가 안 찍히면
   Portal 설정 문제, 요청은 찍히는데 에러가 나면 코드/서명 문제. 이번 세션에서 이미 이 방법으로
   admin 로그인 버그 2건 + Discord 미응답 원인을 전부 실제 로그로 찾았습니다 — 추측으로 코드부터
   고치지 말고 항상 먼저 실시간 로그를 확인하세요.
3. 새 파비콘(게임패드 디자인)이 브라우저/PWA에 정상 반영됐는지, Discord 봇 아이콘도 운영자가
   Developer Portal에 업로드했는지 육안 확인.

이 세 가지가 확인되면: Discord 봇 기능/완성도 보완을 계속 진행(운영자에게 우선순위 확인 후
착수 — 주간 리더보드 옵션, `/gamemoa help`, 게임 선택 Autocomplete 등 후보는 위 섹션 참고) →
i18n 번역 재개는 운영자가 명시적으로 요청할 때까지 대기 → 필요 시 Admin 흐름 UI 텍스트(표시
문자열만, 인증/보안 로직 불변) → 필요 시 `Post-Sprint UX / SEO / Production Readiness QA`.
Admin **로직**은 운영자가 먼저 언급하지 않는 한 건드리지 마세요 — 다만 "운영자가 admin을 직접
다룬다"는 것이 "admin에 실제 버그가 있어도 못 고친다"는 뜻은 아닙니다. 운영자가 에러를 보고하면
즉시 조사·수정하는 것이 맞습니다(이번 세션 전체가 그 실증 사례).

시작 시 `git log`, `git status`, 이 문서의 "완료" 섹션으로 현재 상태를 재확인한 뒤 처음부터 다시
설계하지 말고 이어서 진행하세요.
