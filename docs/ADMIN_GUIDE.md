# GAMEMOA 관리자 센터 운영 가이드

이 문서는 GAMEMOA 관리자 센터(`/admin`)의 권한 모델, 배포 설정, Creator 수동 심사와 보안 점검 방법을 설명합니다.

## 1. 관리자 권한 모델

관리자 권한은 일반 GAMEMOA 로그인 세션과 서버 설정을 함께 사용합니다.

- 사용자는 Google 또는 Discord로 먼저 GAMEMOA에 로그인합니다.
- API는 HttpOnly `gamemoa_session` 쿠키를 서버에서 조회합니다.
- 서버는 세션의 안정적인 GAMEMOA `user.id`가 `ADMIN_USER_IDS`에 있는지 매 요청 확인합니다.
- `ADMIN_USER_IDS`가 없거나 비어 있으면 관리자 권한이 없습니다.
- 이메일, 닉네임, Google 계정, Discord 계정, Creator/Featured 상태와 길드 소유권은 관리자 근거가 아닙니다.

`GET /api/admin/me`는 웹 화면의 접근 상태 확인용으로 `{ "authenticated": true, "admin": true }`만 반환합니다. `ADMIN_USER_IDS`의 실제 값은 반환하지 않습니다.

## 2. 자신의 GAMEMOA 사용자 ID 확인

관리자 등록에는 외부 provider ID가 아닌 GAMEMOA 숫자 사용자 ID가 필요합니다.

1. 자신의 GAMEMOA 계정으로 로그인합니다.
2. 같은 브라우저에서 `GET /api/auth/me`를 호출하거나 브라우저 개발자 도구의 Network 응답을 확인합니다.
3. 인증된 본인 응답의 `user.id` 숫자를 확인합니다.
4. 그 숫자를 기록하되 채팅, 이슈, 로그에 불필요하게 공유하지 않습니다.

`/api/auth/me`는 현재 세션의 사용자 정보만 반환합니다. 다른 사용자의 ID를 추측하거나 이메일로 대체하지 않습니다.

## 3. 배포 설정

현재 저장소의 실제 배포 경로는 `.github/workflows/deploy.yml`입니다. Cloudflare 배포 단계가 GitHub Actions Repository Variables의 `ADMIN_USER_IDS`를 Wrangler `--var`로 API Worker에 전달합니다.

GitHub 저장소에서 다음 위치를 사용합니다.

1. `Settings` → `Secrets and variables` → `Actions` → `Variables`
2. 변수 이름 `ADMIN_USER_IDS`를 추가하거나 수정합니다.
3. 여러 관리자는 쉼표로 구분합니다.

예시:

```text
123456789,234567890
```

위 숫자는 예시이며 실제 사용자 ID가 아닙니다. 값을 바꾼 뒤 `main` 배포가 성공해야 Worker에 반영됩니다. Cloudflare 대시보드에서 직접 값을 바꾸는 경우에도 API Worker의 실제 런타임 변수와 배포 결과를 함께 확인해야 합니다.

현재 저장소만으로 외부 GitHub/Cloudflare 설정의 존재 여부를 확정할 수 없습니다. `ADMIN_USER_IDS`가 외부에 설정되지 않았다면 상태는 **외부 설정 대기**입니다.

## 4. 접근 경로와 보호

- 관리자 홈: `/admin`
- Creator 심사: `/admin/creators`
- 상태 확인 API: `GET /api/admin/me`
- 관리자 홈 요약 API: `GET /api/admin/overview`
- Creator 심사 큐 API: `GET /api/admin/creators/reviews`
- Creator 결정 API: `POST /api/admin/creators/reviews/:jobId/action`

웹에서 메뉴를 숨기는 것은 편의 기능일 뿐 권한 검사가 아닙니다. 모든 관리자 API가 매 요청 세션과 `ADMIN_USER_IDS`를 다시 확인합니다. 관리자 페이지에는 `noindex,nofollow`가 적용됩니다.

## 5. Creator 수동 심사

심사 큐에는 Featured 취득 심사와 재검증 중 추가 확인이 필요한 항목이 표시됩니다.

- 표시 정보: 사용자 ID, 닉네임, 플랫폼, 공식 채널 식별 정보, 소유권 상태, 공식 audience 지표, 채널 생성일, 동기화 시각
- 승인 조건: Creator profile과 platform account가 모두 `VERIFIED`여야 합니다.
- 액션: `APPROVE_FEATURED`, `REJECT_FEATURED`, `KEEP_FOR_REVIEW`
- 모든 결정에는 3자 이상의 사유가 필요합니다.
- 승인/거절/검토 유지 결과는 `creator_review_audit_log`에 reviewer, 액션, 사유, 이전/새 상태, 안전한 지표 snapshot과 함께 기록됩니다.
- 감사 원장은 append-only이며 일반 API에서 수정하거나 삭제할 수 없습니다.

OAuth access token, refresh token, client secret, provider 원문 응답과 내부 오류 내용은 큐와 API에 반환하지 않습니다. Featured 상태는 게임 점수, XP, Creator 랭킹 계산을 바꾸지 않습니다.

## 6. 보안 규칙

- 관리자 변경 요청은 인증된 HttpOnly 세션이 필요합니다.
- 관리자 변경 요청은 허용된 frontend `Origin`을 반드시 포함해야 합니다.
- 요청 본문은 Zod 계약으로 검증합니다.
- GET 요청은 상태를 변경하지 않습니다.
- 민감한 관리자 응답은 `Cache-Control: no-store`입니다.
- 인증 실패와 권한 실패는 각각 일반적인 401/403 응답으로 처리합니다.
- 내부 stack trace와 비밀값을 클라이언트에 전달하지 않습니다.
- 관리자 ID를 이메일, 닉네임 또는 OAuth provider ID로 등록하지 않습니다.

## 7. 문제 해결

### 401이 반환되는 경우

- GAMEMOA에 로그인되어 있는지 확인합니다.
- `gamemoa_session` 쿠키가 만료되었으면 다시 로그인합니다.
- API와 Web의 `FRONTEND_URL`, 세션 쿠키 도메인과 HTTPS 상태를 확인합니다.

### 403이 반환되는 경우

- 현재 세션의 `user.id`가 `ADMIN_USER_IDS`에 정확히 포함되는지 확인합니다.
- 쉼표 구분 값에 공백 외의 문자가 포함되지 않았는지 확인합니다.
- GitHub Actions 배포가 새 변수로 성공했는지 확인합니다.
- 변경 요청이라면 브라우저가 허용된 `Origin`을 보내는지 확인합니다.

### 심사 큐가 비어 있는 경우

심사 대상이 없는 정상 상태일 수 있습니다. provider 내부 오류나 토큰이 관리자 화면에 표시되는 구조가 아니므로, 플랫폼 공식 설정과 스케줄러 실행 상태는 운영 로그와 별도 배포 점검으로 확인합니다.

## 8. 관리자 제거

1. GitHub Actions Variables에서 `ADMIN_USER_IDS`에서 해당 숫자 ID를 삭제합니다.
2. 값을 저장하고 `main` 배포가 성공했는지 확인합니다.
3. 제거된 계정으로 `/api/admin/me`가 `admin: false`를 반환하는지 확인합니다.
4. 필요하면 Cloudflare Worker 변수와 GitHub 변수의 값이 서로 남아 있지 않은지 점검합니다.

관리자 설정값이나 OAuth secret을 문서, 채팅, 커밋에 붙여 넣지 않습니다.
