# GAMEMOA 경험치 / 레벨 / 도전과제 (PROGRESSION)

이 문서는 GAMEMOA 플랫폼 확장 스프린트("Player Platform / My Page / Creator Ranking / Discord Community")의
**Phase B: 진행도(Progression) 파운데이션**을 설명합니다. My Page UI, Creator, Discord 연동은 이 파운데이션 위에서
후속 세션이 구축합니다.

---

## 1. 핵심 원칙 — XP ≠ 실력

GAMEMOA에는 서로 다른 두 가지 개념이 존재하며, 이 둘은 **절대 섞이지 않습니다**.

| 개념           | 의미                                  | 저장 위치                          |
| -------------- | ------------------------------------- | ---------------------------------- |
| **게임 점수**  | 경쟁적 실력/기록 (랭킹의 유일한 근거) | `scores` (기존)                    |
| **GAMEMOA XP** | 플랫폼 활동/진행도 (레벨의 근거)      | `xp_events`, `user_progress`(신규) |

- XP는 게임 점수를 절대 변경하지 않습니다.
- Creator/Discord 상태는 게임 점수에 어떠한 영향도 주지 않습니다 (향후 단계 포함, 영구 원칙).
- XP 랭킹("누가 GAMEMOA를 활발히 이용하는가")과 게임 랭킹("누가 잘하는가")은 완전히 분리된 리더보드입니다.

---

## 2. XP 지급 정책 (서버 권위)

- XP는 **서버에서만** 계산·지급됩니다. 브라우저는 XP 값을 절대 직접 제출할 수 없습니다.
- 지급 트리거: 인증된 사용자의 **정상 승인된 게임 완료**(`POST /api/scores` 성공) 1회당 **+10 XP**.
- 게스트: 영구 XP 없음 (`/api/scores`는 세션 인증이 필수이므로, 이 엔드포인트에 도달하는 요청은 항상 인증된 사용자입니다).
- 거부/유효하지 않은 시도: XP 없음 (점수 검증 실패 시 XP 로직 자체가 실행되지 않음).

정책 상수는 `packages/core/src/domain/progression.ts`에 중앙화되어 있으며, 다른 레이어에서 하드코딩하지 않습니다.

```ts
export const XP_PER_ACCEPTED_COMPLETION = 10;
export const XP_DAILY_CAP_COMPLETIONS_PER_GAME = 10;
```

---

## 3. 어뷰징 방지 (v1)

- 사용자 1명 × 게임 1종 × UTC 하루 기준 **최대 10회**의 완료만 XP 지급 대상입니다 (게임당 하루 최대 100 XP).
- 상한 도달 후에도 게임 플레이 자체는 계속 가능하며, 다만 그날 그 게임에 대한 추가 XP만 지급되지 않습니다.
- 게임별로 상한이 독립적으로 적용되므로, 여러 게임을 플레이하는 사용자의 진행은 자연스럽게 유지됩니다.
- "완료 횟수(eligible_completions)" 자체는 상한과 무관하게 계속 누적됩니다 — 이는 도전과제(PLAY_10/PLAY_100) 진행에
  사용되며, XP 파밍 방지와 별개의 지표입니다.

---

## 4. XP 원장(Ledger)과 멱등성(Idempotency)

`xp_events` 테이블이 감사 가능한 단일 진실 공급원입니다.

```sql
CREATE TABLE xp_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,       -- 상한 도달 시 0 (완료는 기록하되 XP는 지급하지 않음)
  reason TEXT NOT NULL,          -- 'GAME_COMPLETION'
  source_type TEXT NOT NULL,     -- 'score'
  source_id TEXT NOT NULL,       -- scores.id
  game_id TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(source_type, source_id)
);
```

- **하나의 소스 이벤트(예: 저장된 `scores` 행 1개) → 최대 1개의 `xp_events` 행.** 동일 소스로 재시도/리플레이해도
  절대 중복 지급되지 않습니다.
- 상한 초과 시에도 행은 생성되지만 `amount = 0`으로 저장되어, "완료했지만 XP는 못 받음" 상태가 그대로 감사 가능합니다.
- `user_progress`(집계 테이블)는 항상 `xp_events`에서 파생되며, 그 자체가 진실 공급원이 아닙니다.
- D1 저장소 구현(`D1ProgressionRepository`)은 소스 중복 여부를 사전 조회로 우선 확인하고, 이후
  `INSERT ... ON CONFLICT(source_type, source_id) DO NOTHING` + `meta.changes` 확인으로 경쟁 상태(race condition)에
  대한 추가 방어선을 둡니다.

---

## 5. 레벨 공식 (결정론적, 순수 함수)

레벨은 `packages/core/src/domain/progression.ts`의 순수 함수 하나로만 계산되며, 다른 어떤 레이어에서도 레벨을
수동으로 증가시키지 않습니다.

```
누적 필요 XP(레벨 L) = 100 × (L − 1)²
```

| 레벨 | 누적 필요 XP |
| ---- | ------------ |
| 1    | 0            |
| 2    | 100          |
| 3    | 400          |
| 4    | 900          |
| 5    | 1,600        |

경계값(정확히 임계값에 도달한 경우 등)은 부동소수점 오차 없이 정수 비교로 보정됩니다 (`levelForTotalXp`).
API는 다음 파생 필드를 함께 노출합니다: `level`, `totalXp`, `currentLevelStartXp`, `nextLevelXp`,
`currentLevelProgressXp`, `currentLevelSpanXp`, `progressPercent`.

---

## 6. 글로벌 XP 랭킹

- `GET /api/progression/leaderboard` — "누가 GAMEMOA를 활발히 이용하는가"에 대한 공개 리더보드.
- `GET /api/progression/me` — 인증된 사용자 본인의 레벨/XP/전역 순위 요약.
- 국가별/Creator별/기간별 필터는 이번 스프린트 범위 밖이며, 스키마상 자연스럽게 확장 가능하도록 설계되었습니다
  (시즌 시스템 등 복잡한 구조는 이번 단계에서 도입하지 않음).

---

## 7. 도전과제(Achievements)

`user_achievements` 테이블에 `UNIQUE(user_id, achievement_code)` 제약으로 멱등성을 보장합니다. 도전과제는
**XP를 지급하지 않습니다** (진행도 피드백 루프 방지).

| 코드             | 조건                                      |
| ---------------- | ----------------------------------------- |
| `FIRST_PLAY`     | 유효 완료 1회 이상                        |
| `PLAY_10`        | 유효 완료 10회 이상                       |
| `PLAY_100`       | 유효 완료 100회 이상                      |
| `FIRST_FAVORITE` | 즐겨찾기 1개 이상 보유                    |
| `LEVEL_5`        | 레벨 5 도달                               |
| `LEVEL_10`       | 레벨 10 도달                              |
| `ALL_GAMES`      | 현재 게시된(published) 모든 게임 1회 이상 |

`AchievementUseCases.evaluateAndUnlock`은 게임 완료 및 즐겨찾기 추가 시점에 호출되어, 새로 달성한 항목만
잠금 해제합니다 (이미 해제된 항목은 재조회 없이 건너뜁니다).

---

## 8. 닉네임 / 국가·지역 정책 (센터화)

`packages/core/src/domain/profilePolicy.ts`에 중앙화되어 있습니다.

- **닉네임**: GAMEMOA 자체 정체성이며 Google/Discord 표시 이름과 독립적입니다. 공백 트리밍, 빈 값/제어 문자 거부,
  Unicode 코드포인트 기준 2~20자, **변경 후 7일 쿨다운**(최초 변경은 쿨다운 없음).
- **국가/지역**: "국적 인증"이 아닌 자기 신고 메타데이터이며, ISO 3166-1 alpha-2 코드로 저장됩니다(`KR`, `JP`, `US` 등).
  `null`은 "설정 안 함"을 의미하며 IP로 추론하지 않습니다. **변경 후 30일 쿨다운**.
- 두 쿨다운 모두 이 파일의 상수(`NICKNAME_COOLDOWN_DAYS`, `COUNTRY_COOLDOWN_DAYS`)로만 정의되며 다른 곳에 중복
  하드코딩하지 않습니다.

API: `POST /api/profile/nickname`, `POST /api/profile/country` (둘 다 인증 필요).

---

## 9. API 엔드포인트 요약

| 메서드/경로                         | 인증   | 설명                                               |
| ----------------------------------- | ------ | -------------------------------------------------- |
| `GET /api/progression/me`           | 필요   | 본인 레벨/XP/전역 순위 요약                        |
| `GET /api/progression/leaderboard`  | 불필요 | 글로벌 XP 리더보드 (공개)                          |
| `GET /api/progression/achievements` | 필요   | 본인 도전과제 요약                                 |
| `POST /api/profile/nickname`        | 필요   | 닉네임 변경 (쿨다운 적용)                          |
| `POST /api/profile/country`         | 필요   | 국가/지역 변경 (쿨다운 적용)                       |
| `POST /api/scores` (기존 확장)      | 필요   | 점수 제출 성공 시 XP/도전과제 부수효과 응답에 포함 |

---

## 10. 계정 통합(Primary Account Wins)과의 상호작용

Secondary 계정의 `xp_events`, `user_progress`, `user_achievements`는 병합 시 **Primary로 합산되지 않고 삭제**됩니다
(`D1AccountMergeRepository.mergeAccounts`). 이는 기존 scores/favorites/recent_plays 삭제와 동일한 원칙이며,
고스트(ghost) 진행도 데이터가 남지 않도록 보장합니다.

---

## 11. 다음 단계 (이번 세션 범위 밖)

- My Page(`/me`) UI에서 이 API들을 소비하는 대시보드 구성.
- Creator XP 랭킹, Discord 길드-로컬 XP는 이 원장(ledger) 패턴을 그대로 재사용할 예정입니다
  (Discord는 `source_type`이 다른 별도 원장을 두어 길드 귀속을 분리 — 아직 미구현).
