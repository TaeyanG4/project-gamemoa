# GAMEMOA 크리에이터 시스템 & 채널 소유권 검증 (Creator System & Channel Ownership Verification)

이 문서는 GAMEMOA 플랫폼의 크리에이터(스트리머/유튜버) 채널 소유권 검증 및 크리에이터 모델의 아키텍처, 검증 원칙, 보안 정책, 플랫폼별 OAuth API 연동 가이드를 설명합니다.

---

## 1. 크리에이터 채널 소유권 검증의 정의 (Definition of Verification)

- **소유권 검증의 의미**: "GAMEMOA가 해당 사용자가 지정된 플랫폼(YouTube, CHZZK, SOOP, Twitch)의 채널/계정을 직접 소유 및 제어하고 있음을 공식 API로 검증했음"을 뜻합니다.
- **포함되지 않는 항목**:
  - 파트너/유명 크리에이터 표식(Featured)이 아니며, 인기도/유명세를 보증하지 않습니다.
  - 게임 점수(Score)나 경험치(XP)에 어떠한 가산점이나 이점도 제공하지 않습니다.
- **혜택**:
  - 통합 랭킹 UI (`/ranking`)의 `[🎥 스트리머 랭킹]` 탭 노출
  - 내 프로필 페이지 (`/profile`)의 공식 크리에이터 채널 링크 및 검증 배지 표시

---

## 2. 핵심 검증 원칙 (Core Verification Invariants)

1. **약한/취약한 검증 방식 절대 금지**:
   - 사용자가 입력한 채널 URL, 닉네임, 핸들 텍스트 입력만으로 연동 처리하지 않습니다.
   - 계정 이메일 일치 여부만으로 자동 연동하지 않습니다.
   - 웹 스크래핑(Scraping) 기법을 절대 사용하지 않습니다.
2. **공식 OAuth 2.0 & API 전용**:
   - 각 플랫폼의 공식 OAuth authorization code grant 워크플로우와 공식 REST API만 사용합니다.
3. **단일 소유권 보장 (`UNIQUE(platform, platform_user_id)`)**:
   - 하나의 외부 채널(예: 특정 YouTube 채널 ID)은 GAMEMOA의 단 한 명의 사용자 계정에만 연동될 수 있습니다.
   - 이미 다른 GAMEMOA 사용자가 연동한 채널을 다시 연동하려고 하면 `CHANNEL_ALREADY_VERIFIED` 에러가 반환됩니다.
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

## 4. 인증 보안 및 상태 복원성 (OAuth Security)

1. **CSRF 방지 (State Cookie)**:
   - 인증 시작 시 `crypto.randomUUID()`로 Cryptographic State 생성
   - `HttpOnly`, `SameSite=Lax`, `maxAge=600` 쿠키 (`creator_verify_state`)에 `{ state, userId, platform }` 저장
2. **세션 재검증 (Session Re-validation)**:
   - OAuth Callback 시 쿠키의 `userId`와 현재 로그인된 GAMEMOA 사용자 세션의 `userId`가 일치하는지 엄격히 검증
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
