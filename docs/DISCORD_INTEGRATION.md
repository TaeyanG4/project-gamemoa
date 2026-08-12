# GAMEMOA Discord 연동 (DISCORD_INTEGRATION)

이 문서는 GAMEMOA 플레이어 플랫폼 확장 스프린트의 **Phase F: Discord HTTP Interactions 파운데이션** 및 **Phase G: Discord 서버 시스템 & 커뮤니티 Hub**를 설명합니다.

> 📌 **핵심 아키텍처 원칙**:
>
> - **일반 GAMEMOA 랭킹 != Discord 서버 시스템**: 일반 게임 점수 랭킹은 `/ranking`에 유지되며, Discord 서버 커뮤니티 기능은 `/discord` 하위 전용 주소에 완전히 분리됩니다.
> - **Gateway 없음**: `discord.js` 등 WebSocket 기반 봇 데몬 없이 Hono Worker HTTP Interactions 및 OAuth 2.0만 사용합니다.
> - **권한 없는 임의 등록 불가**: 클라이언트 제출 arbitrary `guild_id`는 거부되며, Discord OAuth `guilds` 스코프 기반 1회용 인증으로 `MANAGE_GUILD` / `ADMINISTRATOR` 권한이 증명된 길드만 등록 가능합니다.
> - **장기 access_token 미저장**: 권한 확인 직후 access_token은 즉시 폐기되며 DB에 보관되지 않습니다.

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

- `/discord`: GAMEMOA × Discord 커뮤니티 Hub (내 관리 서버, 계정 연결 상태)
- `/discord/servers`: 공개 서버 디렉토리 & 검색 + 서버 등록 위저드
- `/discord/servers/:slug`: 공개 서버 페이지 (서버 정보 및 Phase H 랭킹 정갈한 자리표시자)
- `/discord/servers/:slug/manage`: 서버 관리 페이지 (설명/vanity slug/가시성 변경, 등록 해제)

### 서버 등록 OAuth 흐름

1. 인증된 GAMEMOA 유저가 `/api/auth/discord/register-server`로 이동 → state 쿠키(`discord_register_server_state`) 생성 후 Discord OAuth (`scope: "identify guilds"`)로 리다이렉트.
2. 콜백 `/api/auth/discord/callback`에서 access_token을 교환 후 `GET https://discord.com/api/v10/users/@me/guilds` 호출.
3. `owner === true` 이거나 `(permissions & (MANAGE_GUILD | ADMINISTRATOR)) !== 0` 조건으로 관리 가능한 길드만 필터링.
4. 관리 가능 길드 목록을 1회용 해시 챌린지(`discord_server_registration_challenges`, 15분 만료)로 DB에 저장하고 **Discord access_token은 즉시 삭제**.
5. 웹 `/discord/servers?register_token=...`로 리다이렉트되어 사용자가 관리 가능한 길드를 선택 및 Vanity Slug/가시성을 설정하여 등록.

### 가시성 (Visibility) 정책

- `PUBLIC`: 디렉토리/검색(`/discord/servers`)에 노출되고 누구나 공개 페이지 접속 가능.
- `UNLISTED`: 검색에 노출되지 않으나 직링크 접속 가능.
- `PRIVATE`: 검색 미노출 및 권한 있는 관리자만 접근 가능 (비인증 유저에게 403 Forbidden).

---

## 3. 데이터 모델

### `0006_discord_link.sql`

- `discord_link_challenges` (`token_hash`, `discord_user_id`, `discord_username`, `created_at`, `expires_at`, `consumed_at`)

### `0007_discord_guilds.sql`

- `discord_guilds`: `guild_id`(PRIMARY KEY, canonical identity), `slug`(UNIQUE), `name`, `icon_url`, `description`, `visibility`('PUBLIC'|'UNLISTED'|'PRIVATE'), `registration_status`('ACTIVE'|'DISABLED'), `registered_by_user_id`, `registered_at`, `first_seen_at`, `last_seen_at`, `updated_at`.
- `discord_guild_managers`: `guild_id`, `user_id`, `role`('OWNER'|'MANAGER'), `created_at`, `updated_at`, `PRIMARY KEY (guild_id, user_id)`.
- `discord_server_registration_challenges`: `token_hash`, `user_id`, `manageable_guilds_json`, `created_at`, `expires_at`, `consumed_at`.

---

## 4. 필요한 설정값 & 명령어 등록

| 변수                     | 종류 | 용도                                                              |
| ------------------------ | ---- | ----------------------------------------------------------------- |
| `DISCORD_APPLICATION_ID` | 공개 | CLI 명령어 등록 스크립트                                          |
| `DISCORD_PUBLIC_KEY`     | 공개 | Worker Interaction Ed25519 서명 검증                              |
| `DISCORD_BOT_TOKEN`      | 비밀 | 로컬 명령어 등록 스크립트 전용 (`pnpm discord:commands:register`) |

---

## 5. 다음 단계 (Phase H)

- **Phase H: Discord 길드 XP & 서버 랭킹**:
  - `/gamemoa play`: 길드-바인딩 플레이 컨텍스트
  - 길드-로컬 사용자 XP 원장 및 주간 XP
  - 전역 서버 랭킹 및 `/gamemoa rank|leaderboard|play|server`
