# OwOGG 게임 제작 및 카탈로그 지침 (GAME_CREATION_GUIDE)

이 문서는 OwOGG 플랫폼의 미니게임 카탈로그 분류 체계, 매니페스트 메타데이터 계약, 그리고 유저
게임 제작·등록 시스템(아직 미착수)의 설계 초안을 정의합니다.

> **§4 이후는 초안(DRAFT)입니다.** 유저 게임 제작·등록 시스템 자체는 아직 구축되지 않았습니다
> (설계 단계 — `docs/WORK_PROGRESS.md` 백로그 참고). 시스템이 실제로 구축되면 이 문서도 함께
> 개정됩니다.

---

## 1. 🏷️ 장르 분류 체계 및 태그

카탈로그는 4대 핵심 역량 태그를 기반으로 구성됩니다:

| 장르 태그  | 영문 식별자 | 설명 및 대상 게임 예시               |
| :--------- | :---------- | :----------------------------------- |
| **순발력** | `reaction`  | 반응속도 테스트, 순발력 순차 클릭 등 |
| **두뇌**   | `brain`     | 순서 기억력 테스트, 숫자 암기 등     |
| **에임**   | `aim`       | 에임 타겟 슈팅, 정밀 타격 등         |
| **타자**   | `typing`    | 타자 속도 및 정확도 측정 등          |

- 게임 하나에 여러 장르를 붙일 수 있습니다(예: 에임 테스트는 `aim`+`reaction` 둘 다) — 단, 실제
  핵심 플레이 방식과 직접 관련 없는 태그는 붙이지 않습니다.
- **새 장르는 기존 4개로 설명이 안 되는 게임이 실제로 추가될 때만** 만듭니다. 장르 칩이 게임
  수만큼 잘게 쪼개지면 필터링 자체가 무의미해지기 때문입니다.
- `popular`(인기) 태그는 장르가 아니라 **큐레이션 상태**입니다. 현재는 4개 게임 전부에 `popular`
  태그가 붙어 있어 홈 화면 "인기 게임" 섹션이 사실상 전체 카탈로그와 같습니다 — 실제 플레이 수
  근거가 쌓이면 데이터 기반 자동 선정으로 전환을 검토합니다(운영자 결정 필요).

---

## 2. 📋 GameManifest 메타데이터 계약

모든 미니게임(`games/<slug>/src/manifest.ts`)은 `@owogg/game-sdk`의 `GameManifest` 계약을 준수합니다:

```typescript
import type { GameManifest } from "@owogg/game-sdk";

export const manifest: GameManifest = {
  id: "reaction-time",
  slug: "reaction-time",
  title: "반응속도 테스트",
  shortDescription: "화면 색상이 바뀌는 즉시 최대한 빠르게 클릭하세요!",
  description: "시각 자극에 대한 반응 시간을 밀리초(ms) 단위로 정밀하게 측정합니다.",
  categories: ["reaction"],
  difficulty: "normal",
  featured: true,
  scoreConfig: {
    unit: "ms",
    direction: "asc", // asc: 낮을수록 우수, desc: 높을수록 우수
    min: 50,
    max: 5000,
    suffix: "ms",
  },
  touchFriendly: true,
  mobileFriendly: true,
  thumbnailGradient: "from-blue-500 to-indigo-600",
};
```

필드별 규칙:

- **`inputMethods`**: 게임이 실제로 반응하는 입력 수단(`mouse`/`keyboard`/`touch`)을 전부
  나열합니다 — 실제 핸들러를 확인하지 않고 추측으로 채우지 않습니다.
- **`difficulty`**: 난이도별로 별도 채점되는 여러 단계가 있을 때만 설정합니다(`undefined` = 단일
  난이도, 선택 UI 노출 안 함). 단계 `id`는 점수 제출/리더보드 파티션 키로 쓰이므로 한 번 출시된
  뒤에는 절대 이름을 바꾸지 않습니다. 인프라는 전체 구축되어 있고(`scores.difficulty` 컬럼,
  난이도별 리더보드 파티셔닝, `validateDifficulty`), 에임 테스트에 `normal`(44px)/`hard`(28px)로
  1차 적용되었습니다. 나머지 3개 게임은 아직 단일 난이도입니다.
- **`supportsReplay`**: 플레이 리플레이(녹화/재생) 지원 여부. 현재 4개 게임 모두 `false`이며,
  시드 기반 PRNG로 전환하기 전까지는 재현 가능한 리플레이를 만들 수 없습니다 — 타당성 조사는
  [`docs/archive/architecture-investigations-2026-08.md`](archive/architecture-investigations-2026-08.md) §2 참고.
- **`version`**: semver 정책이나 배포 프로세스에 묶여 있지 않은, 게임 제작자 재량의 디버깅용
  참고 값입니다.
- **`modes`**: `readonly GameMode[]`로 타입이 지정된 속성에 배열 리터럴을 대입하는 것이므로
  `as const`가 필요 없습니다.

새 게임을 스캐폴딩하는 `scripts/generate-game.ts` 템플릿도 이 규격을 따르도록 갱신되어 있습니다.

---

## 3. 🧩 향후 파라미터 변형 게임 확장 모델

- **1단계 (설정 기반 변형, 이 문서 §4~§8이 다루는 대상)**: 기존 검증된 4개 게임 엔진을 기반으로
  설정값(라운드 수, 목표 개수, 제한 시간, 텍스트 지문 등)만 변경하여 새 게임을 생성하는 안전한
  모델.
- **임의 코드 제출**: 가능은 하지만 대규모 투자가 필요합니다(브라우저 iframe 샌드박스 + 엄격한
  CSP + 격리 인프라, 사람이 코드를 직접 검토). 당장 착수 대상이 아닙니다.
- **실시간 멀티플레이어 게임**: 유저 제작 권한만으로는 불가능합니다 — 서버 권위 로직·치팅
  방지·WebSocket 인프라가 필요해 매번 운영자 백엔드 작업이 필요합니다. 별도 설계는
  [`docs/MULTIPLAYER_GAME_DESIGN.md`](MULTIPLAYER_GAME_DESIGN.md) 참고.
- **불가능**: 네이티브 바이너리, 파일 시스템 접근이 필요한 게임(브라우저 샌드박스의 한계).

> **왜 설정 기반 변형만 우선순위인가**: 게임 1개 = pnpm 워크스페이스 패키지 1개 구조는 운영자가
> 직접 만드는 수십 개 규모에는 맞지만, 유저가 대규모로 제출하는 카탈로그에는 구조적으로 맞지
> 않습니다(제출마다 새 모노레포 패키지 + 코드 리뷰 + CI 태스크 필요). 근거:
> [`docs/archive/architecture-investigations-2026-08.md`](archive/architecture-investigations-2026-08.md) §1.

---

## 4. 누가, 무엇을 만들 수 있나 (제작 권한 및 자격)

- **인증된 사용자만** 참여할 수 있습니다. 구체적인 인증/권한 부여 기준은 별도로 정합니다 — 로그인만
  되어 있다고 자동으로 자격이 생기지 않습니다.
- 참여 자격이 있어도 **모든 제출은 사람이 직접 검토**합니다. 자동 승인은 없습니다.
- 승인되기 전까지는 **제작자 본인에게만** "내 게임"으로 표시됩니다. 다른 사용자에게는 검색/
  카탈로그/공유 링크 어디에도 노출되지 않습니다. 심사 결과는 Creator 심사 시스템(수동 심사 큐,
  감사 로그)과 비슷한 방식으로 기록될 예정입니다.

**리소스 제한(잠정)**: 무료 사용자는 게임 등록 1개 + 용량 제한(수치 미확정). 유료 사용자(월 $5,
잠정)는 등록 가능 게임 수와 용량 한도가 늘어납니다. 정확한 가격/한도는 비즈니스 모델 확정 시
반영합니다.

**콘텐츠 정책(기본 원칙)**: 불법 콘텐츠·혐오/차별 표현·성인 콘텐츠 금지, 타인 IP 침해 에셋/텍스트
금지, 악성 코드·타 사용자 피해 로직 금지, OwOGG 전체 톤/브랜드와 크게 어긋나지 않을 것.

---

## 5. V1 기술 설계안 (2026-08-14 타당성 조사)

아직 코드 구현은 하지 않은 **설계 단계 결론**입니다. §3에서 이미 확정된 "설정 기반 변형만
가능(코드 실행 없음)" 제약 위에서, 실제로 어떤 테이블·워크플로우로 구축할지 구체화합니다.

**핵심 아이디어**: §2의 게임별 난이도 기능(`GameManifest.difficulty`,
`GameRuntimeContext.difficultyId`)이 정확히 이 시스템의 축소판입니다 — "운영자가 매니페스트에
미리 박아둔 몇 개의 난이도"를 "유저가 직접 채워 넣는 임의 개수의 파라미터 세트"로 일반화한
것뿐이며, 새 렌더링 인프라 없이 기존 4개 게임 컴포넌트가 `runtime`으로부터 읽는 파라미터 범위만
넓히면 됩니다.

**DB 스키마 초안**:

```sql
-- 유저가 제출한 게임 변형(승인 전까지 creator 본인에게만 노출)
CREATE TABLE user_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_user_id INTEGER NOT NULL REFERENCES users(id),
  base_engine_id TEXT NOT NULL,      -- 기존 4개 게임 패키지 id 중 하나
  slug TEXT NOT NULL UNIQUE,         -- 그대로 scores.game_id로 사용
  title TEXT NOT NULL,
  short_description TEXT,
  config_json TEXT NOT NULL,         -- 엔진별 파라미터 세트, 엔진별 스키마로 검증
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW', -- PENDING_REVIEW/APPROVED/REJECTED/DISABLED
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Creator 심사 시스템의 creator_review_audit_log와 동일한 append-only 패턴 재사용
CREATE TABLE user_game_review_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_game_id INTEGER NOT NULL REFERENCES user_games(id),
  reviewer_admin_id INTEGER,
  action TEXT NOT NULL,              -- APPROVED/REJECTED/DISABLED
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- progression의 user_progress처럼 비정규화된 카운터 — 매번 COUNT(*) 하지 않음
CREATE TABLE user_game_quota (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  tier TEXT NOT NULL DEFAULT 'FREE', -- FREE/PAID
  active_game_count INTEGER NOT NULL DEFAULT 0,
  max_games INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

`status` → `visibility` 매핑은 별도 컬럼 없이 파생시킵니다: `PENDING_REVIEW`/`REJECTED`는 creator
본인에게만, `APPROVED`만 전체 공개 — §4에서 정한 원칙 그대로입니다.

**엔진별 파라미터 표면(예시)**:

| 베이스 엔진     | 노출 가능한 파라미터 예시                                    |
| --------------- | ------------------------------------------------------------ |
| `aim-test`      | 타겟 크기, 타겟 개수, 라운드 시간, 타겟 색상/테마            |
| `reaction-time` | 최소/최대 대기시간, 클릭 영역 크기, 색상 테마                |
| `memory-test`   | 패턴 길이 증가 속도, 색상 팔레트/테마, 플래시 간격           |
| `typing-test`   | 커스텀 지문/단어 목록(§4 콘텐츠 정책 심사 대상), 라운드 시간 |

**점수/리더보드는 스키마 변경이 필요 없음**: `scores.game_id`는 이미 임의 문자열입니다 — 승인된
`user_games.slug`를 그대로 `game_id`로 쓰면 기존 리더보드 인프라가 코드 변경 없이 그대로
적용됩니다. 단, `GAME_MANIFEST_MAP`(빌드타임 정적 레지스트리)에는 없는 `game_id`이므로 점수 검증
(`validateScorePayload`)이 DB 조회 기반으로 바뀌어야 합니다 — 실제 구현 시 가장 손이 많이 가는
지점입니다.

**심사 워크플로우**: Creator 심사 시스템(`/admin/creators`, 수동 심사 큐 + 감사 로그)과 동일한
UI/API 패턴을 재사용합니다. `/admin/games`(게임 활성화/비활성화)도 유사한 참고 사례입니다.

**명시적 비목표(V1 범위 밖)**: 유저가 직접 짠 새 게임 로직(코드 실행), 실시간 멀티플레이어(별도
설계).

---

## 6. 다음 단계

현재 단계에서 확정된 것은 "사람이 직접 승인", "인증된 사용자만", "승인 전 비공개", "무료/유료
티어 구분", "V1은 설정 기반 변형만(§5)" 다섯 가지 원칙이며, 나머지 세부 사항(정확한 용량 수치,
심사 SLA, 콘텐츠 신고 절차 등)은 실제 착수 시점에 함께 확정합니다.
