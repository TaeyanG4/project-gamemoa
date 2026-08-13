# OwOGG 크리에이터 시스템 & 채널 소유권 검증 (Creator System & Channel Ownership Verification)

이 문서는 OwOGG 플랫폼의 크리에이터(스트리머/유튜버) 채널 소유권 검증 및 크리에이터 모델의 아키텍처, 검증 원칙, 보안 정책, 플랫폼별 OAuth API 연동 가이드를 설명합니다.

---

## 1. 크리에이터 채널 소유권 검증의 정의 (Definition of Verification)

- **소유권 검증의 의미**: "OwOGG가 해당 사용자가 지정된 플랫폼(YouTube, CHZZK, SOOP, Twitch)의 채널/계정을 직접 소유 및 제어하고 있음을 공식 API로 검증했음"을 뜻합니다.
- **포함되지 않는 항목**:
  - 파트너/유명 크리에이터 표식(Featured)이 아니며, 인기도/유명세를 보증하지 않습니다.
  - 게임 점수(Score)나 경험치(XP)에 어떠한 가산점이나 이점도 제공하지 않습니다.
- **혜택**:
  - 통합 랭킹 UI (`/ranking`)의 `[🎥 스트리머 랭킹]` 탭 노출
  - 내 프로필 페이지 (`/profile`)의 공식 크리에이터 채널 링크 및 검증 배지 표시

### 1-1. 스트리머 랭킹 자격 (단일 플랫폼 인증으로 충분)

YouTube / CHZZK / SOOP / Twitch **중 하나 이상**의 플랫폼에서 소유권 인증(`verification_status =
'VERIFIED'`)이 완료되면 스트리머 랭킹에 노출됩니다. 네 플랫폼을 모두 인증할 필요는 없습니다.

`D1CreatorRepository.getCreatorRankings`는 `creator_profiles.status = 'VERIFIED'`만으로 자격을
판단하지 않고, 항상 `EXISTS (creator_platform_accounts 중 verification_status='VERIFIED'인 행)`을
추가로 요구합니다 — 프로필 상태가 실제 플랫폼별 인증 상태와 어긋날 가능성에 대한 방어입니다. 플랫폼
필터가 없을 때는 4개 플랫폼 중 하나라도 VERIFIED이면 충분하고, 특정 플랫폼 필터가 있을 때는 그
플랫폼이 VERIFIED여야 합니다.

여러 플랫폼을 인증한 크리에이터도 랭킹에는 1행만 노출되며, 순위 값(게임 최고 기록/XP)은 플랫폼 개수나
Featured 상태와 무관합니다 — 플랫폼은 필터링·표시 전용 메타데이터입니다. 각 랭킹 행 오른쪽 끝에
검증된 플랫폼 아이콘(`apps/web/app/components/ui/PlatformIcon.tsx`)이 표시되며, 클릭 시 해당
`channelUrl`(항상 VERIFIED 계정에서만 로드됨)로 새 탭이 열립니다.

---

## 2. 핵심 검증 원칙 (Core Verification Invariants)

1. **약한/취약한 검증 방식 절대 금지**:
   - 사용자가 입력한 채널 URL, 닉네임, 핸들 텍스트 입력만으로 연동 처리하지 않습니다.
   - 계정 이메일 일치 여부만으로 자동 연동하지 않습니다.
   - 웹 스크래핑(Scraping) 기법을 절대 사용하지 않습니다.
2. **공식 OAuth 2.0 & API 전용**:
   - 각 플랫폼의 공식 OAuth authorization code grant 워크플로우와 공식 REST API만 사용합니다.
3. **단일 소유권 보장 (`UNIQUE(platform, platform_user_id)`)**:
   - 하나의 외부 채널(예: 특정 YouTube 채널 ID)은 OwOGG의 단 한 명의 사용자 계정에만 연동될 수 있습니다.
   - 이미 다른 OwOGG 사용자가 연동한 채널을 다시 연동하려고 하면 `CHANNEL_ALREADY_VERIFIED` 에러가 반환됩니다.
4. **임시 토큰 폐기 (No Access Token Storage)**:
   - 채널 소유권 확인에 사용된 임시 Access Token은 정품 채널 프로필 및 Canonical ID 수집 직후 메모리에서 폐기하며 DB에 저장하지 않습니다.
5. **로그인 계정과의 분리**:
   - Google 소셜 로그인 사용자가 자동으로 해당 Google 계정의 YouTube 채널로 연동되지 않습니다. 채널 연동은 항상 사용자의 명시적인 `[채널 소유권 인증]` 동의 절차를 거칩니다.
6. **점진적 성능 및 미설정 안전한 성능 저하 (Graceful Degradation)**:
   - 플랫폼 OAuth 자격 증명(`YOUTUBE_CLIENT_ID` 등)이 설정되지 않은 환경에서도 플랫폼 핵심 기능은 영향 없이 동작하며 UI에는 "현재 인증을 사용할 수 없습니다" 메시지가 안전하게 노출됩니다.

---

## 3. 플랫폼별 Canonical Identity 및 API 규격

| 플랫폼      | Canonical Identity (고유 식별자)                                  | OAuth Scopes / Endpoints                           | 공식 API 조회 경로                                                                     |
| :---------- | :---------------------------------------------------------------- | :------------------------------------------------- | :------------------------------------------------------------------------------------- |
| **YouTube** | YouTube Channel ID (예: `UC1234567890abcdef...`)                  | `https://www.googleapis.com/auth/youtube.readonly` | `GET https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true` |
| **Twitch**  | Twitch User ID (숫자 문자열, 예: `12345678`)                      | `user:read:email`                                  | `GET https://api.twitch.tv/helix/users`                                                |
| **CHZZK**   | Naver Chzzk Channel Hash ID (32자 Hex, 예: `0123456789abcdef...`) | Standard Open API Grant                            | `GET https://openapi.chzzk.naver.com/open/v1/users/me`                                 |
| **SOOP**    | SOOP User ID (SOOP 아이디 문자열)                                 | Standard Open API Grant                            | `GET https://openapi.sooplive.co.kr/user/me`                                           |

---

## 3-1. 구독자/팔로워 지표: 미지(UNKNOWN) vs 공식 0 (Migration 0014)

`audience_count`는 **"공식 API가 0명을 확정 응답했음"**과 **"공식 지표를 아직 얻지 못했음"**을 절대
혼동하지 않습니다. `creator_platform_accounts.audience_count_known`이 이 둘을 구분합니다.

- `audience_count_known = 0` (UNKNOWN): API/도메인 `audienceCount`는 `null`. UI는 "확인 불가"로 표시하며
  절대 "0명"으로 표시하지 않습니다.
- `audience_count_known = 1` (KNOWN): `audience_count`가 실제 공식 값(0 포함)이며, UI는 "0명"처럼 실제
  숫자를 표시합니다.

각 플랫폼 어댑터(`verifyOwnershipCode`, `fetchChannelMetrics`)는 공식 API가 구독자/팔로워 필드를 아예
제공하지 않으면(예: YouTube가 구독자 수를 비공개로 설정한 채널) `audienceCount`를 아예 설정하지 않으며,
이는 UNKNOWN으로 영속화됩니다. 기존(마이그레이션 이전) 데이터의 `audience_count = 0`은 과거 코드가 미지
값을 0으로 취급했을 가능성이 있어 안전하게 UNKNOWN으로 백필되며, 기존 양수 값만 KNOWN으로 백필됩니다.
UNKNOWN 지표는 Featured 자격 심사에서 항상 `MANUAL_REVIEW`로 안전하게 라우팅됩니다(§6-2, §6-6).

---

## 4. 인증 보안 및 상태 복원성 (OAuth Security)

1. **CSRF 방지 (State Cookie)**:
   - 인증 시작 시 `crypto.randomUUID()`로 Cryptographic State 생성
   - `HttpOnly`, `SameSite=Lax`, `maxAge=600` 쿠키 (`creator_verify_state`)에 `{ state, userId, platform }` 저장
2. **세션 재검증 (Session Re-validation)**:
   - OAuth Callback 시 쿠키의 `userId`와 현재 로그인된 OwOGG 사용자 세션의 `userId`가 일치하는지 엄격히 검증
3. **오류 및 충돌 처리**:
   - `success`: 정상 연동 완료 후 프로필로 리다이렉트
   - `conflict`: 타 사용자가 이미 연동한 채널인 경우 에러 안내
   - `unconfigured`: 자격 증명 미설정 시 에러 안내

---

## 5. 개발자 포털 설정 안내 (Developer Portal Setup)

### 1) YouTube (Google Cloud Console)

1. Google Cloud Console > APIs & Services > Credentials 이동
2. OAuth 2.0 Client ID 생성 (Web application)
3. Authorized Redirect URIs 등록: `https://<YOUR_DOMAIN>/api/creators/verify/youtube/callback`
4. 환경변수 설정:
   ```env
   YOUTUBE_CLIENT_ID=your_google_client_id
   YOUTUBE_CLIENT_SECRET=your_google_client_secret
   ```

### 2) Twitch (Twitch Developer Console)

1. Twitch Developer Console > Applications > Register Your Application
2. OAuth Redirect URLs 등록: `https://<YOUR_DOMAIN>/api/creators/verify/twitch/callback`
3. 환경변수 설정:
   ```env
   TWITCH_CLIENT_ID=your_twitch_client_id
   TWITCH_CLIENT_SECRET=your_twitch_client_secret
   ```

### 3) CHZZK (Naver Developers / Chzzk OpenAPI)

1. Naver Developers / Chzzk Open API 콘솔 로그인
2. 애플리케이션 등록 및 Chzzk Open API 권한 신청
3. 서비스 URL 및 Callback URL 등록: `https://<YOUR_DOMAIN>/api/creators/verify/chzzk/callback`
4. 환경변수 설정:
   ```env
   CHZZK_CLIENT_ID=your_chzzk_client_id
   CHZZK_CLIENT_SECRET=your_chzzk_client_secret
   ```

### 4) SOOP (SOOP Developers)

1. SOOP Developers 포털 로그인 및 개발자 애플리케이션 등록
2. Callback URL 등록: `https://<YOUR_DOMAIN>/api/creators/verify/soop/callback`
3. 환경변수 설정:
   ```env
   SOOP_CLIENT_ID=your_soop_client_id
   SOOP_CLIENT_SECRET=your_soop_client_secret
   ```

---

## 5-1. 프로덕션 CI/CD 배포 설정 (GitHub Actions)

Creator provider 자격 증명은 저장소 코드에 이미 완전히 배선되어 있으며(`getCreatorProviderAdapters`,
`apps/api/src/routes/creators.ts`), 남은 것은 **운영자가 GitHub Actions에 실제 값을 등록하는 것**뿐입니다.
`.github/workflows/deploy.yml`이 아래 이름을 Cloudflare Worker(`owogg-api`)로 자동 전달합니다.

### GitHub Variables (`Settings` → `Secrets and variables` → `Actions` → `Variables`)

공개 client ID/redirect URI는 비밀이 아니므로 Variable로 등록합니다.

| 이름                        | 예시 값                                                                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `YOUTUBE_CLIENT_ID`         | Google Cloud Console OAuth Client ID                                                                                  |
| `YOUTUBE_REDIRECT_URI`      | `https://gamemoa-api.gamemoa.workers.dev/api/creators/verify/youtube/callback`                                        |
| `TWITCH_CLIENT_ID`          | Twitch Developer Console Client ID                                                                                    |
| `TWITCH_REDIRECT_URI`       | `https://gamemoa-api.gamemoa.workers.dev/api/creators/verify/twitch/callback`                                         |
| `CHZZK_CLIENT_ID`           | Naver/Chzzk Open API Client ID                                                                                        |
| `CHZZK_REDIRECT_URI`        | `https://gamemoa-api.gamemoa.workers.dev/api/creators/verify/chzzk/callback`                                          |
| `SOOP_CLIENT_ID`            | SOOP Developers Client ID                                                                                             |
| `SOOP_REDIRECT_URI`         | `https://gamemoa-api.gamemoa.workers.dev/api/creators/verify/soop/callback`                                           |
| `CREATOR_ENABLED_PROVIDERS` | 이 배포에서 필수로 기대하는 provider 목록 (예: `YOUTUBE,TWITCH`). 미설정 시 모든 provider가 선택 사항으로 취급됩니다. |

### GitHub Secrets (`Settings` → `Secrets and variables` → `Actions` → `Secrets`)

Client secret과 API Key는 자격 증명이므로 반드시 Secret으로 등록하며, Wrangler `--var`가 아닌
`wrangler secret put` 경로(`cloudflare/wrangler-action`의 `secrets:`)로만 전달합니다.

| 이름                    | 용도                                                        |
| ----------------------- | ----------------------------------------------------------- |
| `YOUTUBE_CLIENT_SECRET` | YouTube OAuth token 교환                                    |
| `YOUTUBE_API_KEY`       | YouTube 6시간 자동 재심사용 공개 지표 재조회 (OAuth와 별개) |
| `TWITCH_CLIENT_SECRET`  | Twitch OAuth token 교환 및 App Access Token 발급            |
| `CHZZK_CLIENT_SECRET`   | CHZZK OAuth token 교환 및 지표 재조회                       |
| `SOOP_CLIENT_SECRET`    | SOOP OAuth token 교환                                       |

### 선택적 provider 준비 상태 정책

Creator provider는 선택적 통합입니다. 일부 또는 전체가 미설정이어도 OwOGG 핵심 배포는 계속
진행됩니다. `CREATOR_ENABLED_PROVIDERS`를 명시적으로 설정한 provider만 프로덕션 readiness 게이트
(`pnpm smoke:prod --api-only`, `scripts/verify-production.ts`)가 `GET /api/creators/providers`의
`configured=false`를 배포 실패로 처리합니다. 설정하지 않은 provider는 상태만 보고하고 배포를 막지
않습니다. `USE_MOCK_CREATOR_PROVIDERS`는 프로덕션 배포 워크플로우에서 절대 설정하지 않습니다.

값을 등록하지 않은 provider의 실제 상태는 **외부 설정 대기**입니다. 저장소 코드/문서가 존재한다고
해서 완료로 간주하지 않습니다.

---

## 6. Featured Creator 심사 시스템 (Phase E2A)

### 6-1. 개념 구분

| 개념         | 의미                                                              | 상태 저장 위치                                  |
| :----------- | :---------------------------------------------------------------- | :---------------------------------------------- |
| **Creator**  | 공식 OAuth/API로 채널 소유권이 검증된 크리에이터                  | `creator_profiles.status = 'VERIFIED'`          |
| **Featured** | OwOGG 기준(공개 채널 지표) 기반 자격 심사 결과 (표시/필터링 전용) | `creator_profiles.featured_status = 'FEATURED'` |
| **Partner**  | 향후 직접 파트너십 (이번 단계 범위 밖)                            | —                                               |

**철칙**: Featured 상태는 절대 게임 점수(Score)/XP/랭킹 순위를 변경하지 않습니다.

### 6-2. 심사 기준 정책 (`packages/core/src/domain/featuredPolicy.ts`)

순수 도메인 정책으로 모든 기준이 단일 파일에 상수로 문서화되어 있습니다 (`FEATURED_POLICY`).

> **TEMPORARY (운영자 지시, 2026-08-14)**: `ACQUISITION_AUDIENCE_MIN` /
> `ACQUISITION_CHANNEL_AGE_MIN_DAYS` / `RETENTION_AUDIENCE_FLOOR`는 운영자 본인의 소규모
> YouTube/CHZZK/SOOP/Twitch 테스트 계정으로 소유권 인증 → 관리자 수동 심사(승인/미승인) 전체
> 플로우를 끝까지 검증할 수 있도록 현재 0으로 낮춰져 있습니다(정상 값은 각각 10,000 / 90일 /
> 8,000 — 아래 표의 괄호 값). `ACQUISITION_AUDIENCE_AUTO` / `ACQUISITION_CHANNEL_AGE_AUTO_DAYS`는
> 그대로이므로, 이 기간에도 소규모 계정이 자동으로 FEATURED가 되지는 않고 항상 관리자 수동 심사
> 큐(`/admin/creators`)로 들어갑니다. 실사용자 트래픽이 늘어나면 원래 값으로 복원해야 합니다.

| 상수                                    | 값                | 의미                                                             |
| :-------------------------------------- | :---------------- | :--------------------------------------------------------------- |
| `ACQUISITION_AUDIENCE_MIN`              | 0 (정상값 10,000) | 이 미만 → `NOT_ELIGIBLE`                                         |
| `ACQUISITION_AUDIENCE_AUTO`             | 12,000            | 이 이상 → 자동 심사 후보                                         |
| `ACQUISITION_CHANNEL_AGE_MIN_DAYS`      | 0 (정상값 90일)   | 이 미만 → `NOT_ELIGIBLE`                                         |
| `ACQUISITION_CHANNEL_AGE_AUTO_DAYS`     | 120일             | 이 이상 → 자동 심사 후보                                         |
| `RETENTION_AUDIENCE_FLOOR`              | 0 (정상값 8,000)  | E2B 재검증 하이스테리시스용 문서화 기준 (E2A에서 배지 제거 없음) |
| `REVIEW_INTERVAL_MS`                    | 6시간             | 1차 심사 주기                                                    |
| `RETRY_INTERVAL_MS`                     | 6시간             | 실패 재시도 주기                                                 |
| `MAX_ATTEMPTS`                          | 5회               | 초과 시 `MANUAL_REVIEW` 종결                                     |
| `MAX_BATCH_SIZE` / `DEFAULT_BATCH_SIZE` | 50 / 20           | 스케줄 배치 상한 (unbounded scan 금지)                           |

**의사 결정 규칙**:

1. **초기 심사 (OAuth 콜백 스냅샷)**: 콜백 스냅샷만으로는 `FEATURED`를 절대 부여하지 않습니다.
   - 소유권 미검증 → `NOT_ELIGIBLE`
   - 지표 누락/모호 → `MANUAL_REVIEW` (추정 금지)
   - 기준 미달 → `NOT_ELIGIBLE`
   - 완전 충족 → `AUTO_REVIEW_PENDING` (6시간 후 신선한 공식 지표로 재심사)
2. **6시간 재심사 (신선한 공식 지표)**: `FEATURED` / `NOT_ELIGIBLE` / `MANUAL_REVIEW`만 결정.
3. **하이스테리시스**: E2A에서는 획득 기준(10,000) 단일 기준을 사용하며, 유지 기준(8,000)은 E2B에서 활성화합니다 (배지 제거 보수 정책).

### 6-3. 심사 잡 모델 (`creator_review_jobs`)

- 소유권 인증 성공 시 해당 플랫폼 계정마다 심사 잡을 생성/리셋 (`createOrResetJob`, 멱등).
- 상태: `AUTO_REVIEW_PENDING` → (`FEATURED` | `NOT_ELIGIBLE` | `MANUAL_REVIEW`), 실패 시 `FAILED_RETRYABLE`.
- `completeJob`은 활성 상태 잡만 전이하며 `meta.changes`로 멱등성을 보장합니다 (중복 실행 시 프로필 전이 생략).
- 재시도 5회 초과 시 `MANUAL_REVIEW`로 종결됩니다.

### 6-4. 6시간 자동 재심사 스케줄러

- Cloudflare Cron Trigger `0 */6 * * *` (wrangler.jsonc `triggers.crons`) → `scheduled` 핸들러 (`apps/api/src/index.ts`).
- `runDueFeaturedReviews`: 예정 시각이 지난 잡만 바운디드 배치(기본 20, 최대 50)로 처리하며, 단일 잡/프로바이더 실패가 배치 전체를 막지 않습니다.
- 사용자 OAuth 토큰은 저장하지 않으며, 공식 app-level/공개 API로만 지표를 재조회합니다.

### 6-5. 플랫폼별 지표 재조회 (자동 심사 지원 매트릭스)

| 플랫폼  | 공식 지표 API (사용자 토큰 불필요)                                                                    | audienceCount   | channelCreatedAt              | 자동 심사                |
| :------ | :---------------------------------------------------------------------------------------------------- | :-------------- | :---------------------------- | :----------------------- |
| YouTube | `GET /youtube/v3/channels?part=snippet,statistics&id={id}&key={YOUTUBE_API_KEY}`                      | subscriberCount | ✅ (publishedAt)              | 지원                     |
| Twitch  | App Access Token(Client Credentials) + `helix/users?id=` + `helix/channels/followers?broadcaster_id=` | followers total | ✅ (created_at)               | 지원                     |
| CHZZK   | `GET /open/v1/channels?channelIds=` (Client-Id/Client-Secret 헤더)                                    | followerCount   | ❌ (미제공) → `MANUAL_REVIEW` | 제한적                   |
| SOOP    | 공개 지표 조회 불가 (사용자 토큰 필요)                                                                | —               | —                             | 미지원 → `MANUAL_REVIEW` |

- **CHZZK/SOOP**처럼 필수 지표를 공식 API로 제공하지 않는 플랫폼은 추정 금지 원칙에 따라 `MANUAL_REVIEW`로 안전하게 라우팅됩니다.
- YouTube 지표 재조회에는 별도 `YOUTUBE_API_KEY` 환경변수가 필요합니다 (OAuth Client ID와 별개).

### 6-6. E2B 재검증 정책

- 기존 Featured Creator는 취득 심사와 별도의 `REVALIDATION` 잡으로 관리합니다. 모든 Featured를 6시간 파이프라인에 계속 넣지 않습니다.
- v1 중앙 주기는 **14일**(`REVALIDATION_INTERVAL_MS`)이며, 문서화된 7~30일 범위 안에 있습니다.
- 신선한 공식 audience가 8,000 이상이면 Featured를 유지하고 다음 14일 잡을 예약합니다.
- 신선한 공식 audience가 8,000 미만이면 `NOT_ELIGIBLE`로 종결하고 Featured 배지를 제거합니다.
- 일시적 API 오류·필수 지표 미제공은 재시도 후 `MANUAL_REVIEW`로 보내며 기존 Featured 배지를 자동 제거하지 않습니다.
- 공식 API가 채널 삭제/철회를 확정한 `NOT_FOUND`/`REVOKED` 결과는 `NOT_ELIGIBLE`로 종결합니다.

## 7. 운영진 수동 심사 및 관리자 안전 (Phase E2B)

### 7-1. 관리자 권한

- 관리자 권한은 서버 바인딩 `ADMIN_USER_IDS`에 쉼표로 등록한 **명시적 OwOGG 사용자 ID**만 인정합니다.
- 값이 없거나 ID가 일치하지 않으면 기본적으로 관리자 권한이 없습니다.
- 이메일, 닉네임, Discord 이름, Creator 상태, OAuth provider identity는 관리자 권한 근거로 사용하지 않습니다.
- `ADMIN_USER_IDS`는 API Worker 서버 설정/GitHub Actions Variable로만 전달하며 Web API나 클라이언트에 노출하지 않습니다.

### 7-2. 수동 심사 큐

- 보호된 API/UI 경로: `GET /api/admin/creators/reviews`, `POST /api/admin/creators/reviews/:jobId/action`, `/admin/creators`.
- 큐에는 `MANUAL_REVIEW`로 종결된 합법적인 심사 잡만 포함합니다. 취득 심사와 재검증 심사는 `review_type`으로 구분합니다.
- 관리자에게 표시하는 정보는 사용자 ID/닉네임, 플랫폼·채널 identity/name/link, 소유권 검증 상태, audience, 채널 생성일, 최신 동기화 시각, 시스템 심사 사유, 이전 상태로 제한합니다.
- OAuth access/refresh token, client secret, provider response 원문, 내부 `last_error`는 큐/UI/API에 노출하지 않습니다.
- `APPROVE_FEATURED`는 Creator profile과 platform account가 모두 `VERIFIED`일 때만 허용합니다.
- `REJECT_FEATURED`는 `NOT_ELIGIBLE`로 전이하고, `KEEP_FOR_REVIEW`는 Featured 상태를 변경하지 않은 채 추가 확인 상태를 유지합니다.
- 모든 결정은 사유를 필수로 받고 `creator_review_audit_log`에 reviewer/action/reason/상태 전이/안전한 지표 snapshot을 append-only로 기록합니다. 일반 UI/API에는 감사 로그 수정·삭제 기능이 없습니다.
- 동일 승인/거절 요청을 재전송해도 이미 종결된 잡에는 새 전이·감사 행을 만들지 않습니다. 동일한 `KEEP_FOR_REVIEW` 재전송도 중복 감사 행을 만들지 않습니다.

### 7-3. Creator 노출 원칙

- Creator 화면에는 `✓ Creator`, `★ Featured Creator`, `자동 심사 대기`, `추가 확인 필요`, `기준 미달` 상태만 안전한 공개 사유와 함께 표시합니다.
- 운영진이 입력한 내부 심사 사유는 Creator API/UI로 전달하지 않습니다.
- Featured는 표시·필터링 전용이며 게임 점수, XP, 게임 랭킹 계산에는 절대 사용하지 않습니다.

## 8. 계정 통합과 Creator 소유권

Primary Account Wins 계정 통합에서 Primary Creator profile의 presentation/settings가 우선합니다.

- Primary에 없는 플랫폼의 Secondary 검증 채널은 동일한 `(platform, platform_user_id)` 중복 없이 Primary Creator profile로 이전합니다.
- 두 계정이 같은 플랫폼의 서로 다른 외부 채널을 보유하면 안전한 선택이 불가능하므로 통합을 차단합니다.
- 이전되는 platform account의 ID를 유지하므로 연결된 `creator_review_jobs`와 append-only `creator_review_audit_log`의 역사적 연결을 보존합니다.
- Secondary의 XP, score, 진행도는 Creator profile이나 Creator 랭킹에 합산되지 않습니다.
- Featured 상태는 통합 여부와 무관하게 score/XP/ranking 계산에 영향을 주지 않습니다.
