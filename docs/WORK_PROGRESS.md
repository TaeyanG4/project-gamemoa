# GAMEMOA 작업 진행 현황 (WORK_PROGRESS)

# 현재 목표

**Admin/Streamer/Discord/Wiki/i18n 대형 스프린트 (Phase K)** — 운영자가 실제 프로덕션에서 `/admin`
로그인이 불가능하다고 보고했고, 스트리머 랭킹 정책·플랫폼 아이콘, Discord 온보딩/명령어 자동화, 공개
Wiki, 4개 언어(한국어/영어/일본어/중국어 간체) i18n까지 포함하는 대형 요구사항이 추가되었습니다. 이
스프린트는 아래 "추가 요구사항" 섹션의 실행 순서(A→F)를 따릅니다.

이번 세션은 **Phase A(Admin Login Recovery & Managed Admin Accounts)만 완료**했습니다. Phase
B~F(스트리머 랭킹/아이콘, Discord 자동화, Wiki, i18n, 전체 회귀/프로덕션 검증)는 다음 세션 몫입니다.

---

## 추가 요구사항 — Admin/Streamer/i18n

운영자가 이번 세션에 추가로 요청한 제품 요구사항을 기록합니다.

1. **스트리머 랭킹 자격**: YouTube / CHZZK / SOOP / Twitch 중 **하나 이상**의 플랫폼에서 소유권 인증이
   완료되면 GAMEMOA 스트리머로 인정합니다(네 플랫폼 모두 필요하지 않음).
2. **플랫폼 아이콘**: 각 스트리머 랭킹 행 오른쪽 끝에 검증된 플랫폼별 아이콘을 표시합니다(이모지가
   아닌 실제 로고/아이콘, 클릭 시 채널로 이동).
3. **Admin 로그인 복구**: 프로덕션에서 관리자 로그인이 불가능한 문제를 조사하고 해결합니다.
4. **관리자 계정 관리**: 최초 관리자 계정의 안전한 bootstrap과, 이후 관리자 계정/비밀번호를 GitHub
   Secret 편집 없이 관리할 수 있는 기능을 제공합니다.
5. **다국어 지원**: 한국어(ko-KR, 기본) / 영어(en-US) / 일본어(ja-JP) / 중국어 간체(zh-CN) UI를
   지원합니다.
6. **Discord 온보딩/Wiki**: 기존 Next Action이었던 Discord 온보딩/명령어 자동화와 공개 Wiki를 계속
   진행합니다.

### 실행 순서

```
A. Admin Login Recovery & Managed Admin Accounts   ← 이번 세션 완료
B. Streamer Ranking Semantics & Platform Icons      ← 다음 세션
C. Discord Onboarding / Command Automation          ← 다음 세션
D. Public Wiki                                      ← 다음 세션
E. Four-Language i18n Foundation & Rollout           ← 다음 세션
F. Full Regression / Production Verification         ← 다음 세션
```

---

## 완료 (이번 세션 — Phase A: Admin Login Recovery & Managed Admin Accounts)

### 1. 근본 원인 진단 (실제 조사, 추측 아님)

`gh variable list` / `gh secret list`로 프로덕션 GitHub Actions 설정을 직접 확인한 결과, 관리자
인증에 필요한 4개 값(`ADMIN_USER_IDS`, `ADMIN_GOOGLE_SUBS`, `ADMIN_LOGIN_USERNAME`,
`ADMIN_PASSWORD_PBKDF2`) 중 **단 하나도 설정되어 있지 않았습니다.** 즉 `/admin`이 보여준
"현재 계정에는 관리자 센터 접근 권한이 없습니다" 화면은 코드 버그가 아니라 `ADMIN_USER_IDS`가 한 번도
설정된 적이 없어 모든 사용자의 `eligible`이 항상 `false`였기 때문입니다(외부 설정 미완료). 기존
`0119aeb` 커밋에서 완성된 다층 Step-Up 인증 자체는 테스트상 정상이었습니다.

이와 별개로, 4개의 분리된 GitHub Secret/Variable을 매 관리자마다 편집해야 하는 기존 모델은 실제
운영이 어렵다고 판단해 아래 3번 항목의 관리형 계정 모델로 전환했습니다.

### 2. Google Step-Up UI 하드닝

- [x] 기존 구현이 GIS One Tap 실패 시 화면 밖(-9999px)에 숨겨진 버튼을 만들어 프로그램적으로
      클릭하던 패턴을 제거했습니다. `google.accounts.id.renderButton()`으로 **실제 보이는 DOM
      컨테이너**에 렌더링하고, 운영자가 물리적으로 클릭해야만 진행됩니다(`auto_select: false` 유지).
- [x] 상태 UI 세분화: `Google 스크립트 로딩 중` / `Google 계정으로 본인 확인` / `확인 중...` /
      `Google 설정 누락`. 실패 사유(허용되지 않은 계정 vs 계정 불일치)는 서버가 원래도 구분해
      반환하지 않으므로(정보 유출 방지) 클라이언트도 하나의 안전한 안내 문구로 통합했습니다.

### 3. 관리형 관리자 계정 모델 (D1, 마이그레이션 `0016_admin_accounts.sql`)

- [x] `admin_accounts`(user_id/google_sub/username 각각 UNIQUE, role, status,
      must_change_password, password_hash, created_by_admin_id 등)와 append-only
      `admin_account_audit_log`(D1 트리거로 UPDATE/DELETE 차단, `creator_review_audit_log`와 동일
      패턴) 신설.
- [x] **권한 모델 전환**: `ADMIN_USER_IDS`는 영구적인 root/break-glass 자격으로 유지하되,
      `admin_accounts`에 ACTIVE 행이 있는 사용자는 `ADMIN_USER_IDS`에 없어도 자격을 얻습니다(OR
      조건, `apps/api/src/auth/adminEligibility.ts`). 이후 새 관리자 추가는 SUPERADMIN이
      `/admin/accounts`에서 수행하며 GitHub Secret 편집이 필요 없습니다.
- [x] **`ADMIN_GOOGLE_SUBS`를 선택적 값으로 전환**: 설정되어 있으면 추가 제한(break-glass
      allowlist)으로만 작동하고, 미설정 시에도 "현재 GAMEMOA 계정에 실제로 연결된 Google
      oauth_account"라는 1차 바인딩만으로 로그인이 항상 가능합니다(미설정이 정상 관리자를 영구히
      막지 않음).
- [x] **레거시 브리지**: `ADMIN_LOGIN_USERNAME`/`ADMIN_PASSWORD_PBKDF2`(env)는 시스템 전체에
      관리형 계정이 **하나도 없을 때만** 폴백으로 동작합니다. 관리형 계정이 존재하는 사용자는 항상
      자신의 관리형 계정으로만 인증됩니다. 문서에 deprecated로 표기.

### 4. 최초 관리자 bootstrap (안전 설계, 평문 비밀번호 커밋 없음)

- [x] `POST /api/admin/bootstrap`: 시스템 전체에 활성 관리자 계정이 **0개**일 때만 동작. 요건: 유효한
      GAMEMOA 세션 → root 자격(`ADMIN_USER_IDS`) → 그 자리에서 완료한 신선한 Google Step-Up(기존
      challenge 소비 메커니즘 재사용) → 원하는 아이디/비밀번호 입력 → 서버가 기존 PBKDF2(210,000
      iterations)로 해시해 저장 → 첫 SUPERADMIN 생성, `must_change_password=true`.
- [x] 웹 `/admin`에 "초기 관리자 설정" 폼 추가(Google Step-Up 완료 후 `bootstrapAvailable=true`일 때만
      노출).
- [x] **운영자가 요청한 임시 bootstrap 자격 증명은 저장소 어디에도 기록하지 않았습니다** (소스 코드,
      마이그레이션, 문서, 테스트, 커밋 로그 어디에도 값을 적지 않았음을 `git diff`로 확인했습니다 —
      이 문서를 포함합니다). 운영자는 프로덕션 배포 후 `/admin`에서 직접 본인 확인을 거쳐 그 자리에서
      원하는 아이디/비밀번호를 입력해 bootstrap을 완료해야 합니다 — 코딩 에이전트가 대신 입력하지
      않습니다.

### 5. 강제 비밀번호 변경 + 자기 비밀번호 변경

- [x] `must_change_password=true`인 동안 `requireElevatedAdmin`이 민감한 관리자 라우트(overview,
      creators, accounts 등)를 `403 PASSWORD_CHANGE_REQUIRED`로 차단합니다. 웹 `/admin`은 이 상태를
      감지해 "관리자 비밀번호를 변경해주세요" 화면만 보여줍니다.
- [x] `POST /api/admin/settings/password`(`/admin/settings/security`): 현재 비밀번호 확인 → 새
      비밀번호 정책 검증 → PBKDF2 재해시 → `must_change_password=false` → 이 계정의 **다른 모든**
      관리자 세션을 해제하고 **현재 세션은 새 세션으로 깔끔하게 교체**(자기 비밀번호 변경으로 자신이
      로그아웃되지 않도록).
- [x] 비밀번호 정책(`packages/core/src/domain/adminAccounts.ts`): 최소 12자, 사용자명과 동일 금지,
      **현재 비밀번호와 동일한 값으로는 절대 변경 불가**. 이 마지막 규칙이 "임시 bootstrap 비밀번호를
      새 비밀번호로 재사용할 수 없다"는 요구사항을 리터럴 문자열을 소스에 넣지 않고 구조적으로
      만족시킵니다(현재 해시와 비교하는 방식이라 어떤 임시 비밀번호에도 동일하게 적용됨).

### 6. SUPERADMIN 계정 관리 (`/admin/accounts`)

- [x] `GET /api/admin/accounts`(목록), `POST /api/admin/accounts`(생성 — **이미 존재하는 GAMEMOA
      사용자 ID**만 입력받고 Google sub는 그 사용자의 기존 `oauth_accounts`에서 서버가 자동으로
      가져옵니다 — 수동 입력 불가), `PATCH .../status`, `PATCH .../role`,
      `POST .../reset-password`(항상 `must_change_password=true`로 재설정), `POST
.../revoke-sessions`. 전부 SUPERADMIN 전용.
- [x] 안전 불변식: 마지막 활성 SUPERADMIN은 비활성화/강등 불가, user_id/username/google_sub 중복
      생성 불가(DB UNIQUE + 애플리케이션 계층 이중 확인), 비밀번호 해시는 어떤 API 응답에도 절대
      포함되지 않음(테스트로 확인).
- [x] `GET /api/admin/accounts/audit`: append-only 감사 로그 조회(SUPERADMIN 전용). 평문 비밀번호,
      해시, 세션 토큰, Google 토큰은 절대 기록하지 않습니다.

### 7. 테스트

- [x] `packages/core/test/adminAccounts.test.ts`(순수 정책 함수),
      `packages/core/test/adminAccountUseCases.test.ts`(인메모리 fake로 애플리케이션 계층 불변식:
      bootstrap 1회 제한, 중복 거부, 마지막 SUPERADMIN 보호, 비밀번호 변경 시 세션 해제),
      `packages/db/test/D1AdminAccountRepository.test.ts`(실제 SQLite로 CRUD/유니크 제약/감사 로그),
      `packages/db/test/D1AdminAuthRepository.test.ts`(신규 `revokeAllAdminSessionsForUserId`),
      `apps/api/test/adminAuthFlow.test.ts`(bootstrap 전체 흐름, `ADMIN_GOOGLE_SUBS` 미설정 시에도
      정상 동작, 강제 비밀번호 변경 게이팅, 중복 bootstrap 거부, 세션 교체 확인),
      `apps/api/test/adminAccounts.test.ts`(SUPERADMIN이 `ADMIN_USER_IDS`에 없는 사용자를 관리자로
      추가 → 그 사용자가 독립적으로 로그인 성공 — GitHub Secret 편집이 필요 없다는 핵심 목표를
      end-to-end로 검증, Google 미연결 사용자 생성 거부, 마지막 SUPERADMIN 보호, 감사 로그).
      기존 `apps/api/test/adminCreators.test.ts`의 `/api/admin/me` 응답 스키마 변경(신규 필드 3개
      추가)에 맞춰 회귀 테스트를 갱신했습니다.
- [x] `pnpm verify`(install --frozen-lockfile, format:check, architecture:check, registry:check,
      lint, typecheck, test, build) 전체 GREEN. 로컬 D1(`pnpm d1:migrate`)에 `0016` 마이그레이션 적용
      검증 완료.

### 8. 문서

- [x] `docs/ADMIN_GUIDE.md` 전면 개정(관리형 계정 모델, bootstrap 절차, 비밀번호 변경, 계정 관리,
      레거시 값 deprecated 표기).

---

## 이전 세션 완료 내역 (Phase J, 참고용 — 회귀 없음)

<details>
<summary>펼치기</summary>

### 1. 리더보드 SQL 무결성 (일반 + Creator)

- [x] `D1ScoreRepository.getLeaderboard`: `ORDER BY score LIMIT N` → JS 중복 제거 방식을
      `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY score <dir>, created_at ASC, id ASC)`
      기반 SQL-레벨 개인 최고 기록(PB) 선별로 교체.
- [x] `D1CreatorRepository.getCreatorRankings` (score 모드): 동일 PB 원칙 적용.

### 2. Creator 지표 UNKNOWN vs 공식 0 구분

- [x] 마이그레이션 `0014_creator_audience_known.sql`: `audience_count_known` 가산 컬럼.

### 3. Admin Origin 정확 일치 하드닝

- [x] `isTrustedAdminOrigin`: `startsWith` 제거, exact origin 비교.

### 4. Creator Provider CI/CD 배선

- [x] `.github/workflows/deploy.yml` provider 배선, `CREATOR_ENABLED_PROVIDERS` readiness 게이트.

### 5. Admin Center 다층 Step-Up 인증 (마이그레이션 `0015_admin_auth.sql`)

- [x] Google Step-Up + 관리자 로그인 2단계, `gamemoa_admin_session`. (이번 세션에서 관리형 계정
      모델로 확장했지만 이 하드닝 자체는 회귀 없이 그대로 재사용했습니다.)

</details>

---

## 남은 작업 (다음 세션에서 이어서 진행)

원본 지시서의 미착수 항목(Phase B~F)입니다.

1. **Phase B: 스트리머 랭킹 정책 & 플랫폼 아이콘**
   - 랭킹 자격을 "VERIFIED `creator_platform_account`가 하나 이상 존재"로 명확화(Creator profile
     status만으로 판단하지 않음 — `creator_profiles.status`가 stale할 수 있음을 감안).
   - 랭킹 행 오른쪽 끝에 검증된 플랫폼 아이콘 표시(실제 로고/SVG, 이모지 대체, 클릭 시 채널 이동,
     `aria-label`/`title`). 기존 재사용 가능한 아이콘 자산이 있는지 먼저 확인.
   - 다중 플랫폼 인증자는 행 중복 없이 1행 + 아이콘 여러 개.
2. **Phase C: Discord 온보딩/명령어 자동화**
   - `pnpm discord:commands:check`, `pnpm discord:commands:register:guild`,
     `DISCORD_COMMAND_SYNC_ENABLED`/`DISCORD_TEST_GUILD_ID`.
   - `/discord/setup` 온보딩 페이지, Admin Center Discord readiness 진단 섹션.
3. **Phase D: 공개 Wiki**: `/wiki`, `/wiki/discord/*` 등, 정적 React 라우트(CMS 도입 금지).
4. **Phase E: 4개 언어 i18n**: ko-KR(기본)/en-US/ja-JP/zh-CN. `users.locale` 추가 마이그레이션,
   로그인 사용자 서버 저장 + 게스트 localStorage, 언어 셀렉터, 주요 화면 번역. Admin 계정 병합 시
   Secondary가 관리자면 병합 차단하는 불변식도 이 단계에서 함께 검토.
5. **Phase F: 전체 회귀/프로덕션 검증**: `git push origin main` → CI/Deploy GREEN 확인 →
   `/api/health`, `/version.json` provenance → `pnpm smoke:prod`.

## 다음 작업 (Next Action)

`Phase B(스트리머 랭킹 정책 & 플랫폼 아이콘) → Phase C(Discord 온보딩/명령어 자동화) → Phase
D(공개 Wiki) → Phase E(4개 언어 i18n) → Phase F(전체 회귀/프로덕션 검증)`

이 순서대로 새 세션에서 이어서 진행합니다. 시작 시 `git log`, `git status`, 이 문서의 "완료" 섹션으로
현재 상태를 재확인한 뒤 처음부터 다시 설계하지 말고 이어서 진행하세요.

**외부 설정 대기 (repository만으로 완결 불가)**:

- 프로덕션 GitHub Actions Variable `ADMIN_USER_IDS`에 운영자 본인의 GAMEMOA 숫자 사용자 ID를 등록해야
  root 자격이 생기고 `/admin`에서 bootstrap 화면이 노출됩니다(운영자가 로그인 후 `GET /api/auth/me`로
  직접 확인 — 이 세션에서는 값을 대신 확인/기록하지 않았습니다).
- 그 뒤 `/admin`에서 Google Step-Up → "초기 관리자 설정" 폼에 운영자가 직접 아이디/비밀번호를 입력해
  bootstrap을 완료해야 합니다.
- `ADMIN_GOOGLE_SUBS`/`ADMIN_LOGIN_USERNAME`/`ADMIN_PASSWORD_PBKDF2`는 이제 필수가 아닙니다(선택적
  break-glass/레거시 브리지).
