# GAMEMOA Discord 연동 (DISCORD_INTEGRATION)

이 문서는 GAMEMOA 플레이어 플랫폼 확장 스프린트의 **Phase F: Discord HTTP Interactions 파운데이션**, **Phase G: Discord 서버 시스템 & 커뮤니티 Hub**, **Phase H1: Discord 길드 XP 귀속 파운데이션 & `/gamemoa play`**, 그리고 **Phase H2: Discord 서버 리더보드 & 커맨드**를 설명합니다.

> 📌 **핵심 아키텍처 원칙**:
>
> - **일반 GAMEMOA 랭킹 != Discord 서버 시스템**: 일반 게임 점수 랭킹은 `/ranking`에 유지되며, Discord 서버 커뮤니티 기능은 `/discord` 하위 전용 주소에 완전히 분리됩니다.
> - **Gateway 없음**: `discord.js` 등 WebSocket 기반 봇 데몬 없이 Hono Worker HTTP Interactions 및 OAuth 2.0만 사용합니다.
> - **권한 없는 임의 등록 불가**: 클라이언트 제출 arbitrary `guild_id`는 거부되며, Discord OAuth `guilds` 스코프 기반 1회용 인증으로 `MANAGE_GUILD` / `ADMINISTRATOR` 권한이 증명된 길드만 등록 가능합니다.
> - **장기 access_token 미저장**: 권한 확인 직후 access_token은 즉시 폐기되며 DB에 보관되지 않습니다.
> - **3가지 XP 개념의 엄격한 분리 (Phase H Invariants)**:
>   1. **Global GAMEMOA User XP** (글로벌 사용자 활동 레벨)
>   2. **Discord Guild-local User XP** (특정 서버 내 사용자 기여 XP)
>   3. **Discord Guild Activity XP** (서버 전체 누적 활동 XP)
>   - 25,000 global XP를 가진 유저가 새로운 Guild A에 참여하더라도 **Guild A XP = 0**에서 시작합니다.
>   - 길드 XP 귀속액은 해당 승인된 점수 완료로 **실제 지급된 글로벌 XP(+10 또는 일일 상한 시 0)**와 정확히 동일합니다.
>   - **KST 주간 경계**: 월요일 00:00:00 Asia/Seoul (KST) = 일요일 15:00:00 UTC 기준 주간 리더보드 집계. 영구 XP 데이터는 절대로 삭제되거나 초기화되지 않습니다.

---

## 1. Phase F — HTTP Interactions 파운데이션

```
Discord 사용자 → /gamemoa 슬래시 커맨드
  → Discord 서버가 서명된 HTTP POST 전송
  → POST /api/discord/interactions (Hono Worker)
  → Ed25519 서명 검증
  → GAMEMOA 애플리케이션 서비스 (기존 use case 재사용)
  → 즉시 JSON 응답 (3초 이내)
```

- **상시 Gateway 연결 없음**: WebSocket 봇 프로세스 데몬을 사용하지 않습니다.
- **Ed25519 서명 검증**: `apps/api/src/infrastructure/discord/signature.ts` — Cloudflare Workers `crypto.subtle` Web Crypto API 사용.
- **v1 명령어**:
  - `/gamemoa games`: 게임 카탈로그 목록 (하드코딩 없음)
  - `/gamemoa link`: GAMEMOA 계정과 연동하는 1회용 해시 링크 발급 (`discord_link_challenges`, 마이그레이션 `0006`)
  - `/gamemoa profile`: 연동 계정의 닉네임/레벨/XP 요약

---

## 2. Phase G — Discord 서버 시스템 & 커뮤니티 Hub

Discord 서버 기능은 다음 웹 전용 라우트에 위치합니다:

- `/discord`: GAMEMOA × Discord 커뮤니티 Hub (내 관리 서버, 주간 서버 활동 랭킹)
- `/discord/servers`: 공개 서버 디렉토리 & 검색 + 서버 등록 위저드
- `/discord/servers/:slug`: 공개 서버 페이지 (서버 XP, 주간 XP, 게임별 랭킹 탭)
- `/discord/servers/:slug/manage`: 서버 관리 페이지 (설명/vanity slug/가시성 변경, 등록 해제)

### 서버 등록 OAuth 흐름

1. 인증된 GAMEMOA 유저가 `/api/auth/discord/register-server`로 이동 → state 쿠키(`discord_register_server_state`) 생성 후 Discord OAuth (`scope: "identify guilds"`)로 리다이렉트.
2. 콜백 `/api/auth/discord/callback`에서 access_token을 교환 후 `GET https://discord.com/api/v10/users/@me/guilds` 호출.
3. `owner === true` 이거나 `(permissions & (MANAGE_GUILD | ADMINISTRATOR)) !== 0` 조건으로 관리 가능한 길드만 필터링.
4. 관리 가능 길드 목록을 1회용 해시 챌린지(`discord_server_registration_challenges`, 15분 만료)로 DB에 저장하고 **Discord access_token은 즉시 삭제**.
5. 웹 `/discord/servers?register_token=...`로 리다이렉트되어 사용자가 관리 가능한 길드를 선택 및 Vanity Slug/가시성을 설정하여 등록.

---

## 3. Phase H1 — Discord 길드 XP 귀속 파운데이션 & `/gamemoa play`

### `/gamemoa play [game]` 명령어 흐름

1. **Discord 서버 채널에서 실행**: 서명된 Interaction으로 `guild_id` 및 `discord_user_id` 확인.
2. **서버 활성화 및 계정 연동 검증**: 등록되어 `ACTIVE` 상태인 서버여야 하며, 해당 Discord 유저가 GAMEMOA 계정에 연동되어 있어야 함. (미등록/미연동 시 안내 메시지 즉시 반환)
3. **1회용 Play Context 토큰 생성**: DB(`discord_play_contexts`)에는 SHA-256 해시만 저장 (15분 만료). `guild_id`, `discord_user_id`, GAMEMOA `user_id`, 선택적 `game_id` 바인딩.
4. **URL Fragment 전달 & Referer 보안**: 웹 URL에 `#play_token=<token>` 형식을 사용하여 전달. 웹 SPA 로드 즉시 메모리에 추출 후 `window.history.replaceState`로 URL에서 제거해 HTTP `Referer` 토큰 누출을 방지.
5. **점수 제출 시 원자적 귀속**: `POST /api/scores`에 `play_token` 전달 시:
   - 세션 유저, 게임 ID, 토큰 만료 여부, 소비 여부 검증 후 토큰 소비 처리.
   - `discord_guild_xp_events` 테이블에 `UNIQUE(source_xp_event_id)` 제약조건으로 1:1 원자적 귀속 기록.

---

## 4. Phase H2 — Discord 서버 리더보드 & 커맨드

### 슬래시 커맨드 확장

- `/gamemoa rank`: 이 Discord 서버 내 나의 GAMEMOA 순위와 기여 XP 확인 (미연동/미등록 서버 거부)
- `/gamemoa leaderboard`: 이 Discord 서버의 Top 10 XP 리더보드 & 웹 서버 페이지 링크 제공
- `/gamemoa server`: 이 Discord 서버의 활동 정보 요약 (전체 XP, 주간 XP, 참여자 수)

### 리더보드 & API 구현

- **길드 내 XP 랭킹**: `SELECT e.user_id, u.nickname, SUM(e.amount) as xp FROM discord_guild_xp_events ... ORDER BY xp DESC, e.user_id ASC`
- **주간 경계 계산**: `getStartOfWeekKst` helper를 통해 `created_at >= startOfWeekIso` 조건 적용.
- **전역 서버 활동 랭킹**: `ACTIVE` + `PUBLIC` 가시성 서버만 포함. `PRIVATE`/`UNLISTED` 서버는 전역 활동 랭킹 목록에서 유출되지 않도록 엄격 격리.
- **서버 게임 랭킹**: canonical `scores` 테이블에서 해당 서버 기여 참여자(`user_id IN (SELECT DISTINCT user_id FROM discord_guild_xp_events WHERE guild_id = ?)`)의 최고 기록을 매니페스트 scoreConfig 방향에 맞춰 조회.

---

## 5. 데이터 모델

### `0006_discord_link.sql`

- `discord_link_challenges` (`token_hash`, `discord_user_id`, `discord_username`, `created_at`, `expires_at`, `consumed_at`)

### `0007_discord_guilds.sql`

- `discord_guilds`: `guild_id`(PRIMARY KEY, canonical identity), `slug`(UNIQUE), `name`, `icon_url`, `description`, `visibility`('PUBLIC'|'UNLISTED'|'PRIVATE'), `registration_status`('ACTIVE'|'DISABLED'), `registered_by_user_id`, `registered_at`, `first_seen_at`, `last_seen_at`, `updated_at`.
- `discord_guild_managers`: `guild_id`, `user_id`, `role`('OWNER'|'MANAGER'), `created_at`, `updated_at`, `PRIMARY KEY (guild_id, user_id)`.
- `discord_server_registration_challenges`: `token_hash`, `user_id`, `manageable_guilds_json`, `created_at`, `expires_at`, `consumed_at`.

### `0008_discord_guild_xp.sql`

- `discord_play_contexts`: `token_hash`(PK), `guild_id`, `discord_user_id`, `user_id`, `game_id`, `created_at`, `expires_at`, `consumed_at`.
- `discord_guild_xp_events`: `id`(PK), `guild_id`, `user_id`, `source_xp_event_id`(UNIQUE), `amount`, `created_at`.

### `0009_discord_guild_xp_weekly_idx.sql`

- `idx_discord_guild_xp_guild_created`: `(guild_id, created_at)` 인덱스 추가.

---

## 6. 필요한 설정값 & 명령어 등록

| 변수                     | 종류 | 용도                                                              |
| ------------------------ | ---- | ----------------------------------------------------------------- |
| `DISCORD_APPLICATION_ID` | 공개 | CLI 명령어 등록 스크립트                                          |
| `DISCORD_PUBLIC_KEY`     | 공개 | Worker Interaction Ed25519 서명 검증                              |
| `DISCORD_BOT_TOKEN`      | 비밀 | 로컬 명령어 등록 스크립트 전용 (`pnpm discord:commands:register`) |

추가 OAuth 및 운영 설정은 다음과 같습니다.

| 변수                    | 종류      | 용도                                                                 |
| ----------------------- | --------- | -------------------------------------------------------------------- |
| `DISCORD_CLIENT_ID`     | 공개      | Discord LOGIN/LINK/서버 등록 OAuth client ID 및 명령어 등록 fallback |
| `DISCORD_CLIENT_SECRET` | 비밀      | authorization code 교환                                              |
| `DISCORD_REDIRECT_URI`  | 공개      | LOGIN과 LINK가 공유하는 `/api/auth/discord/callback`                 |
| `FRONTEND_URL`          | 공개      | 웹 redirect와 Play/명령어 링크 생성                                  |
| `DISCORD_INSTALL_URL`   | 선택 공개 | Portal에서 실제 구성한 설치 링크. 없으면 URL을 추정하지 않음         |

## 7. 설치와 GAMEMOA 서버 등록의 분리

Discord 앱 설치는 Discord에서 앱/명령어를 사용할 준비를 하는 단계이며, GAMEMOA 서버 등록은 웹에서
별도로 수행하는 데이터 등록 단계입니다. 앱 설치만으로 서버가 `PUBLIC` 디렉토리에 게시되지 않습니다.

관리자는 `/discord/servers`에서 GAMEMOA 로그인 → Discord OAuth `identify guilds` 승인 → 관리 가능한
길드 선택 → slug/설명/`PUBLIC`·`UNLISTED`·`PRIVATE` 선택 → 등록 확정 순서를 수행합니다. 서버 등록 OAuth는
공식 `/users/@me/guilds` 응답에서 소유자 또는 `MANAGE_GUILD`/`ADMINISTRATOR` 권한이 있는 길드만 후보로
사용하고, access token을 저장하지 않습니다.

일반 사용자는 Discord에서 `/gamemoa link`를 실행한 뒤 1회용 웹 링크에서 GAMEMOA 로그인과 연결 확인을
수행합니다. 자세한 명령어 표와 사용자 안내는 `docs/DISCORD_BOT_GUIDE.md`, 공개 웹 안내는
`/discord/guide`를 참고합니다.

## 8. 현재 운영 설정 확인

Developer Portal의 Interactions Endpoint URL은 다음 API 경로를 사용합니다.

```text
https://gamemoa-api.gamemoa.workers.dev/api/discord/interactions
```

Redirect URI는 LOGIN과 LINK에 공통으로 다음 하나를 사용합니다.

```text
https://gamemoa-api.gamemoa.workers.dev/api/auth/discord/callback
```

`DISCORD_PUBLIC_KEY` 전달, Portal endpoint 등록, `pnpm discord:commands:register` 실행과 실제 설치 링크
구성은 Discord Developer Portal 접근이 필요하므로 **외부 설정 대기**로 별도 확인합니다. 공식 설치 scope와
permissions는 Portal의 Installation 설정 및 현재 Discord 공식 문서를 기준으로 확인하며, 코드나 문서에서
임의 숫자를 조합하지 않습니다.
