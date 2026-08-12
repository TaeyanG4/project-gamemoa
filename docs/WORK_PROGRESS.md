# GAMEMOA 작업 진행 현황 (WORK_PROGRESS)

# 현재 목표

**GAMEMOA 플레이어 플랫폼 확장 스프린트 (My Page / Creator Ranking / Discord Community)** —
이번 세션은 스프린트 전체 중 **Phase B: 진행도(XP/레벨/도전과제) 파운데이션**만 범위로 완료했습니다.
My Page UI, Account Center, Creator, Discord는 이 파운데이션 위에 후속 세션에서 구축합니다.
전체 스프린트 단계 구조는 `docs/ROADMAP.md` §1, 진행도 설계 상세는 `docs/PROGRESSION.md`를 참고하세요.

## 시작 상태

- **시작 커밋 (Starting SHA)**: `dbcb4591bfdb6aac3b6150b398509f6992f29a5c` (origin/main, 세션 시작 시점)
- **Local Quality Gate (`pnpm verify`)**: PASS (13 패키지, 세션 시작 시점 기준)
- **Production Status (세션 시작 시점)**: API `https://gamemoa-api.gamemoa.workers.dev/api/health` (`200 OK`), Web `https://gamemoa-web.gamemoa.workers.dev/` (`200 OK`)

---

## 완료

- [x] **D1 마이그레이션 `0005_progression.sql`**: `xp_events`(원장, `UNIQUE(source_type, source_id)`), `user_progress`(집계, `UNIQUE user_id`), `user_achievements`(`UNIQUE(user_id, achievement_code)`), `users.country`/`nickname_updated_at`/`country_updated_at` 컬럼 추가. 로컬 적용 검증 완료(신규 스키마 + 기존 0000~0004 위에 additive 적용).
- [x] **순수 도메인 계층**: `packages/core/src/domain/progression.ts`(레벨 공식 `100×(L-1)²`, XP 정책 상수), `achievements.ts`(7종 코드/정의), `profilePolicy.ts`(닉네임/국가 검증 + 쿨다운 — 7일/30일).
- [x] **애플리케이션 유즈케이스**: `ProgressionUseCases`(멱등 XP 지급, 일일 상한, 리더보드/순위), `AchievementUseCases`(평가/잠금해제/요약), `ProfileUseCases`(닉네임/국가 변경).
- [x] **포트 확장**: `ProgressionRepository`, `AchievementRepository`, `UserRepository.updateNickname/updateCountry`.
- [x] **D1 저장소**: `D1ProgressionRepository`(사전 조회 + `ON CONFLICT DO NOTHING` + `meta.changes` 이중 방어 멱등성), `D1AchievementRepository`, `D1UserRepository` 확장. `D1AccountMergeRepository.mergeAccounts`에 Secondary `xp_events`/`user_progress`/`user_achievements` 삭제 추가(고스트 진행도 방지).
- [x] **API Contracts (`@gamemoa/contracts`)**: `progression.ts`, `profile.ts` 신규, `scores.ts`에 `xpAwarded`/`newlyUnlockedAchievements` 옵셔널 필드 추가.
- [x] **API 라우트**: `GET /api/progression/me`, `GET /api/progression/leaderboard`(공개), `GET /api/progression/achievements`, `POST /api/profile/nickname`, `POST /api/profile/country`. `POST /api/scores` 성공 시 XP 지급 + 도전과제 평가 부수효과(점수 자체는 불변). `POST /api/personalization/favorites/:gameId` 성공 시 도전과제 재평가(FIRST_FAVORITE).
- [x] **테스트**: core 68 / db 22 / api 34 (신규 progression/achievement/profile 관련 테스트 다수 포함) — 전원 PASS. 경계값(레벨 임계값, XP 상한, 멱등성 리플레이, 쿨다운 경계), 계정 통합 고스트 XP 방지 회귀 테스트 포함.
- [x] **문서**: `docs/PROGRESSION.md` 신규 작성(Korean), `docs/ARCHITECTURE.md`/`docs/ROADMAP.md`/`docs/PROGRESS.md`/`README.md` 갱신.
- [x] **품질 게이트**: `pnpm verify` (frozen install/format/architecture/registry/lint/typecheck/test/build) 전원 PASS.

---

## 진행 중

- 없음 (이번 세션 범위인 Phase B는 구현/검증 완료).

---

## 남은 작업

이번 세션 범위 밖 — 후속 세션에서 `docs/ROADMAP.md` §1 단계 순서대로 진행:

- **Phase C**: My Page(`/me`) 대시보드, Account Center(`/account`), Public Profile(`/profile/:id`) UI. 이번 세션에서 만든 `/api/progression/*`, `/api/profile/*`를 소비.
- **Phase D~E**: Creator 모델(YouTube/CHZZK/SOOP/Twitch 채널 소유권 인증), Featured Creator 심사 엔진(6시간 자동 재심사 Cron), Creator 랭킹.
- **Phase F~H**: Discord HTTP Interactions(서명 검증), 계정 연결, 서버 등록/검색/관리, 길드-로컬 XP(이번 세션의 XP 원장 패턴을 재사용하되 `source_type`을 분리한 별도 귀속 테이블 필요).
- **Phase I**: 계정 통합 회귀 테스트 확장(Creator/Discord 식별자 포함), 최종 문서화, 프로덕션 검증.

---

## 블로커

- 없음. (Creator/Discord 외부 Provider 자격증명은 아직 필요하지 않음 — 해당 단계에서 `docs/ROADMAP.md`에 명시된 대로 "외부 설정 대기"로 별도 보고 예정.)

---

## 다음 작업 (Next Action)

**Phase C: My Page(`/me`) 대시보드 구현** — `GET /api/progression/me`(레벨/XP), `GET /api/progression/achievements`,
기존 `GET /api/scores/user/me`(개인 기록), `GET /api/personalization`(즐겨찾기/최근 플레이), `GET /api/auth/accounts`
(연결된 계정)를 하나의 번들형 대시보드 API(`GET /api/me/dashboard` 신설 고려) 또는 클라이언트 병렬 호출로 묶어
`/me` 라우트에 새 페이지를 구성. 기존 `/profile` 라우트와의 관계(리다이렉트/역할 분리: `/me`=대시보드,
`/account`=계정 관리, `/profile/:id`=공개 프로필)를 먼저 결정할 것 — 현재 `/profile`이 계정 관리 기능을 담당 중이므로
분리/redirect 전략을 세워야 함. 새 세션은 본 문서와 `docs/PROGRESSION.md`, `docs/ROADMAP.md`만으로 이어서 진행 가능.

---

## 마지막 검증 상태 (Last Verified State)

- **Local Quality Gate (`pnpm verify`)**: PASS (format/arch/registry/lint/typecheck/test/build)
- **Local Unit Tests**: core 68 / db 22 / api 34 — 전원 PASS
- **D1 마이그레이션 (로컬)**: 0005 적용 성공 (기존 0000~0004 위에 additive)
- **GitHub Actions CI / Cloudflare Deploy / 운영 Provenance**: 이 커밋 push 직후 검증 예정 — 아래 "PUSH 이후 최종 상태" 갱신본 확인 (동일 세션에서 push 후 즉시 갱신).
- **시작 SHA**: `dbcb4591bfdb6aac3b6150b398509f6992f29a5c`
