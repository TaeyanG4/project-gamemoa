# GAMEMOA 작업 진행 현황 (WORK_PROGRESS)

# 현재 목표

**GAMEMOA 플레이어 플랫폼 확장 스프린트 (My Page / Creator Ranking / Discord Community)** — 지금까지
**Phase B(진행도 파운데이션)**, **Phase C(My Page)**, **Phase F(Discord HTTP Interactions 파운데이션)**,
**Phase G(Discord 서버 시스템 & 커뮤니티 Hub)**, **Phase H1(Discord 길드 XP 귀속 파운데이션 & `/gamemoa play`)**을 완수했습니다.
전체 스프린트 단계 구조는 `docs/ROADMAP.md` §1, 상세 설계는 `docs/PROGRESSION.md`(진행도),
`docs/DISCORD_INTEGRATION.md`(Discord)를 참고하세요.

---

## 완료

### Phase H1: Discord 길드 XP 귀속 파운데이션 & `/gamemoa play` (이번 세션)

- [x] **D1 마이그레이션 `0008_discord_guild_xp.sql`**:
  - `discord_play_contexts` (`token_hash` PK, `guild_id`, `discord_user_id`, `user_id`, `game_id`, timestamps, `consumed_at`)
  - `discord_guild_xp_events` (`id` PK, `guild_id`, `user_id`, `source_xp_event_id` UNIQUE, `amount`, `created_at`)
- [x] **3개 XP 개념의 엄격한 분리**:
  - Global GAMEMOA XP vs Discord Guild-local User XP vs Discord Guild Activity XP
  - 25,000 global XP를 가진 유저가 새로운 길드 가입 시 Guild XP = 0에서 시작
- [x] **`/gamemoa play [game]` 슬래시 커맨드**:
  - 매니페스트 기반 게임 선택 옵션 지원
  - 등록 및 ACTIVE 상태인 서버만 링크 생성 (미등록/비활성화 시 가이드 메시지 반환)
  - 연동된 GAMEMOA 유저만 플레이 링크 생성 (미연동 시 `/gamemoa link` 가이드)
- [x] **Referer 토큰 누출 방지 & SPA 연동**:
  - 웹 `#play_token=...` URL Fragment 전달 및 SPA 로드 즉시 메모리 추출 후 `window.history.replaceState`로 URL 제거
- [x] **1:1 원자적 귀속 & 일일 상한 연동**:
  - `UNIQUE(source_xp_event_id)` DB 제약조건으로 1개 글로벌 `xp_events` 행당 최대 1개 길드 XP 이벤트만 생성
  - 점수 제출 시 실제 부여된 글로벌 XP(+10 또는 상한 시 0)와 100% 동기화
  - 게임 점수 자체는 절대 수정되지 않음
- [x] **테스트 전원 통과**: `discordGuildXpUseCases.test.ts` (13개 핵심 인베리언트/시나리오 테스트 포함 100/100 core 테스트 전원 통과)

### Phase G: Discord 서버 시스템 & 커뮤니티 Hub (이전 세션)

- [x] **D1 마이그레이션 `0007_discord_guilds.sql`**
- [x] **순수 도메인 정책 (`discordGuildPolicy.ts`)**
- [x] **유즈케이스 (`discordGuildUseCases.ts`)**
- [x] **계약 & API 라우트 (`discordGuild.ts` & `discordGuilds.ts`)**
- [x] **웹 커뮤니티 UI (`/discord`, `/discord/servers`, `/discord/servers/:slug`, `/discord/servers/:slug/manage`)**

---

## 남은 작업

`docs/ROADMAP.md` §1 단계 순서대로 진행:

- **Phase H2: Discord Server Leaderboards & Commands** — `/gamemoa rank`, `/gamemoa leaderboard`, `/gamemoa server` 슬래시 커맨드 연결 및 Discord 서버별 랭킹 UI (길드 내 개인 랭킹 / 주간 랭킹 / 전역 서버 활동 랭킹).
- **Phase D~E: Creator 모델** — YouTube/CHZZK/SOOP/Twitch 채널 소유권 인증, Featured Creator 심사 엔진.
- **Phase I**: 계정 통합 회귀 테스트 확장, 최종 문서화 및 프로덕션 배포 검증.

---

## 다음 작업 (Next Action)

`Phase H2 — Discord Server Leaderboards & Commands (rank / leaderboard / server, guild-local/weekly/global server ranking UI)`

---

## 마지막 검증 상태 (Last Verified State)

- **Local Quality Gate (`pnpm verify`)**: PASS (format/arch/registry/lint/typecheck/test/build - 11/11 tasks 100% SUCCESS)
- **Local Unit & Integration Tests**: core 100 / db 20 / api 61 / web 15 — 전원 PASS
- **D1 마이그레이션**: 0008 적용 성공 (로컬 SQLite)
