# OwOGG 신규 게임 라인업 및 기획 명세서 (GAME_LINEUP)

이 문서는 OwOGG 플랫폼에 순차적으로 추가될 신규 미니게임의 기획 의도, 게임 메커니즘, 스코어링 규칙 및 개발 우선순위를 체계적으로 관리하는 전용 명세서입니다.

> 🛠️ **게임 개발 및 등록 DX**: 신규 게임 개발 시 `pnpm generate:game <game-slug>` 명령어로 스캐폴딩을 자동 생성하며, `src/manifest.ts`에 `GameManifest` 계약을 정의하고 `pnpm generate:registry`를 통해 중앙 코드 수정 없이 자동 등록됩니다 ([`docs/ARCHITECTURE.md`](file:///h:/dev/project-owogg/docs/ARCHITECTURE.md) 및 [`docs/GAME_CREATION_GUIDE.md`](file:///h:/dev/project-owogg/docs/GAME_CREATION_GUIDE.md) 참고).

---

## 1. 🎯 현재 서비스 중인 기본 게임 (4종)

| 게임 ID / Slug  | 타이틀             | 카테고리          | 스코어 단위 / 방향            | 주요 특징                                                    |
| :-------------- | :----------------- | :---------------- | :---------------------------- | :----------------------------------------------------------- |
| `reaction-time` | 반응속도 테스트    | `reaction`        | `ms` (asc, 낮을수록 우수)     | 시각 자극에 대한 밀리초 단위 반응속도 측정, 티어 시스템 연동 |
| `memory-test`   | 순서 기억력 테스트 | `brain`           | `level` (desc, 높을수록 우수) | 3x3 그리드 타일의 점등 순서를 기억하고 순차 입력             |
| `aim-test`      | 에임 테스트        | `aim`, `reaction` | `ms` (asc, 낮을수록 우수)     | 30개 무작위 타겟 클릭 속도 (Normal 정적 / Hard 동적 이동)    |
| `typing-test`   | 타자 속도 테스트   | `typing`          | `wpm` (desc, 높을수록 우수)   | 단문/장문 타자 속도 및 정확도 측정 (한국어 / 영어 지원)      |

---

## 2. 🚀 신규 게임 라인업 및 개발 우선순위

### 2.1 [우선순위 High] 단기 출시 예정 라인업

#### 1) 색각 이상 / 색차 테스트 (`color-test`)

- **카테고리**: `brain`, `reaction`
- **게임 방식**: N×N 그리드(초기 2×2에서 시작하여 점차 3×3, 4×4 ... 최대 8×8까지 확장) 타일 중 미세하게 다른 색상의 타일 1개를 제한 시간(15초) 내에 클릭.
- **스코어 규칙**: 도달한 최고 레벨 (`level`, desc, 최소 1, 최대 100).
- **난이도 설계**: 레벨이 올라갈수록 그리드 크기 증가 및 HSL 색차($\Delta E$) 미세화.

#### 2) 숫자 암기 테스트 (`number-memory`)

- **카테고리**: `brain`
- **게임 방식**: 화면에 무작위 숫자가 일정 시간(자릿수 × 0.8초) 동안 노출된 후 사라지면, 키패드나 키보드로 해당 숫자를 그대로 입력.
- **스코어 규칙**: 성공한 최대 자릿수 (`digits`, desc, 최소 1, 최대 50).
- **난이도 설계**: 1자리부터 시작하여 매 라운드 1자리씩 증가. 오답 시 즉시 게임 종료.

#### 3) CPS (초당 클릭 수) 테스트 (`cps-test`)

- **카테고리**: `reaction`, `aim`
- **게임 방식**: 제한 시간(5초 기본, 10초 옵션) 동안 지정된 영역을 최대한 빠르게 연타 클릭.
- **스코어 규칙**: 초당 평균 클릭 수 (`cps`, desc, 소수점 1자리, 최소 0.0, 최대 50.0).
- **어뷰징 방지**: 브라우저 자동 클릭(오토마우스) 패턴 감지(동일 간격 ms 판별) 및 비정상 클릭수 필터링.

---

### 2.2 [우선순위 Medium] 중기 확장 라인업

#### 4) 시각 기억력 테스트 (`visual-memory`)

- **카테고리**: `brain`
- **게임 방식**: N×N 타일 그리드 중 무작위로 뒤집히는 흰색 타일들의 위치를 기억한 뒤, 원래대로 돌아오면 정확한 타일들만 다시 클릭.
- **스코어 규칙**: 도달한 최고 레벨 (`level`, desc). 3회 라이프 시스템.

#### 5) 단어 기억력 테스트 (`verbal-memory`)

- **카테고리**: `brain`
- **게임 방식**: 단어가 하나씩 제시될 때, 이전에 본 적 있는 단어(`SEEN`)인지 처음 보는 단어(`NEW`)인지 판별.
- **스코어 규칙**: 맞춘 단어 총 개수 (`words`, desc). 3회 오답 시 종료.

#### 6) 청각 반응속도 테스트 (`audio-reaction`)

- **카테고리**: `reaction`
- **게임 방식**: 무작위 지연 시간 후 특정 비프음(사운드)이 재생되는 순간 즉시 클릭.
- **스코어 규칙**: 반응 시간 (`ms`, asc).

---

## 3. 📝 신규 게임 기획 및 매니페스트 템플릿

새로운 게임 아이디어를 구체화할 때 아래 표준 규격에 맞추어 작성합니다:

```typescript
// games/<game-slug>/src/manifest.ts
export const manifest: GameManifest = {
  id: "game-slug",
  slug: "game-slug",
  title: "게임 타이틀",
  shortDescription: "게임 한 줄 요약",
  description: "게임 상세 설명",
  categories: ["reaction"], // reaction | brain | aim | typing
  difficulty: "normal",
  featured: false,
  scoreConfig: {
    unit: "score_unit", // ms | level | wpm | cps | digits ...
    direction: "desc", // asc: 낮을수록 우수, desc: 높을수록 우수
    min: 0,
    max: 100000,
    prefix: "",
    suffix: "",
  },
  touchFriendly: true,
  mobileFriendly: true,
  thumbnailGradient: "from-purple-500 to-indigo-600",
};
```
