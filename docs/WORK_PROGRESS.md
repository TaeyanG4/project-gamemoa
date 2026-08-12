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
- [x] **원격 검증**: `git push origin main` → GitHub Actions CI GREEN → Cloudflare Deploy GREEN(D1 프로덕션 마이그레이션 0005 적용 포함) → `pnpm smoke:prod` API/Web provenance 및 신규 엔드포인트 프로덕션 200/401 확인 완료.
- [x] **버그 수정: Discord 계정 연결 `잘못된 OAuth2 redirect_uri`**: LOGIN(`/api/auth/discord`)과 LINK(`/api/auth/link/discord`)가 서로 다른 `redirect_uri`를 Discord에 전송하던 문제(Discord Developer Portal에는 LOGIN용 하나만 등록되어 있어 LINK 시도가 즉시 거부됨) — 두 흐름 모두 동일한 등록된 `redirect_uri`를 사용하도록 통합(`getDiscordRedirectUri`), LOGIN/LINK 구분은 경로가 아닌 state 쿠키로 판별. Discord Developer Portal 설정 변경 불필요. 회귀 테스트 추가, 프로덕션에서 실제 redirect_uri 값 확인 완료.
- [x] **UI 정리: 푸터 SEO 필러 제거**: "인기 태그" 태그 클라우드 및 2단 설명 문단 제거, 로고 옆 한 줄 태그라인으로 축소.
- [x] **My Page 진행도 노출 (Phase C 1차 증분)**: 기존 `/profile` 페이지에 레벨/XP 진행 바(전체 XP 랭킹 포함) 및 도전과제 요약(달성 배지) 카드 추가 — `GET /api/progression/me`, `GET /api/progression/achievements` 소비.
- [x] **My Page "내 프로필" / "기록" 탭 분리 + 게임 기록 카드 UI 개선 (Phase C 2차 증분)**: `/profile`을 별도 라우트로 쪼개지 않고 탭(세그먼트 컨트롤)으로 분리 — "내 프로필"(사용자 카드, 레벨/XP, 연결된 로그인 계정) / "기록"(도전과제, 게임별 최고 기록). 게임별 최고 기록 카드는 실제 게임 썸네일 + accent 색상 배경(GameCard와 동일한 시각 언어), 전체 카드가 `/games/:slug`로 연결되는 클릭 가능한 링크, 계정 기록(트로피 아이콘, 굵은 강조)을 1차, 기기 기록을 보조 표시로 재구성, 기록 없는 게임은 "지금 도전해보세요" 안내로 개선. 섹션 헤더에 "N/M 도전" 완료 카운트 추가. Discord/Google 연결 리다이렉트는 "내 프로필" 탭으로 랜딩.
- [x] **버그 수정: `/api/auth/me` 세션 조회가 country/nickname_updated_at/country_updated_at 미반환**: `D1SessionRepository`가 마이그레이션 0005 컬럼을 도입하기 전 작성된 자체 SELECT를 그대로 쓰고 있어 세 필드가 전혀 조회되지 않았고, `AuthUserSchema`에도 선언되지 않아 설령 조회되어도 Zod 파싱 시 제거되는 문제 — 웹 전체가 이 필드에 접근할 수 없었음(닉네임/국가 변경 UI의 전제조건). SELECT 확장 + 스키마 필드 추가 + 회귀 테스트로 수정.
- [x] **닉네임/국가 변경 UI + 즐겨찾기·최근 플레이 카드 (Phase C 3차 증분, 이번 세션의 Next Action 완료)**: "내 프로필" 탭에 "프로필 설정" 카드 추가 — 닉네임 입력(`POST /api/profile/nickname`, `NICKNAME_COOLDOWN_ACTIVE` 시 다음 가능 날짜 안내) 및 국가/지역 셀렉트(`POST /api/profile/country`, "국적 인증"이 아님을 명시, 큐레이션된 ISO 3166-1 alpha-2 34개국 목록 — 백엔드는 전체 코드 허용, UI만 편의상 목록 제한). 즐겨찾기/최근 플레이 섹션은 기존 `usePersonalization()` 컨텍스트를 그대로 재사용(중복 fetch 없음). 세 카드(기록/즐겨찾기/최근 플레이) 공통 shell을 `GameLinkCard`로 리팩터링해 중복 제거.

---

## 진행 중

- 없음 (이번 세션 범위인 Phase B는 구현/검증 완료).

---

## 남은 작업

이번 세션 범위 밖 — 후속 세션에서 `docs/ROADMAP.md` §1 단계 순서대로 진행:

- **Phase C (잔여)**: 진행도 카드, "내 프로필"/"기록" 탭 분리, 게임 기록 카드 UI 개선, 닉네임/국가 변경 UI, 즐겨찾기/최근 플레이 카드까지 전부 완료(위 참고). 남은 것은 (1) 공개 프로필(`/profile/:id`) — 현재 `/profile`은 본인 전용이며 타인에게 공개되는 프로필 개념이 아직 없음, (2) 별도 `/me`·`/account` 완전 라우트 분리 — 현재 탭 방식으로 사용자 요구가 충족되는지 먼저 판단 후 필요 시에만 진행.
- **Phase D~E**: Creator 모델(YouTube/CHZZK/SOOP/Twitch 채널 소유권 인증), Featured Creator 심사 엔진(6시간 자동 재심사 Cron), Creator 랭킹.
- **Phase F~H**: Discord HTTP Interactions(서명 검증), 계정 연결, 서버 등록/검색/관리, 길드-로컬 XP(이번 세션의 XP 원장 패턴을 재사용하되 `source_type`을 분리한 별도 귀속 테이블 필요).
- **Phase I**: 계정 통합 회귀 테스트 확장(Creator/Discord 식별자 포함), 최종 문서화, 프로덕션 검증.

---

## 블로커

- 없음. (Creator/Discord 외부 Provider 자격증명은 아직 필요하지 않음 — 해당 단계에서 `docs/ROADMAP.md`에 명시된 대로 "외부 설정 대기"로 별도 보고 예정.)

---

## 다음 작업 (Next Action)

Phase C의 실질적인 항목은 모두 완료되었습니다. 다음 세션은 아래 중 하나를 사용자와 확인 후 선택해 진행하세요:

1. **My Page 수동 검증**: 실제 로그인 세션으로 `/profile`의 두 탭(내 프로필/기록)을 열어 닉네임·국가 변경(쿨다운
   에러 케이스 포함), 즐겨찾기/최근 플레이 카드, 게임 기록 카드가 실제 데이터로 의도대로 렌더링되는지 확인
   (이번 세션은 로컬 브라우저에 OAuth 자격 증명이 없어 인증된 화면을 직접 클릭 검증하지 못했고, 타입체크/린트/유닛
   테스트/프로덕션 빌드로만 검증했습니다).
2. **Phase D 착수**: Creator 모델(YouTube/CHZZK/SOOP/Twitch 채널 소유권 인증) 스키마/유즈케이스 설계.
3. **Phase F 착수**: Discord HTTP Interactions 서명 검증 + `/gamemoa link` 기초.

새 세션은 본 문서와 `docs/PROGRESSION.md`, `docs/ROADMAP.md`만으로 이어서 진행 가능.

---

## 마지막 검증 상태 (Last Verified State)

- **Local Quality Gate (`pnpm verify`)**: PASS (format/arch/registry/lint/typecheck/test/build)
- **Local Unit Tests**: core 68 / db 14 / api 36 / web 15 — 전원 PASS
- **D1 마이그레이션 (로컬 + 프로덕션)**: 0005 적용 성공 (기존 0000~0004 위에 additive)
- **최종 커밋 (Final SHA)**: `1b27d63adfd772be23dcdfd0c0414705f5211068` (origin/main과 100% 일치)
- **GitHub Actions CI**: GREEN (run `31644243377`)
- **Cloudflare Deploy**: GREEN (run `31644330936`) — D1 프로덕션 마이그레이션 적용, API/Web Worker 배포, Health/Provenance 체크 전원 통과.
- **운영 Provenance/Smoke (`pnpm smoke:prod`)**: API `/api/health` commit = Web `/version.json` commit = `1b27d63adfd772be23dcdfd0c0414705f5211068` (= origin/main). 홈/게임/랭킹/프로필/미니게임/파비콘 자산 HTTP 200. `POST /api/profile/nickname`·`POST /api/profile/country`(미인증) 401 프로덕션 확인.
- **수동 UI 검증 한계**: 이번 세션은 로컬 브라우저에서 실제 OAuth 로그인을 수행할 수 없어(자격 증명 없음), 닉네임/국가 변경 폼과 즐겨찾기/최근 플레이 카드는 authenticated 화면을 직접 클릭 검증하지 못했습니다 — 타입체크/린트/유닛 테스트/프로덕션 빌드 성공으로 검증을 대체했습니다. 다음 세션 또는 사용자가 실제 로그인 후 확인 권장.
- **알려진 이전 CI 이슈(해결됨)**: 이전 push(`774a7df`)는 신규 Korean 문서 3개의 Prettier 테이블 정렬 누락으로 Format Check 실패(run `31639575768`) → `pnpm format` 재실행 후 재푸시로 해결(참고용, 현재 최종 상태에는 영향 없음).
- **시작 SHA**: `dbcb4591bfdb6aac3b6150b398509f6992f29a5c`
