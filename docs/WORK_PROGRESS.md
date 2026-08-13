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
E. Four-Language i18n Foundation & Rollout             ← 기반 완료, 화면 번역 확장 중 (진행형)
F. Full Regression / Production Verification           ← 매 세션 수행
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

1. **i18n 화면 번역 확장 (계속)**: Wiki 본문 17개 상세 라우트(장문 설명·단계별 가이드·FAQ, 약
   1,300줄 — 셸/내비게이션은 이번 세션에 완료)를 `dict`에 연결. `COUNTRY_OPTIONS` 국가명
   다국어화(현재 한국어 고정). `common` 사전 섹션은 이미 준비되어 있음. 라우트 `meta()` 로케일화
   방식 검토(현재 스코프 밖). Discord 6개 라우트, 프로필(`/profile`) 전체, Wiki 셸/홈은 이번
   세션에 완료.
2. **Admin bootstrap 관련 작업은 운영자가 직접 진행하기로 함**(2026-08-13 지시: "admin은 추후
   내가 테스트 해볼게") — 코딩 세션은 admin 로그인/bootstrap 플로우를 더 이상 건드리거나
   검증하지 않습니다. `ADMIN_USER_IDS`는 이전 세션에 이미 설정 완료된 상태이며, 나머지는 운영자의
   `/admin` 브라우저 조작이 필요합니다. **이 세션에서는 admin i18n 번역(표시 문자열만이라도)조차
   의도적으로 보류했습니다** — 운영자의 진행 중인 검증을 방해하지 않기 위함이며, 인증/보안 로직은
   물론 UI 텍스트도 변경하지 않았습니다. 운영자가 admin 테스트를 완료했다고 알려주면 그때 admin UI
   텍스트(표시 문자열만, 로직 불변)의 i18n 연결을 진행하세요.
3. **외부 설정 대기**(repository만으로 완결 불가, 선택 사항): Discord 명령어 자동 동기화를 원하면
   `DISCORD_COMMAND_SYNC_ENABLED=true` + `DISCORD_APPLICATION_ID`/`DISCORD_BOT_TOKEN`/
   `DISCORD_TEST_GUILD_ID`(선택) 등록. 미설정이어도 배포에는 영향 없음.
4. **실사용자 E2E 인수 테스트**: 실제 Discord 서버 설치/등록, Creator 플랫폼 인증, 4개 언어 실환경
   확인은 운영자의 실계정 조작이 필요해 이 세션에서 완결할 수 없었습니다.

## 다음 작업 (Next Action)

`i18n 화면 번역 확장 마무리`(Wiki 본문 17개 상세 라우트 → `COUNTRY_OPTIONS` 다국어화) → 운영자의
admin 테스트 완료 확인 후 Admin 흐름 UI 텍스트(표시 문자열만, 인증/보안 로직 불변) → 필요 시
`Post-Sprint UX / SEO / Production Readiness QA`. Admin bootstrap/로그인 자체는 운영자가 직접
진행하므로 다음 세션에서 먼저 확인하거나 손댈 필요 없음 — 운영자가 먼저 언급하지 않는 한 admin
관련 파일은 (i18n 포함) 건드리지 마세요.

시작 시 `git log`, `git status`, 이 문서의 "완료" 섹션으로 현재 상태를 재확인한 뒤 처음부터 다시
설계하지 말고 이어서 진행하세요.
