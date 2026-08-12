# GAMEMOA 작업 진행 현황 (WORK_PROGRESS)

# 현재 목표

**GAMEMOA 플레이어 플랫폼 확장 스프린트 (My Page / Creator Ranking / Discord Community)** — 지금까지
**Phase B(진행도 파운데이션)**, **Phase C(My Page)**, **Phase D(XP 랭킹 UI & Creator 모델 파운데이션)**,
**Phase F(Discord HTTP Interactions 파운데이션)**, **Phase G(Discord 서버 시스템 & 커뮤니티 Hub)**,
**Phase H1(Discord 길드 XP 귀속 파운데이션 & `/gamemoa play`)**, **Phase H2(Discord 서버 리더보드 & 커맨드)**를 완수했습니다.
전체 스프린트 단계 구조는 `docs/ROADMAP.md` §1, 상세 설계는 `docs/PROGRESSION.md`(진행도),
`docs/DISCORD_INTEGRATION.md`(Discord)를 참고하세요.

---

## 완료

### Phase D: XP Ranking UI & Creator Model Foundation (이번 세션)

- [x] **D1 마이그레이션 `0010_creator_foundation.sql`**:
  - `creator_profiles` (`user_id UNIQUE`, `status`, `featured_status`, `featured_reason`, `featured_since`, timestamps)
  - `creator_platform_accounts` (`creator_id`, `platform`, `platform_user_id`, `channel_name`, `channel_handle`, `channel_url`, `avatar_url`, `verification_status`, `verified_at`, `UNIQUE(platform, platform_user_id)`)
- [x] **계정 원칙 준수**:
  - Creator는 독자 계정이 아니라 GAMEMOA User의 선택적 1:1 확장에 불과함 (`user_id UNIQUE`).
- [x] **계층적 아키텍처 수호**:
  - `@gamemoa/db`는 `GAME_MANIFEST_MAP`에 디커플링되어 순수 원시 데이터 반환.
  - `@gamemoa/core`의 `CreatorUseCases`에서 게임 카탈로그 명세 기반 포맷팅 및 XP 레벨 공식 통합.
- [x] **랭킹 & 통합 정보 구조 (IA) 완성 (`/ranking`)**:
  - 최상위 모드 탭: `[🎮 게임 랭킹]`, `[⚡ 경험치 랭킹]`, `[🎥 스트리머 랭킹]`
  - 스트리머 랭킹 서브 필터: `[전체]`, `[YouTube]`, `[CHZZK]`, `[SOOP]`, `[Twitch]` 플랫폼 필터 & `[게임 점수]` / `[경험치]` 지표 토글
  - 검증된 크리에이터가 없는 초기 상태를 위한 정돈된 Empty State UI 제공.
- [x] **단위/통합 테스트**: `creatorUseCases.test.ts` & `creators.test.ts` (100% 그린)

### Phase H2: Discord Server Leaderboards & Commands (이전 세션)

- [x] **D1 마이그레이션 `0009_discord_guild_xp_weekly_idx.sql`**
- [x] **KST 주간 경계 도메인 헬퍼 (`getStartOfWeekKst`)**
- [x] **리포지토리 쿼리 & 유즈케이스 구현 (`getGuildXpLeaderboard`, `getGuildSummary`, `getGlobalGuildActivityRanking`, `getGuildGameLeaderboard`, `getGuildUserXpRank`)**
- [x] **Discord 슬래시 커맨드 연결 (`/gamemoa rank`, `/gamemoa leaderboard`, `/gamemoa server`)**
- [x] **웹 커뮤니티 UI 확장 (`/discord/servers/:slug`, `/discord` 위젯)**

### Phase H1: Discord 길드 XP 귀속 파운데이션 & `/gamemoa play` (이전 세션)

- [x] **D1 마이그레이션 `0008_discord_guild_xp.sql`**
- [x] **3개 XP 개념의 엄격한 분리**
- [x] **`/gamemoa play [game]` 슬래시 커맨드**

---

## 남은 작업

`docs/ROADMAP.md` §1 단계 순서대로 진행:

- **Phase E**: Creator 채널 소유권 인증 + Featured 심사 엔진 (6시간 자동 재심사)
- **Phase I**: 계정 통합 회귀 테스트 확장, 최종 문서화 및 프로덕션 배포 검증.

---

## 다음 작업 (Next Action)

`Phase E — Creator Ownership Verification & Featured Qualification Engine`
