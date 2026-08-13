# GAMEMOA 관리자 센터 운영 가이드

이 문서는 GAMEMOA 관리자 센터(`/admin`)의 다층 인증 모델, 관리형 관리자 계정, bootstrap 절차,
Creator 수동 심사와 보안 점검 방법을 설명합니다.

## 1. 관리자 권한 모델 (다층 방어 + 관리형 계정)

관리자 권한은 두 층으로 구성됩니다.

- **root/break-glass 자격**: `ADMIN_USER_IDS`(GitHub Actions Variable, 쉼표 구분 GAMEMOA
  사용자 ID). 최초 관리자를 bootstrap하거나, 관리형 계정 시스템에 문제가 생겼을 때의 비상 경로로
  영구히 유지됩니다.
- **관리형 자격**: D1 `admin_accounts` 테이블에 `status='ACTIVE'`인 행이 있는 GAMEMOA 사용자.
  최초 관리자가 bootstrap된 이후, **새 관리자를 추가할 때 더 이상 `ADMIN_USER_IDS`를 편집할 필요가
  없습니다** — SUPERADMIN이 `/admin/accounts`에서 추가합니다.

두 자격은 OR 조건입니다(`ADMIN_USER_IDS` 포함 **또는** 활성 관리형 계정 보유 시 자격 있음). 어느
쪽으로 자격을 얻었든, 실제 관리자 기능을 사용하려면 아래 단계를 모두 통과해야 합니다.

1. 유효한 GAMEMOA 로그인 세션 (`gamemoa_session`)
2. 위 두 자격 중 하나
3. **신선한(fresh) Google 계정 본인 확인** — 평소 로그인 세션 재사용이 아닌, 그 자리에서 새로 발급된
   Google ID Token(발급 5분 이내). Google 계정 선택 화면에 표시되는 이름/이메일은 어떤 단계에서도
   권한 판단에 사용하지 않습니다 — 오직 서명된 토큰의 canonical `sub`만 사용합니다.
4. Google 토큰의 `sub`가 **현재 GAMEMOA 계정에 실제로 연결된** `oauth_accounts`(google) 행과
   일치. `ADMIN_GOOGLE_SUBS`가 설정되어 있으면 추가로 그 허용 목록에도 포함되어야 합니다(§5 참고).
5. **관리자 전용 아이디/비밀번호** 로그인 성공(관리형 계정 또는 §6의 레거시 브리지)

5단계를 모두 통과해야 짧은 수명의 **관리자 세션**(`gamemoa_admin_session`)이 발급되며, 이 세션이
있어야만 `/api/admin/*` 보호 엔드포인트(GET 포함)를 사용할 수 있습니다. 이메일, 닉네임, Discord 계정,
Creator/Featured 상태, 길드 소유권은 어떤 단계에서도 관리자 근거로 사용하지 않습니다.

## 2. 자신의 GAMEMOA 사용자 ID 확인 (최초 bootstrap에만 필요)

1. 자신의 GAMEMOA 계정으로 로그인합니다.
2. 같은 브라우저에서 `GET /api/auth/me`를 호출하거나 브라우저 개발자 도구의 Network 응답을 확인합니다.
3. 인증된 본인 응답의 `user.id` 숫자를 확인합니다.
4. 그 숫자를 기록하되 채팅, 이슈, 로그에 불필요하게 공유하지 않습니다.

이 단계는 **최초 관리자 bootstrap**에만 필요합니다. 두 번째 관리자부터는 SUPERADMIN이
`/admin/accounts`에서 사용자 ID를 입력하는 것으로 충분하며, `ADMIN_USER_IDS`를 편집할 필요가
없습니다.

## 3. 최초 관리자 Bootstrap

시스템 전체에 활성 관리자 계정이 **0개**일 때만 가능한 1회성 절차입니다.

1. `Settings → Secrets and variables → Actions → Variables`에서 `ADMIN_USER_IDS`에 본인의
   GAMEMOA 숫자 사용자 ID(§2)를 등록하고, `main` 배포가 성공했는지 확인합니다.
2. `/admin`에 방문합니다. root 자격이 확인되면 **Step 1: Google 본인 확인**이 나타납니다 — 실제로
   보이는 Google 버튼을 직접 클릭합니다(숨겨진 버튼을 프로그램적으로 클릭하는 방식이 아닙니다).
3. Google 본인 확인이 성공하고, 시스템에 관리자 계정이 아직 없으면 **"초기 관리자 설정"** 폼이
   나타납니다. 원하는 아이디(3~64자, 영문/숫자/`._-`)와 비밀번호(12자 이상, 구성 규칙 없음)를
   입력합니다.
4. 서버가 비밀번호를 PBKDF2-HMAC-SHA256(100,000 iterations — Cloudflare Workers `crypto.subtle`의
   PBKDF2 반복 횟수 상한)으로 해시해 D1에만 저장하고,
   평문은 어디에도 남기지 않습니다. 첫 SUPERADMIN 계정이 `must_change_password=true` 상태로
   생성됩니다.
5. 로그인 직후 "관리자 비밀번호를 변경해주세요" 화면이 강제로 표시됩니다. §7에 따라 즉시 새
   비밀번호로 변경해야 나머지 관리자 기능이 열립니다.

**중요**: 이 절차는 반드시 운영자 본인이 배포된 `/admin` 화면에서 직접 입력합니다. 임시
bootstrap 비밀번호는 어떤 형태로도 소스 코드, 마이그레이션, 문서, 커밋, 로그에 남기지 않습니다.

## 4. 두 번째 관리자부터 — `/admin/accounts` (SUPERADMIN 전용)

SUPERADMIN은 `/admin/accounts`에서 새 관리자를 추가합니다. **GitHub Secret/Variable 편집이
필요 없습니다.**

- 대상은 **이미 존재하는 GAMEMOA 사용자**여야 하고, 그 사용자는 **이미 Google 계정이 연결되어
  있어야** 합니다(관리자 계정 생성 시 Google 계정을 새로 연결시키지 않습니다).
- Google `sub`는 그 사용자의 기존 `oauth_accounts` 행에서 서버가 자동으로 가져옵니다. 수동으로
  임의의 `sub` 문자열을 입력하는 경로는 없습니다.
- 생성된 계정은 항상 `must_change_password=true`로 시작합니다.
- 역할은 `SUPERADMIN` 또는 `ADMIN` 중 선택합니다.

기능: 목록 조회, 계정 생성, 활성화/비활성화, 역할 전환, 임시 비밀번호 재발급(항상
`must_change_password=true`로 재설정), 세션 강제 해제, 감사 로그 조회. 비밀번호 해시는 어떤 응답에도
포함되지 않습니다.

**안전 불변식**: 마지막으로 남은 활성 SUPERADMIN은 비활성화하거나 강등할 수 없습니다. 동일
`user_id`/`username`/`google_sub`로 중복 관리자 계정을 만들 수 없습니다(DB UNIQUE 제약 + 애플리케이션
계층 이중 확인).

## 5. `ADMIN_GOOGLE_SUBS` — 선택적 추가 제한 (필수 아님)

`ADMIN_GOOGLE_SUBS`(GitHub Actions Secret, 쉼표 구분 Google canonical `sub` 목록)는 더 이상
필수가 아닙니다.

- **설정된 경우**: Google Step-Up 시 해당 `sub`가 이 목록에도 포함되어야 합니다(추가 break-glass
  제한).
- **설정되지 않은 경우**: 이 검사를 건너뛰고, "현재 GAMEMOA 계정에 실제로 연결된 Google
  oauth_account"라는 1차 바인딩만으로 로그인이 항상 가능합니다. 즉 **미설정 상태가 정상적인
  DB 관리형 관리자를 영구히 막지 않습니다.**

## 6. 레거시 아이디/비밀번호 (`ADMIN_LOGIN_USERNAME` / `ADMIN_PASSWORD_PBKDF2`) — Deprecated

이전 세션에서 도입했던 env 기반 관리자 아이디/비밀번호는 **deprecated**이며, 시스템 전체에 관리형
`admin_accounts`가 **하나도 없을 때만** 마이그레이션 브리지로 동작합니다. 관리형 계정이 하나라도
생기면 그 계정을 가진 사용자는 항상 자신의 관리형 계정으로만 인증되며, 이 레거시 값은 더 이상
참조되지 않습니다. 신규 배포에서는 설정하지 않는 것을 권장합니다.

## 7. 강제 비밀번호 변경 & 자기 비밀번호 변경 (`/admin/settings/security`)

- 관리형 계정의 `must_change_password=true`인 동안, `/api/admin/overview`·`/api/admin/creators/*`·
  `/api/admin/accounts/*` 등 민감한 라우트는 `403 PASSWORD_CHANGE_REQUIRED`로 차단됩니다(GET
  포함). `/api/admin/me`와 `/api/admin/settings/password`만 예외입니다.
- `/admin/settings/security`에서 현재 비밀번호 + 새 비밀번호(12자 이상) + 확인을 입력합니다.
- 정책: 최소 12자, 사용자명과 동일 금지, **현재 비밀번호와 동일한 새 비밀번호는 거부**(현재 저장된
  해시와 직접 비교 — 이 방식이 어떤 임시/유출 비밀번호에도 동일하게 적용되므로, 특정 문자열을
  소스에 하드코딩할 필요가 없습니다).
- 성공 시 `password_changed_at` 갱신, `must_change_password=false`, 이 계정의 **다른 모든 관리자
  세션을 해제**하고 **현재 세션은 새 세션으로 깔끔하게 교체**합니다(자기 비밀번호 변경으로 자신이
  로그아웃되지 않도록).
- SUPERADMIN이 다른 관리자의 비밀번호를 재설정하면 대상 계정은 `must_change_password=true`로
  강제되고, 그 계정의 기존 세션이 모두 해제됩니다.

## 8. Google Step-Up UI

`/admin`은 GIS One Tap이나 숨겨진 버튼을 프로그램적으로 클릭하는 방식을 사용하지 않습니다.
`google.accounts.id.renderButton()`으로 실제 보이는 DOM 컨테이너에 버튼을 렌더링하고, 운영자가
직접 클릭해야만 진행됩니다(`auto_select: false`). 상태: `Google 스크립트 로딩 중` →
`Google 계정으로 본인 확인` → `확인 중...` → 성공/실패. Google 설정이 없으면 `Google 설정 누락`을
표시합니다.

## 9. 접근 경로와 보호

- 관리자 홈: `/admin` · Creator 심사: `/admin/creators` · 관리자 계정 관리: `/admin/accounts`
  (SUPERADMIN) · 보안 설정: `/admin/settings/security`
- 상태 확인 API: `GET /api/admin/me` — `{ authenticated, eligible, adminAuthenticated,
stepUpRequired, bootstrapAvailable, mustChangePassword, role }`만 반환.
  `ADMIN_USER_IDS`/`ADMIN_GOOGLE_SUBS`/`ADMIN_LOGIN_USERNAME`/비밀번호 해시/내부 challenge
  해시는 절대 반환하지 않습니다.
- Google 본인 확인: `POST /api/admin/auth/google` · 관리자 로그인: `POST /api/admin/auth/login`
  · 로그아웃: `POST /api/admin/auth/logout` · bootstrap: `POST /api/admin/bootstrap`
- 관리자 홈 요약: `GET /api/admin/overview` · Creator 심사 큐: `GET /api/admin/creators/reviews`
  · Creator 결정: `POST /api/admin/creators/reviews/:jobId/action`
- 계정 관리(SUPERADMIN): `GET/POST /api/admin/accounts`, `PATCH /api/admin/accounts/:id/status`,
  `PATCH /api/admin/accounts/:id/role`, `POST /api/admin/accounts/:id/reset-password`,
  `POST /api/admin/accounts/:id/revoke-sessions`, `GET /api/admin/accounts/audit`
- 자기 비밀번호 변경: `POST /api/admin/settings/password`

민감한 관리자 라우트는 GET을 포함해 유효한 관리자 세션(+ `must_change_password=false`, 자기
비밀번호 변경 라우트 제외)을 요구합니다. 관리자 페이지에는 `noindex,nofollow`가 적용됩니다.

## 10. 관리자 세션

- 성공적인 Google 본인 확인은 5분 수명의 1회용 step-up challenge를 발급합니다(해시만 DB 저장).
- 성공적인 관리자 로그인/bootstrap/비밀번호 변경은 30분 절대 수명의 관리자 세션
  (`gamemoa_admin_session`)을 발급합니다(해시만 DB 저장, HttpOnly, 프로덕션 Secure,
  SameSite=None).
- 관리자 세션은 발급 당시의 `gamemoa_session` 원본 토큰 해시에 묶입니다. 일반 GAMEMOA 로그아웃이나
  세션 만료 시 관리자 세션도 즉시 무효화됩니다.
- 계정 비활성화, 비밀번호 변경/재설정, SUPERADMIN의 명시적 "세션 해제"는 해당 GAMEMOA 사용자의
  **모든** 관리자 세션을 즉시 무효화합니다(`admin_sessions.user_id` 기준 일괄 해제).

## 11. 로그인 실패 제한

관리자 아이디/비밀번호 검증에 5회 연속 실패하면 15분간 잠깁니다(Google 본인 확인 실패는 이 제한에
포함되지 않습니다). 잠금 중에는 `429`와 `Retry-After` 헤더를 반환하며, 아이디/비밀번호 중 어느 쪽이
틀렸는지는 알려주지 않습니다.

## 12. Creator 수동 심사

심사 큐에는 Featured 취득 심사와 재검증 중 추가 확인이 필요한 항목이 표시됩니다.

- 승인 조건: Creator profile과 platform account가 모두 `VERIFIED`여야 합니다.
- 액션: `APPROVE_FEATURED`, `REJECT_FEATURED`, `KEEP_FOR_REVIEW`. 모든 결정에는 3자 이상의
  사유가 필요합니다.
- 승인/거절/검토 유지 결과는 `creator_review_audit_log`에 append-only로 기록됩니다.

Featured 상태는 게임 점수, XP, Creator 랭킹 계산을 바꾸지 않습니다.

## 13. 관리자 감사 로그

`admin_account_audit_log`(append-only, D1 트리거로 UPDATE/DELETE 차단)에 다음 이벤트를 기록합니다:
`ADMIN_CREATED`, `ADMIN_DISABLED`, `ADMIN_ENABLED`, `ROLE_CHANGED`, `PASSWORD_CHANGED`,
`PASSWORD_RESET`, `SESSIONS_REVOKED`. 행위자/대상 관리자 ID, 액션, 시각, 안전한 구조화 메타데이터만
기록하며 평문 비밀번호·해시·세션 토큰·Google 토큰은 절대 기록하지 않습니다.
SUPERADMIN만 `/admin/accounts`에서 조회할 수 있습니다.

## 14. 보안 규칙

- 관리자 변경 요청은 인증된 HttpOnly 세션과 유효한 관리자 세션이 모두 필요합니다.
- 관리자 변경 요청은 허용된 frontend `Origin`과 정확히 일치해야 합니다(`startsWith` 금지).
- 요청 본문은 Zod 계약으로 검증합니다. 상태를 변경하는 GET 요청은 없습니다.
- 민감한 관리자 응답은 `Cache-Control: no-store`입니다.
- 관리자 ID를 이메일, 닉네임, Google 표시 이름 또는 OAuth provider ID로 등록하지 않습니다 —
  오직 canonical `sub` + 해당 GAMEMOA 계정의 기존 OAuth 연결만 사용합니다.
- 비밀번호는 PBKDF2-HMAC-SHA256(100,000 iterations)으로만 저장하며 평문을 어디에도 남기지
  않습니다. 100,000은 앱이 고른 값이 아니라 Cloudflare Workers `crypto.subtle`의 PBKDF2 반복
  횟수 상한(그 이상은 `NotSupportedError`)이며, Node 기반 로컬 테스트에는 이 상한이 없어 실제
  프로덕션 로그인 전까지 드러나지 않았던 이력이 있습니다.

## 15. 문제 해결

### 403 `FORBIDDEN`

`ADMIN_USER_IDS`에도 없고 활성 관리형 계정도 없습니다. 최초 관리자라면 §2~3(bootstrap)을,
두 번째 관리자부터는 기존 SUPERADMIN에게 `/admin/accounts`에서 추가를 요청하세요.

### 403 `ADMIN_SESSION_REQUIRED`

`/admin`에서 Google 본인 확인과 관리자 로그인을 아직 완료하지 않았거나 관리자 세션(30분)이 만료된
상태입니다.

### 403 `PASSWORD_CHANGE_REQUIRED`

`must_change_password=true`입니다. `/admin/settings/security`에서 비밀번호를 변경하세요.

### 403 `STEP_UP_FAILED` / `STEP_UP_REQUIRED`

Google 토큰이 5분 이상 지난 뒤 로그인 요청을 보냈거나, `ADMIN_GOOGLE_SUBS`가 설정되어 있는데 그
목록에 없는 계정이거나, 해당 Google 계정이 현재 GAMEMOA 계정에 연결되어 있지 않습니다.

### 409 `ALREADY_BOOTSTRAPPED`

시스템에 이미 활성 관리자 계정이 있어 `/admin/bootstrap`을 다시 사용할 수 없습니다. 기존
SUPERADMIN에게 계정 추가를 요청하세요.

### 429

관리자 로그인 실패가 15분 내 5회를 넘었습니다. `Retry-After` 헤더의 초 수만큼 기다립니다.

## 16. 관리자 제거

- **관리형 계정**: `/admin/accounts`에서 SUPERADMIN이 비활성화합니다(마지막 SUPERADMIN 제외).
- **root/break-glass**: GitHub Actions Variables에서 `ADMIN_USER_IDS`에서 해당 숫자 ID를
  삭제하고 `main` 배포가 성공했는지 확인합니다.

관리자 설정값, 비밀번호, OAuth secret을 문서, 채팅, 커밋에 붙여넣지 않습니다.
