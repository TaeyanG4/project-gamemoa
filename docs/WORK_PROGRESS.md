# GAMEMOA 작업 진행 현황 (WORK_PROGRESS)

# 현재 목표

**GAMEMOA 플레이어 플랫폼 확장 스프린트 (My Page / Creator Ranking / Discord Community)** — 지금까지
**Phase B(진행도 파운데이션)**, **Phase C(My Page)**, **Phase F(Discord HTTP Interactions 파운데이션)**,
**Phase G(Discord 서버 시스템 & 커뮤니티 Hub)**, **Phase H1(Discord 길드 XP 귀속 파운데이션 & `/gamemoa play`)**,
**Phase H2(Discord 서버 리더보드 & 커맨드)**를 완수했습니다.
전체 스프린트 단계 구조는 `docs/ROADMAP.md` §1, 상세 설계는 `docs/PROGRESSION.md`(진행도),
`docs/DISCORD_INTEGRATION.md`(Discord)를 참고하세요.

---

## 완료

### Phase H2: Discord Server Leaderboards & Commands (이번 세션)

- [x] **D1 마이그레이션 `0009_discord_guild_xp_weekly_idx.sql`**:
  - `idx_discord_guild_xp_guild_created` 인덱스 추가 (`(guild_id, created_at)`)
- [x] **KST 주간 경계 도메인 헬퍼 (`getStartOfWeekKst`)**:
  - Asia/Seoul 기준 월요일 00:00:00 KST = UTC 일요일 15:00:00 ISO 문자열 계산 (월/연도 경계 안전 처리)
- [x] **리포지토리 쿼리 & 유즈케이스 구현**:
  - `getGuildXpLeaderboard`: 길드 내 사용자별 누적/주간 기여 XP 랭킹 (XP DESC, user_id ASC 결정론적 정렬)
  - `getGuildSummary`: 길드 총 활동 XP, 주간 활동 XP, GAMEMOA 참여 유저 수
  - `getGlobalGuildActivityRanking`: PUBLIC + ACTIVE 서버 대상 전역 활동 XP 랭킹 (PRIVATE/UNLISTED 노출 엄격 격리)
  - `getGuildGameLeaderboard`: canonical GAMEMOA `scores` 테이블 재활용하여 서버 참가자 스코어 랭킹 조회 (방향성 적용)
  - `getGuildUserXpRank`: 길드 내 특정 연동 유저의 XP 및 순위 반환
- [x] **Discord 슬래시 커맨드 연결 (`commands.ts` & `interactionHandlers.ts`)**:
  - `/gamemoa rank`: 서버 내 나의 기여 XP & 랭크 확인 (미연동/미등록 서버 거부)
  - `/gamemoa leaderboard`: 서버 내 Top 10 XP 랭킹 & 웹 서버 페이지 링크
  - `/gamemoa server`: 서버 정보 요약 (총 XP, 주간 XP, 참여자 수, 웹 URL)
- [x] **웹 커뮤니티 UI 확장**:
  - `/discord/servers/:slug`: 탭 `[⚡ 서버 XP]` `[📅 주간 XP]` `[🎮 게임별 기록]` 및 지표 카드로 교체
  - `/discord`: "이번 주 서버 활동 랭킹" (PUBLIC 서버 전용) 사이드바 위젯 추가
- [x] **단위/통합 테스트 완벽 통과**: `discordGuildXpUseCases.test.ts` 및 `discordGuilds.test.ts` (100% 그린)

### Phase H1: Discord 길드 XP 귀속 파운데이션 & `/gamemoa play` (이전 세션)

- [x] **D1 마이그레이션 `0008_discord_guild_xp.sql`**
- [x] **3개 XP 개념의 엄격한 분리** (Global GAMEMOA XP vs Guild-local User XP vs Guild Activity XP)
- [x] **`/gamemoa play [game]` 슬래시 커맨드**
- [x] **Referer 토큰 누출 방지 & SPA 연동**
- [x] **1:1 원자적 귀속 & 일일 상한 연동**

---

## 남은 작업

`docs/ROADMAP.md` §1 단계 순서대로 진행:

- **Phase D~E: Creator 모델** — YouTube/CHZZK/SOOP/Twitch 채널 소유권 인증, Featured Creator 심사 엔진, Creator Ranking UI.
- **Phase I**: 계정 통합 회귀 테스트 확장, 최종 문서화 및 프로덕션 배포 검증.

---

## 다음 작업 (Next Action)

`Phase D — XP Ranking UI & Creator Model Foundation`

---
