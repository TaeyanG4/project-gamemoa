# GAMEMOA 관리자 센터 운영 가이드

이 문서는 GAMEMOA 관리자 센터(`/admin`)의 다층 인증 모델, 배포 설정, Creator 수동 심사와 보안 점검 방법을 설명합니다.

## 1. 관리자 권한 모델 (다층 방어)

관리자 권한은 더 이상 `ADMIN_USER_IDS` 하나만으로 부여되지 않습니다. `ADMIN_USER_IDS`는 여전히 **근본 자격
(root eligibility)** 경계이지만, 실제 관리자 기능을 사용하려면 아래 5단계를 모두 통과해야 합니다.

1. 유효한 GAMEMOA 로그인 세션 (`gamemoa_session`)
2. 세션의 안정적인 GAMEMOA `user.id`가 `ADMIN_USER_IDS`에 포함
3. **신선한(fresh) Google 계정 본인 확인** — 평소 로그인 세션 재사용이 아닌, 그 자리에서 새로 발급된 Google ID
   Token (발급 5분 이내)
4. Google 토큰의 canonical `sub`가 `ADMIN_GOOGLE_SUBS`에 명시적으로 허용되어 있고, 현재 GAMEMOA 계정의
   `oauth_accounts`(google)에 실제로 연결되어 있음
5. **관리자 전용 아이디/비밀번호** 로그인 성공

5단계를 모두 통과해야 짧은 수명의 **관리자 세션**(`gamemoa_admin_session`)이 발급되며, 이 세션이 있어야만
`/api/admin/*` 보호 엔드포인트(GET 포함)를 사용할 수 있습니다. 이메일, 닉네임, Discord 계정, Creator/Featured
상태, 길드 소유권은 어떤 단계에서도 관리자 근거로 사용하지 않습니다.

## 2. 자신의 GAMEMOA 사용자 ID 확인

1. 자신의 GAMEMOA 계정으로 로그인합니다.
2. 같은 브라우저에서 `GET /api/auth/me`를 호출하거나 브라우저 개발자 도구의 Network 응답을 확인합니다.
3. 인증된 본인 응답의 `user.id` 숫자를 확인합니다.
4. 그 숫자를 기록하되 채팅, 이슈, 로그에 불필요하게 공유하지 않습니다.

Google `sub`는 `/api/auth/me` 응답에 없습니다. Google 계정 연결/재로그인 시 서버가 검증한 canonical `sub`
값을 별도로 안전하게 확인해야 하며(예: 최초 admin 설정 시 1회성 로그 확인), 이메일로 대체하지 않습니다.

## 3. 관리자 전용 자격 증명 준비

### 3-1. 비밀번호 해시 생성

평문 비밀번호는 어디에도 저장하지 않습니다. 운영자는 로컬에서 다음을 실행해 PBKDF2 레코드를 생성합니다.

```bash
pnpm admin:password:hash
```

터미널에서 비밀번호를 입력하면(화면에 표시되지 않음) `pbkdf2_sha256$<iterations>$<salt>$<hash>` 형식의
레코드 한 줄만 출력됩니다. 이 값을 GitHub Actions Secret `ADMIN_PASSWORD_PBKDF2`에 붙여넣습니다. 평문
비밀번호는 채팅(AI 포함), 이슈, 커밋, 로그 어디에도 붙여넣지 않습니다.

파이프로 전달할 수도 있습니다.

```bash
security-cli show gamemoa-admin | pnpm admin:password:hash
```

### 3-2. 설정값 요약

| 이름                    | 종류     | 설명                                                                   |
| ----------------------- | -------- | ---------------------------------------------------------------------- |
| `ADMIN_USER_IDS`        | Variable | 쉼표 구분 GAMEMOA 사용자 ID (근본 자격)                                |
| `ADMIN_GOOGLE_SUBS`     | Secret   | 쉼표 구분 Google canonical `sub` 허용 목록                             |
| `ADMIN_LOGIN_USERNAME`  | Variable | 관리자 2차 로그인 아이디                                               |
| `ADMIN_PASSWORD_PBKDF2` | Secret   | `pnpm admin:password:hash`로 생성한 PBKDF2 레코드 (평문 비밀번호 아님) |

## 4. 배포 설정

`.github/workflows/deploy.yml`이 위 4개 값을 Cloudflare Worker(`gamemoa-api`)로 전달합니다.
`ADMIN_USER_IDS`/`ADMIN_LOGIN_USERNAME`은 Wrangler `--var`(GitHub Variables), `ADMIN_GOOGLE_SUBS`/
`ADMIN_PASSWORD_PBKDF2`는 `wrangler secret`(GitHub Secrets) 경로로만 전달됩니다.

GitHub 저장소에서 다음 위치를 사용합니다.

1. `Settings` → `Secrets and variables` → `Actions` → `Variables` (`ADMIN_USER_IDS`, `ADMIN_LOGIN_USERNAME`)
2. `Settings` → `Secrets and variables` → `Actions` → `Secrets` (`ADMIN_GOOGLE_SUBS`, `ADMIN_PASSWORD_PBKDF2`)

예시(`ADMIN_USER_IDS`, 실제 값 아님):

```text
123456789,234567890
```

값을 바꾼 뒤 `main` 배포가 성공해야 Worker에 반영됩니다. 저장소만으로 외부 GitHub/Cloudflare 설정의 존재
여부를 확정할 수 없습니다. 위 값이 외부에 설정되지 않았다면 상태는 **외부 설정 대기**입니다.

## 5. 로그인 흐름 (`/admin`)

1. `/admin` 방문 — GAMEMOA 로그인 안 되어 있으면 로그인 요구 화면.
2. 로그인은 되어 있지만 `ADMIN_USER_IDS`에 없으면 안전한 403/접근 거부 화면.
3. 자격이 있으면 **Step 1: Google 계정으로 관리자 본인 확인** — 평소 세션이 아닌 새 Google Sign-In을 그
   자리에서 수행 (`POST /api/admin/auth/google`). 발급 5분 초과 토큰은 거부됩니다.
4. 성공하면 **Step 2: 관리자 아이디/비밀번호 로그인** (`POST /api/admin/auth/login`).
5. 성공하면 관리자 센터 대시보드와 `/admin/creators`가 열립니다.

공개 내비게이션에 관리자 링크를 노출하지 않습니다.

## 6. 접근 경로와 보호

- 관리자 홈: `/admin`
- Creator 심사: `/admin/creators`
- 상태 확인 API: `GET /api/admin/me` — `{ authenticated, eligible, adminAuthenticated, stepUpRequired }`만
  반환. `ADMIN_USER_IDS`/`ADMIN_GOOGLE_SUBS`/`ADMIN_LOGIN_USERNAME`/비밀번호 해시/내부 challenge 해시는
  절대 반환하지 않습니다.
- Google 본인 확인: `POST /api/admin/auth/google`
- 관리자 로그인: `POST /api/admin/auth/login`
- 관리자 로그아웃: `POST /api/admin/auth/logout`
- 관리자 홈 요약 API: `GET /api/admin/overview`
- Creator 심사 큐 API: `GET /api/admin/creators/reviews`
- Creator 결정 API: `POST /api/admin/creators/reviews/:jobId/action`

`/api/admin/overview`, `/api/admin/creators/*`는 **GET을 포함해** 유효한 관리자 세션을 요구합니다.
`ADMIN_USER_IDS`만으로는 더 이상 충분하지 않습니다. 관리자 페이지에는 `noindex,nofollow`가 적용됩니다.

## 7. 관리자 세션

- 성공적인 Google 본인 확인은 5분 수명의 1회용 step-up challenge를 발급합니다(해시만 DB 저장).
- 성공적인 관리자 로그인은 30분 절대 수명의 관리자 세션(`gamemoa_admin_session`)을 발급합니다(해시만
  DB 저장, HttpOnly, 프로덕션 Secure, SameSite=None — 웹/API가 서로 다른 서브도메인이라 Strict는
  자격 증명 포함 크로스 오리진 요청 자체를 막으므로 사용할 수 없습니다).
- 관리자 세션은 발급 당시의 `gamemoa_session` 원본 토큰 해시에 묶입니다. 일반 GAMEMOA 로그아웃이나
  세션 만료 시 관리자 세션도 즉시 무효화됩니다.
- `ADMIN_USER_IDS`에서 사용자가 제거되면, 이미 발급된 관리자 세션이 만료 전이어도 다음 요청부터 즉시
  거부됩니다(매 요청 재검증).
- `POST /api/admin/auth/logout`으로 관리자 세션만 명시적으로 해제할 수 있습니다.

## 8. 로그인 실패 제한

관리자 아이디/비밀번호 검증에 5회 연속 실패하면 15분간 잠깁니다(Google 본인 확인 실패는 이 제한에
포함되지 않습니다). 잠금 중에는 `429`와 `Retry-After` 헤더를 반환하며, 아이디/비밀번호 중 어느 쪽이
틀렸는지는 알려주지 않습니다.

## 9. Creator 수동 심사

심사 큐에는 Featured 취득 심사와 재검증 중 추가 확인이 필요한 항목이 표시됩니다.

- 표시 정보: 사용자 ID, 닉네임, 플랫폼, 공식 채널 식별 정보, 소유권 상태, 공식 audience 지표(확인 불가
  시 "확인 불가"로 표시, 0으로 표시하지 않음), 채널 생성일, 동기화 시각
- 승인 조건: Creator profile과 platform account가 모두 `VERIFIED`여야 합니다.
- 액션: `APPROVE_FEATURED`, `REJECT_FEATURED`, `KEEP_FOR_REVIEW`
- 모든 결정에는 3자 이상의 사유가 필요합니다.
- 승인/거절/검토 유지 결과는 `creator_review_audit_log`에 reviewer, 액션, 사유, 이전/새 상태, 안전한 지표
  snapshot과 함께 기록됩니다.
- 감사 원장은 append-only이며 일반 API에서 수정하거나 삭제할 수 없습니다.

OAuth access token, refresh token, client secret, provider 원문 응답과 내부 오류 내용은 큐와 API에 반환하지
않습니다. Featured 상태는 게임 점수, XP, Creator 랭킹 계산을 바꾸지 않습니다.

## 10. 보안 규칙

- 관리자 변경 요청은 인증된 HttpOnly 세션과 유효한 관리자 세션이 모두 필요합니다.
- 관리자 변경 요청은 허용된 frontend `Origin`과 정확히 일치해야 합니다(`startsWith` 금지, localhost는
  `FRONTEND_URL` 자체가 localhost일 때만 허용).
- 요청 본문은 Zod 계약으로 검증합니다.
- 상태를 변경하는 GET 요청은 없습니다.
- 민감한 관리자 응답은 `Cache-Control: no-store`입니다.
- 인증 실패와 권한 실패는 각각 일반적인 401/403 응답으로 처리합니다.
- 내부 stack trace와 비밀값을 클라이언트에 전달하지 않습니다.
- 관리자 ID를 이메일, 닉네임 또는 OAuth provider ID로 등록하지 않습니다.
- 비밀번호는 PBKDF2-HMAC-SHA256(210,000 iterations)으로만 저장하며 평문을 어디에도 남기지 않습니다.
- 관리자 세션/step-up challenge 토큰은 SHA-256 해시로만 DB에 저장합니다.

## 11. 문제 해결

### 401이 반환되는 경우

- GAMEMOA에 로그인되어 있는지 확인합니다.
- `gamemoa_session` 쿠키가 만료되었으면 다시 로그인합니다.

### 403 `FORBIDDEN`이 반환되는 경우

- 현재 세션의 `user.id`가 `ADMIN_USER_IDS`에 정확히 포함되는지 확인합니다.
- 변경 요청이라면 브라우저가 허용된 정확한 `Origin`을 보내는지 확인합니다.

### 403 `ADMIN_SESSION_REQUIRED`가 반환되는 경우

- `/admin`에서 Google 본인 확인과 관리자 로그인을 아직 완료하지 않았거나 관리자 세션(30분)이 만료된
  상태입니다. `/admin`에서 다시 로그인합니다.

### 403 `STEP_UP_FAILED` / `STEP_UP_REQUIRED`가 반환되는 경우

- Google 토큰이 5분 이상 지난 뒤 로그인 요청을 보냈거나(재시도), `ADMIN_GOOGLE_SUBS`에 없는 계정이거나,
  해당 Google 계정이 현재 GAMEMOA 계정에 연결되어 있지 않습니다.

### 429가 반환되는 경우

- 관리자 로그인 실패가 15분 내 5회를 넘었습니다. `Retry-After` 헤더의 초 수만큼 기다립니다.

### 심사 큐가 비어 있는 경우

심사 대상이 없는 정상 상태일 수 있습니다. provider 내부 오류나 토큰이 관리자 화면에 표시되는 구조가
아니므로, 플랫폼 공식 설정과 스케줄러 실행 상태는 운영 로그와 별도 배포 점검으로 확인합니다.

## 12. 관리자 제거

1. GitHub Actions Variables에서 `ADMIN_USER_IDS`에서 해당 숫자 ID를 삭제합니다.
2. 값을 저장하고 `main` 배포가 성공했는지 확인합니다.
3. 제거된 계정으로 `/api/admin/me`가 `eligible: false`를 반환하는지 확인합니다(이미 발급된 관리자 세션이
   있어도 다음 요청부터 즉시 거부됩니다).
4. 필요하면 `ADMIN_GOOGLE_SUBS`에서도 해당 Google `sub`를 제거합니다.

관리자 설정값, 비밀번호, OAuth secret을 문서, 채팅, 커밋에 붙여넣지 않습니다.
