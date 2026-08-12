# GAMEMOA 소셜 로그인 설정 런북 (OAuth Setup Guide)

GAMEMOA 미니게임 플랫폼의 **Google** 및 **Discord** 소셜 로그인 설정 및 배포 런북입니다.

---

## 1. 개요 및 보안 원칙

1. **비밀 키 보호 (No Secret Exposure)**
   - Client Secret (디스코드 비밀키 등)은 절대로 Git 저장소, wrangler.jsonc, README, 로그, 웹 번들에 노출되어서는 안 됩니다.
   - Cloudflare Worker Secret 또는 GitHub Repository Secrets으로만 관리합니다.

2. **자동화 범위 구분**
   - **자동화 가능 (Repository & Code)**: Hono API 엔드포인트 (`/api/auth/google`, `/api/auth/discord`, `/api/auth/providers`), Zod 계약 파싱, 웹 컴포넌트 Fallback UI, 환경 변수 주입.
   - **사용자 작업 필요 (Developer Console)**: Google Cloud Console 및 Discord Developer Portal에서 애플리케이션 생성 및 리디렉션 URI 등록.
   - **수동 브라우저 수락 (Browser Test)**: 실제 사용자 계정으로 로그인 동작 최종 검증.

---

## 2. Google OAuth 2.0 설정

### A. Google Cloud Console 작업

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택 후 **API 및 서비스 > 사용자 인증 정보**로 이동
3. **사용자 인증 정보 만들기 > OAuth 클라이언트 ID** 선택
4. 애플리케이션 유형: `웹 애플리케이션` (Web Application)
5. **승인된 JavaScript 원본 (Authorized JavaScript origins)**:
   - 개발 환경: `http://localhost:5173`, `http://localhost:3000`
   - 프로덕션: `https://gamemoa-web.gamemoa.workers.dev`
6. **승인된 리디렉션 URI (Authorized redirect URIs)**:
   - 프로덕션 frontend 도메인 등록
7. 생성된 **Web Client ID** 복사 (예: `123456789-xxx.apps.googleusercontent.com`)

### B. 환경 변수 및 단일 출처 설정

- **API Worker (Wrangler / GitHub Actions Variables)**:
  - `GOOGLE_CLIENT_ID`: 생성된 Google Web Client ID
- **Web Frontend**:
  - `GET /api/auth/providers` 엔드포인트를 통해 API 런타임으로부터 공개 Google Client ID (`providerStatus.google.clientId`)를 수신하여 Single Source of Truth로 사용합니다.

---

## 3. Discord OAuth 2.0 설정

### A. Discord Developer Portal 작업

1. [Discord Developer Portal](https://discord.com/developers/applications) 접속
2. **New Application** 클릭 후 이름 설정 (예: `GAMEMOA`)
3. **OAuth2 > General** 메뉴 이동
4. **Client ID** 복사
5. **Client Secret** 생성 후 안전한 장소에 복사 (절대 공개 금지)
6. **Redirects** 항목에 카카오/디스코드 인증 콜백 URI 추가:
   - 개발 환경: `http://localhost:8787/api/auth/discord/callback`
   - 프로덕션: `https://gamemoa-api.gamemoa.workers.dev/api/auth/discord/callback`

### B. 환경 변수 및 Worker Secret 설정

- **API Worker Settings**:
  - `DISCORD_CLIENT_ID`: 생성된 Discord Application Client ID
  - `DISCORD_REDIRECT_URI`: `https://gamemoa-api.gamemoa.workers.dev/api/auth/discord/callback`
  - `FRONTEND_URL`: `https://gamemoa-web.gamemoa.workers.dev`
- **Worker Secret 등록 (Command Line)**:
  ```bash
  pnpm --filter @gamemoa/api exec wrangler secret put DISCORD_CLIENT_SECRET
  ```
  명령어 실행 후 복사한 Client Secret 입력.

---

## 4. 소셜 로그인 진단 및 검증

### A. 서버 구성 진단 엔드포인트 (`GET /api/auth/providers`)

비밀번호/비밀키 노출 없이 현재 백엔드가 소셜 로그인 설정이 완료되었는지 확인합니다:

```json
{
  "google": {
    "configured": true
  },
  "discord": {
    "configured": true
  }
}
```

### B. 브라우저 실제 테스트

1. GAMEMOA 프로덕션 상단 **로그인** 버튼 클릭
2. Google / Discord 로그인 선택
3. 계정 인증 완료 후 `gamemoa_session` 쿠키 생성 확인
4. `/api/auth/me` 응답이 `authenticated: true` 및 사용자 프로필 데이터 반환 확인
5. 상단 프로필 유저 정보 표시 및 프로필 페이지 접근 확인
6. 로그아웃 클릭 후 세션 정상 파기 확인
