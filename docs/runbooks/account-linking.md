# OwOGG 계정 연결 및 통합 런북 (Account Linking & Merge Runbook)

OwOGG 계정 식별 모델, OAuth 공급자 연결/연결 해제, 그리고 Primary Account Wins 계정
통합 정책과 절차를 설명합니다.

---

## 1. 계정 식별 모델 (기본 정책)

1. **Google 로그인과 Discord 로그인은 기본적으로 별도 OwOGG 계정입니다.**
   - Google OAuth → OwOGG 계정 A
   - Discord OAuth → OwOGG 계정 B
2. **이메일이 동일해도 자동 병합하지 않습니다.**
   - 이메일은 메타데이터(검증 힌트, 중복 계정 안내)로만 사용하며, 정규 식별자로 사용하지
     않습니다.
   - 정규 식별자는 프로바이더별로 `provider` + `provider_user_id` 캐노니컬 키를 사용합니다.
     - Google: `provider = "google"`, `provider_user_id` = Google `sub`
     - Discord: `provider = "discord"`, `provider_user_id` = Discord 사용자 ID
3. **사용자가 명시적으로 요청할 때만 계정 통합을 진행합니다.**

---

## 2. OAuth 공급자 연결 (Login vs Link)

로그인(LOGIN)과 연결(LINK)은 서로 다른 흐름으로 명시적으로 분리되어 있습니다. 이메일 일치
여부로 LOGIN을 LINK로 자동 전환하지 않습니다.

- **LOGIN**: `/api/auth/google`, `/api/auth/discord(+callback)` — 공급자 식별 → 기존 연결
  OwOGG 계정 또는 신규 별도 OwOGG 계정 생성.
- **LINK**: 이미 인증된 OwOGG 계정 + 새로 인증된 두 번째 공급자를 현재 계정에 추가.
  - `POST /api/auth/link/google` (GIS 자격증명 검증 후 연결)
  - `GET /api/auth/link/discord` 후 공용 `GET /api/auth/discord/callback` (state 쿠키로 LINK 흐름 식별)

LINK 흐름의 Discord OAuth `state`는 인증된 세션과 연결 계정에 바인딩되며, 콜백에서 현재
세션을 재검증합니다.

### Discord Developer Portal — LINK 콜백 URI 등록

로그인과 LINK는 하나의 콜백 경로를 공유합니다. Discord Developer Portal에는 현재 아래 URI 하나만
등록합니다.

- 로그인 및 연결: `https://api.owogg.com/api/auth/discord/callback`
- 개발 환경 예시: `http://localhost:8787/api/auth/discord/callback`

---

## 3. 공급자 연결 충돌 (ACCOUNT_ALREADY_LINKED)

연결하려는 공급자 식별자가 이미 다른 OwOGG 계정에 속해 있으면 자동으로 이동/병합하지
않고 **명시적 충돌**을 반환합니다.

- 응답: `409`, `error.code = "ACCOUNT_ALREADY_LINKED"`, `conflictUserId`, 그리고
  갓 생성된 단기 `mergeChallenge`(신규 인증 증거에 바인딩).
- 웹은 "이 계정은 이미 다른 OwOGG 계정으로 사용 중입니다." 안내와 함께 **계정 통합**을
  제안합니다.

---

## 4. Primary Account Wins 계정 통합 정책

사용자가 두 OwOGG 계정을 통합할 때, v1 구현은 **Primary Account Wins** 방식을 사용합니다.

- **Primary(유지)** 계정: 사용자가 선택한 데이터를 유지하는 계정.
- **Secondary(삭제)** 계정: 통합 시 데이터를 폐기하는 계정.

### 통합 시 데이터 처리 (기록은 병합하지 않음)

- Primary 계정의 점수/랭킹/즐겨찾기/최근 플레이/프로필/계정 식별 → **유지**.
- Secondary 계정의 게임 기록/랭킹 기록/즐겨찾기/최근 플레이/세션 → **삭제**.
  - 베스트 스코어 합집합, 즐겨찾기 합집합, 최근 플레이 합집합을 수행하지 않습니다.
- Secondary 계정의 Google/Discord 로그인 수단 → **Primary 계정으로 이전**.
- Secondary 계정 사용자 행은 공급자 이전 후 **삭제**.
- Secondary의 `xp_events`, `user_progress`, `user_achievements`는 합산하지 않고 삭제합니다.
- Secondary에서 파생된 `discord_guild_xp_events`는 XP 원장 삭제 전에 명시적으로 삭제합니다.
- Discord guild manager, 등록자, 대기 중 서버 등록/Play Context는 Primary로 안전하게 재지정합니다.
- Creator profile이 충돌 없이 이전 가능한 외부 채널은 계정 행과 심사 잡을 보존한 채 Primary profile로 이전합니다.
- 두 계정에 같은 플랫폼의 서로 다른 Creator 채널이 있으면 병합하지 않습니다.
- `creator_review_audit_log`는 병합을 위해 수정하거나 삭제하지 않습니다.

이 정책은 랭킹 모호성, 멀티 계정 점수 패밍, 중복 데이터 정책 복잡성을 회피합니다. UI는 이
사실을 한국어로 명확히 안내합니다.

### 통합 권한 증명

통합은 기존 관계만으로 진행되지 않으며, 아래를 모두 요구합니다.

1. 현재 유효한 OwOGG 세션 (소유 계정 증명).
2. 갓 인증된 두 번째 OAuth 공급자 증거 (LINK 충돌 시점에서 발행).
3. 단기/일회용 서버측 `mergeChallenge` (10분 TTL, 후보 쌍 + 공급자 증거에 바인딩).
4. 명시적 최종 확인 (삭제 경고 포함).

### 원자성

통합은 D1 `batch` 단일 트랜잭션으로 all-or-nothing 처리됩니다.

1. Creator 플랫폼 충돌 및 동일 provider 충돌 사전 확인
2. Secondary에서 파생된 Discord Guild XP 삭제
3. Secondary 점수, 즐겨찾기, 최근 플레이 삭제
4. Secondary XP 원장, 진행도 집계, 도전과제와 세션 삭제
5. Discord identity-like 관계와 대기 컨텍스트를 Primary로 재지정
6. 충돌 없는 Creator 외부 채널 계정과 심사 잡 보존
7. Secondary `oauth_accounts`를 Primary로 이전하고 Primary 계정 데이터 보존
8. merge challenge 소비와 Secondary 사용자 삭제

---

## 5. 연결 해제 (Unlink)

- `DELETE /api/auth/link/:provider`
- **마지막 로그인 수단은 해제할 수 없습니다.** 남은 공급자가 없으면
  `error.code = "LAST_AUTH_PROVIDER"`(400)로 차단합니다.
- 공급자가 2개 이상일 때만 해제가 허용됩니다.

---

## 6. 통합 후 로그인 검증

Primary = A(예: Google) + B(Discord)→ A 통합 후:

- Google 로그인 → 사용자 A
- Discord 로그인 → 동일 사용자 A

동일 `user.id`, 프로필, 점수, 즐겨찾기, 개인화로 귀결됩니다.

---

## 7. 관련 API 엔드포인트

| 메서드   | 경로                                 | 설명                           |
| :------- | :----------------------------------- | :----------------------------- |
| `GET`    | `/api/auth/accounts`                 | 현재 계정의 연결된 공급자 목록 |
| `POST`   | `/api/auth/link/google`              | Google 공급자 연결             |
| `GET`    | `/api/auth/link/discord`             | Discord LINK OAuth 시작        |
| `GET`    | `/api/auth/discord/callback`         | Discord LOGIN/LINK 공용 콜백   |
| `DELETE` | `/api/auth/link/:provider`           | 공급자 연결 해제               |
| `POST`   | `/api/auth/merge/challenge`          | 기존 대기중 통합 챌린지 조회   |
| `GET`    | `/api/auth/merge/preview?challenge=` | 양 계정 안전 요약              |
| `POST`   | `/api/auth/merge/confirm`            | Primary Account Wins 통합 확정 |
