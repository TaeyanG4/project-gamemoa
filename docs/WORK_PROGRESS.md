# GAMEMOA 작업 진행 현황 (WORK_PROGRESS)

# 현재 목표

**GAMEMOA 플레이어 플랫폼 확장 스프린트 (My Page / Creator Ranking / Discord Community)** — 지금까지
**Phase B(진행도 파운데이션)**, **Phase C(My Page)**, **Phase F(Discord HTTP Interactions 파운데이션)**,
**Phase G(Discord 서버 시스템 & 커뮤니티 Hub)**를 완수했습니다.
전체 스프린트 단계 구조는 `docs/ROADMAP.md` §1, 상세 설계는 `docs/PROGRESSION.md`(진행도),
`docs/DISCORD_INTEGRATION.md`(Discord)를 참고하세요.

---

## 완료

### Phase G: Discord 서버 시스템 & 커뮤니티 Hub (이번 세션)

- [x] **D1 마이그레이션 `0007_discord_guilds.sql`**:
  - `discord_guilds` (`guild_id` PK, `slug` UNIQUE, `name`, `icon_url`, `description`, `visibility`, `registration_status`, `registered_by_user_id`, timestamps)
  - `discord_guild_managers` (`guild_id`, `user_id`, `role`, timestamps)
  - `discord_server_registration_challenges` (`token_hash` PK, `user_id`, `manageable_guilds_json`, `created_at`, `expires_at`, `consumed_at`)
- [x] **순수 도메인 정책 (`discordGuildPolicy.ts`)**:
  - `hasGuildManagementPermission`: `MANAGE_GUILD` (`32n`) 또는 `ADMINISTRATOR` (`8n`) 비트위즈 권한 및 소유자 검증.
  - `validateVanitySlug`: 영문 소문자/숫자/하이픈 3~32자, 예약어(admin/api/register/link 등) 차단.
  - `slugifyGuildName`: 길드명으로 기본 valid vanity slug 생성.
- [x] **유즈케이스 (`discordGuildUseCases.ts`)**:
  - `DiscordGuildRegistrationUseCases`: OAuth 1회용 토큰 챌린지 검증, 관리자 검증, 중복/예약 slug 거부, 등록/재활성화.
  - `DiscordGuildDirectoryUseCases`: 바운디드 디렉토리 검색, PUBLIC/UNLISTED 공개 조회, PRIVATE 접근 제어.
  - `DiscordGuildManagementUseCases`: 관리자 권한 확인, 메타데이터/가시성/slug 수정, 등록 해제.
- [x] **계약 & API 라우트 (`discordGuild.ts` & `discordGuilds.ts`)**:
  - Zod DTO 계약 명세 (`DiscordGuildDtoSchema`, `RegisterGuildRequestSchema`, `UpdateGuildRequestSchema`, `ServerSearchQuerySchema`).
  - Hono API 라우트: `GET /api/discord/guilds/candidates`, `POST /api/discord/guilds/register`, `GET /api/discord/guilds/search`, `GET /api/discord/guilds/my`, `GET /api/discord/guilds/by-slug/:slug`, `PATCH /api/discord/guilds/by-slug/:slug`, `POST /api/discord/guilds/by-slug/:slug/unregister`.
  - OAuth 라우트 `GET /api/auth/discord/register-server`: 단일 redirect_uri 사용, `discord_register_server_state` 쿠키로 콜백 분기.
- [x] **웹 커뮤니티 UI**:
  - `/discord`: Hub 페이지 (관리 서버, 계정 연결 상태)
  - `/discord/servers`: 공개 디렉토리 검색 & 서버 등록 위저드
  - `/discord/servers/:slug`: 공개 서버 페이지 (Phase H 정갈한 자리표시자 포함)
  - `/discord/servers/:slug/manage`: 서버 관리 페이지 (설명/slug/가시성 변경, 등록 해제)
- [x] **테스트 전원 통과**: `discordGuildPolicy.test.ts`, `discordGuildUseCases.test.ts`, `D1DiscordGuildRepository.test.ts`, `discordGuilds.test.ts` 신규 추가.

---

## 남은 작업

`docs/ROADMAP.md` §1 단계 순서대로 진행:

- **Phase H: Discord Guild-local XP & Server Ranking Foundation** — `/gamemoa play`(길드-바인딩 플레이 컨텍스트), 길드-로컬 사용자 XP, 주간 XP, 전역 서버 랭킹, 다중 길드 중복 방지. 완료 후 `/gamemoa rank|leaderboard|play|server` 슬래시 커맨드 연결.
- **Phase D~E: Creator 모델** — YouTube/CHZZK/SOOP/Twitch 채널 소유권 인증, Featured Creator 심사 엔진.
- **Phase I**: 계정 통합 회귀 테스트 확장, 최종 문서화 및 프로덕션 배포 검증.

---

## 다음 작업 (Next Action)

`Phase H — Discord Guild-local XP & Server Ranking Foundation`

---

## 마지막 검증 상태 (Last Verified State)

- **Local Quality Gate (`pnpm verify`)**: PASS (format/arch/registry/lint/typecheck/test/build - 11/11 tasks 100% SUCCESS)
- **Local Unit & Integration Tests**: core 88 / db 20 / api 61 / web 15 — 전원 PASS
- **D1 마이그레이션**: 0007 적용 성공 (로컬 SQLite)
