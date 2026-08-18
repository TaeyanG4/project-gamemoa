# OwOGG 게임 제작 및 카탈로그 지침 (GAME_CREATION_GUIDE)

이 문서는 OwOGG 플랫폼의 미니게임 카탈로그 분류 체계, 내장 게임의 매니페스트 계약, 그리고
**외부 제작 게임 업로드 시스템**(샌드박스 번들 방식)의 설계를 정의합니다.

> **2026-08-15 방향 전환**: 이전 초안의 "기존 4개 엔진의 파라미터 변형만 허용(코드 실행 없음)"
> 모델은 **폐기**되었습니다. 슈터/퍼즐/캐주얼 등 장르 제약 없는 자유도가 요구사항으로 확정되어,
> 임의 코드를 샌드박스에서 실행하는 번들 업로드 방식으로 대체됩니다.
>
> **구현 현황 (2026-08-15)**: DB 스키마(§3.7), 관리자 임명/심사/공개 API, 설정 페이지 "개발" 탭
> (업로드), `/admin/game-creators`(임명), `/admin/sandbox-games`(심사+메타데이터+공개 전환)는
> **구현 완료**. 저장소 계정 프로비저닝·번들 서빙 Worker·별도 게임 호스팅 도메인(§3.8)은 **실제
> 계정 작업이 필요해 아직 미착수** — 그 전까지 업로드는 `503 GAME_BUNDLES_NOT_CONFIGURED`로
> 안전하게 거부됩니다. 제작자용 실사용 안내는
> [`docs/GAME_UPLOAD_GUIDE.md`](GAME_UPLOAD_GUIDE.md) 참고(Wiki 정식 등록은 보류 — 사유는 그
> 문서 상단 참고).
>
> **2026-08-16 저장소 변경: R2 → Backblaze B2**: 번들 저장소를 Cloudflare R2에서 Backblaze B2로
> 교체했습니다(§3.2) — 버킷을 실제로 프로비저닝하기 전 단계였으므로 마이그레이션이 아니라
> 어댑터 교체입니다. 사유는 **비용 사고 방지**: B2의 Caps(저장/다운로드/거래 한도)+Alerts+범위
> 제한된 Application Key가, 버그·공격·비정상 트래픽으로 인한 예상치 못한 대규모 종량제 비용
> 위험을 앱 자체 quota와 별개로 한 번 더 막아줍니다. `GameBundleStorageRepository` 포트로 이미
> 추상화돼 있었기 때문에 DB 스키마·리뷰/버전 워크플로우·API 계약은 전혀 바뀌지 않았습니다 —
> `sandbox_game_versions`의 저장 키 컬럼명만 provider-neutral하게 `object_key`로
> 정리했습니다(마이그레이션 0024가 아직 배포 전이라 안전하게 rename). Cloudflare는 그대로
> compute/CDN으로 계속 사용합니다 — B2는 오직 Game Creator 게임 파일 저장 용도입니다.
>
> **2026-08-18 용어/권한 모델 정리: `game_developers` → `game_creator_access`, 셀프서비스 신청
> 추가**: 이 섹션(§3) 전체가 서술하는 업로드/심사/호스팅 파이프라인, 20MiB/50MiB/300개 파일
> 제한, 제작자당 동시 심사 2개 슬롯, B2 저장 구조는 **전혀 바뀌지 않았습니다.** 바뀐 것은 이
> 기능을 쓸 수 있는 사람을 가리키는 이름과, 그 자격을 얻는 경로뿐입니다:
>
> - 업로드 권한 테이블 `game_developers`는 `game_creator_access`로 **이름만 변경**되었습니다(행
>   데이터는 전혀 이동하지 않는 순수 rename). 이 문서 §3.6/§3.7의 `game_developers`는 이제
>   `game_creator_access`를 가리킵니다.
> - 관리자 직접 임명 경로(§3.6)는 그대로지만 라우트가 `/admin/game-developers` →
>   `/admin/game-creators`로 이름을 바꿨습니다.
> - **신규**: 관리자 임명 없이도 유저가 직접 신청할 수 있는 셀프서비스 신청 절차
>   (`game_creator_applications`, `POST /api/dev/apply`)가 추가되었습니다 — 기존 임명 경로를
>   대체하는 게 아니라 병행되는 두 번째 입구입니다.
> - 이 프로그램의 정식 명칭은 이제 **GAME_CREATOR**이며, "게임 제작자"는 그대로 자연어
>   표기로 씁니다. Staff Role(ADMIN/OPERATOR/MODERATOR/SYSTEM_DEVELOPER — OwOGG 플랫폼을 만드는
>   내부 인력)과는 완전히 다른 축이라는 점, 신청/승인 흐름, 향후 OwO Plus 연동 지점은 전부
>   [`docs/AUTHORIZATION.md`](AUTHORIZATION.md) §5~§6에 정리되어 있습니다 — 이 문서(§3)는 업로드/
>   심사/호스팅의 **기술적** 설계에, `AUTHORIZATION.md`는 **누가 이 기능을 쓸 수 있는가**에
>   집중하도록 역할을 나눴습니다.

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

> ⚠️ **위 4개 태그는 "역량 측정" 성격의 내장 게임 기준입니다.** §3의 샌드박스 업로드 게임은
> 장르 제약이 없으므로(슈터/퍼즐/캐주얼/액션/아케이드…) 이 4개로 덮이지 않습니다. 업로드 게임이
> 실제로 들어오는 시점에 장르 택소노미를 확장해야 하며, 동시에 `ranking.tsx`의 "게임 칩을 한 줄에
> 전부 나열"하는 필터 UI도 장르별 분류 페이지로 대체해야 합니다(한계는
> [`docs/archive/architecture-investigations-2026-08.md`](archive/architecture-investigations-2026-08.md) §1에 기록).

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

## 3. 🧩 외부 제작 게임 업로드 시스템 — 확정 방향 (2026-08-15 운영자 결정)

### 3.1 왜 "파라미터 변형" 모델을 폐기했나

이전 초안(§5, 이제 삭제)은 기존 4개 게임 엔진의 설정값만 바꾸는 안전한 모델이었지만, **슈터/
퍼즐/캐주얼처럼 장르 제약 없는 자유도**가 요구사항으로 확정되면서 폐기되었습니다. 그 모델로는
"타겟 크기만 다른 에임테스트 변종"만 나올 뿐, 실제로 다른 게임은 나올 수 없습니다.

### 3.2 핵심 모델: 정적 웹 번들을 우리가 호스팅

**업로드 단위는 ZIP(정적 웹 번들)이고, Backblaze B2에 저장해 우리가 서빙합니다.** 근거:

- Unity WebGL / Godot HTML5 / Phaser / 순수 JS 등 **모든 웹 게임 엔진의 "내보내기" 결과물은
  공통적으로 `index.html` 진입점을 가진 정적 파일 묶음**입니다 — 새 포맷을 발명할 필요가 없고,
  제작자는 이미 쓰던 엔진의 "웹으로 내보내기"를 누르면 끝입니다("다른 환경에서 만들고 올리기
  쉽게"라는 목적에 직접 부합).
- **제작자가 자체 호스팅한 URL을 임베드하는 대안은 기각**되었습니다 — 승인 후 원본 서버의 파일만
  바꿔치기하면 심사가 무의미해지기 때문입니다(우리 DB엔 URL만 있으니 바꿔치기가 감지되지 않음).
  B2에 올린 번들은 불변이며, `content_hash`로 "승인한 바이트 = 서빙되는 바이트"를 보장합니다.
  **예외**: 관리자/서브관리자 본인이 만드는 게임은 URL 임베드도 허용할 수 있습니다 — 바꿔치기
  위험이 "신뢰하는 사람이 스스로를 속인다"는 뜻이 되어 무의미해지기 때문입니다.
- **저장소로 Backblaze B2를 선택한 핵심 이유는 비용 사고 방지입니다**(2026-08-16 결정, R2에서
  전환 — 이전에는 이 문서가 R2를 전제로 작성돼 있었지만 실제 버킷 프로비저닝 전이라 어댑터만
  교체하면 되는 상태였습니다). B2는 Application Key를 버킷 하나·prefix 단위로 좁게 발급할 수
  있고, Caps(저장/다운로드/거래 한도)와 Alerts를 계정에 걸 수 있어 — 버그·공격·비정상 트래픽으로
  인한 예상 밖의 대규모 종량제 비용이라는, 이 프로젝트가 가장 우려하는 실패 모드를 앱 자체
  quota/rate limit과는 별개의 두 번째 방어선으로 막아줍니다. 정확한 cap 종류·수치는 Backblaze
  공식 문서 기준으로 실제 계정 설정 시점에 정합니다(§3.8, §25).
- 저장 용량 자체는 무제한이 아니므로 번들 크기 상한을 둡니다. **베타 기준 업로드 20MiB / 압축 해제
  후 50MiB / 파일 300개**(`SANDBOX_GAME_POLICY`의 `MAX_BUNDLE_BYTES`/`MAX_EXTRACTED_BUNDLE_BYTES`/
  `MAX_BUNDLE_FILE_COUNT` — 이 세 숫자의 유일한 정의처. API 검증·문서·UI 문구가 전부 여기서
  읽어야 하며 각자 리터럴을 따로 두지 않습니다). 제작자별 총 쿼터는 베타 이후 도입 시점에 정합니다.
- 크롤러가 URL을 스냅샷 뜨는 하이브리드 방식은 기각 — WASM 게임은 런타임에 무엇을 로드할지
  정적으로 알 수 없어 에셋을 온전히 복사할 수 없습니다.

#### 3.2.1 배포 파이프라인 — 압축 해제는 **업로드 시 단 한 번** (2026-08-17)

초기 구현은 플레이 요청마다 B2에서 ZIP 전체를 받아 메모리에서 풀고 파일 하나를 꺼내 돌려줬습니다.
동작은 했지만 확장이 불가능한 구조였습니다 — 게임의 에셋 하나를 요청할 때마다 ZIP 전체 전송 +
전체 압축 해제가 발생하므로, 비용은 B2 다운로드 종량제에 그대로 비례하고 CDN은 아무것도 캐시할 수
없었습니다(요청 URL이 같아도 실제로 내려오는 건 매번 ZIP 전체).

현재 구조는 **업로드 시점에 한 번만 압축을 풀고, 파일별 개별 오브젝트로 저장**합니다:

```text
개발자 → ZIP 업로드
  → (메모리에서) 검증: ZIP 파싱 / 경로 / 개수 / 압축 해제 용량 / index.html 존재
  → 원본 ZIP 저장          uploads/<gameId>/<contentHash>.zip
  → 버전 row 생성           publish_status = UPLOADED
  → 파일별 개별 오브젝트 저장 games/<gameId>/<versionId>/...  + manifest
  → publish_status = READY

플레이 → Cloudflare CDN → games/<gameId>/<versionId>/<path>  (압축 해제 없음)
```

핵심 성질:

- **오브젝트 키에 slug를 쓰지 않습니다** — `gameId`/`versionId`(숫자 id)만 씁니다. slug는 사람이
  읽는 이름이고, 여기에 저장 경로를 묶으면 이름 변경이 데이터 마이그레이션이 됩니다.
- **버전별 경로는 완전히 분리·불변**입니다. 그래서 롤백이 오브젝트 재업로드 없이 D1 한 줄
  업데이트(`live_version_id`)로 끝나고, 에셋에 1년 `immutable` 캐시를 안전하게 걸 수 있습니다
  (새 빌드 = 새 versionId = 새 URL이므로 purge가 필요 없음).
- **부분 배포는 절대 서빙되지 않습니다.** 파일 50개 중 49개만 올라간 버전은 `READY`가 되지 않고,
  `READY`가 아닌 버전은 승인도 라이브 지정도 거부됩니다(§3.7 `publish_status`). manifest는 성공
  시에만 기록되므로 "이 버전은 이 파일들로 완전하다"는 주장을 부분 배포가 할 수 없습니다.
- 실패한 배포는 원본 ZIP이 남아 있으므로 **재업로드 없이 재배포**로 복구합니다.
- **압축 해제 전에 먼저 central directory 메타데이터만 읽어 크기·개수·경로를 검증합니다**
  (2026-08-17 베타 경화, zip bomb 대응). 처음 구현은 전체 압축 해제 후에야 총 용량을 검사해서,
  압축률이 극단적인 아카이브(예: 0으로 채운 파일)는 검사 시점엔 이미 Worker 메모리에 수백 MB가
  올라간 뒤였습니다. 지금은 `BundleArchiveReader.readMetadata()`가 각 항목의 압축 해제 없이
  central directory에 적힌 이름·선언된 크기만 읽고, `validateBundleEntryMetadata()`가 이 메타데이터
  단계에서 개수(300개)·선언 크기 합(50MiB)·경로를 먼저 거부합니다 — 실제 압축 해제(`read()`)는
  이 검사를 통과한 뒤에만 호출됩니다. 실제 51MiB 이상 zip을 태운 테스트로 1ms 내 거부를 확인했습니다.
- **"선언된 크기 자체가 거짓이면?" (2026-08-18 프로덕션 배포 전 재검토)** — fflate의 실제 구현을
  직접 읽어서 확인했습니다: `unzipSync`의 실제 압축 해제 단계는 각 항목의 출력 버퍼를 정확히
  central directory에 적힌 `declaredSize`만큼만 할당하고, 압축 스트림이 그보다 더 많은 바이트를
  만들려 해도 버퍼 범위를 벗어난 쓰기는 JS TypedArray 특성상 조용히 버려집니다(버퍼가 자동으로
  커지지 않음) — 즉 `readMetadata()`가 이미 합산·검증한 `declaredSize`가 곧 실제 메모리 사용량의
  상한이라, "선언 크기를 속여서 더 큰 메모리를 할당시키는" 공격은 구조적으로 불가능합니다. 다만
  압축 스트림 자체가 오래 걸리는 압축 해제 루프를 유발할 수는 있어(메모리는 안 늘어도 CPU 시간
  소모), `validateBundleEntryMetadata()`에 압축률 상한 체크(`declaredSize > compressedSize *
1200` — DEFLATE의 현실적 최대 팽창률 근사치보다 여유 있게 설정, 정상적으로 잘 압축되는 에셋은
  걸리지 않음)를 추가로 두었습니다.
- 런타임 ZIP 해제 경로는 삭제하지 않고, 개별 오브젝트가 없을 때만 동작하는 **폴백**으로
  남겨뒀습니다(응답 헤더 `X-Owogg-Bundle-Source: archive-fallback`로 구분 가능). 실제 Unity/Godot
  빌드 검증이 끝나면 제거 여부를 결정합니다(§25 운영자 항목).

#### 3.2.2 게임 연산은 사용자 브라우저에서 — 서버는 게임을 실행하지 않는다

OwOGG는 클라우드 게이밍 서비스가 아닙니다. 서버(Cloudflare Worker)가 하는 일은 **파일을 돌려주는
것**뿐이고, 렌더링·물리·AI·게임 루프는 전부 사용자 브라우저에서 사용자의 CPU/GPU/RAM으로
실행됩니다. 이건 성능 선택이 아니라 **비용 구조 선택**입니다 — 동시 접속자가 늘어도 늘어나는 건
캐시된 파일 요청 수뿐이고, 동시 플레이어 수에 비례해 서버 CPU/GPU 비용이 폭증하는 구조를 애초에
만들지 않습니다.

따라서 다음은 **명시적 비목표**입니다: 서버 측 게임 프레임 렌더링, 사용자별 게임 프로세스,
GPU 인스턴스, 게임 화면 비디오 스트리밍, 서버에서의 WASM 대행 실행.

### 3.3 호스트 SDK — 게임이 알아야 할 건 2개뿐

```html
<script src="https://games.owogg.com/sdk/v1.js"></script>
<script>
  OwOGG.ready(); // 로딩 완료 → 호스트가 로딩 스피너 제거
  OwOGG.submit(1250); // 게임 종료 + 최종 점수
</script>
```

내부는 `postMessage` 기반입니다. Unity는 `.jslib` 플러그인으로, Godot은
`JavaScriptBridge.eval`로 같은 함수를 호출하면 됩니다 — 제작자가 배워야 할 규격은 이 두 호출이
전부입니다.

### 3.4 샌드박스 격리 — 보안의 유일한 방어선

**심사는 코드를 검증할 수 없습니다.** Unity가 뱉은 수십 MB짜리 `.wasm` 블롭을 사람이 읽을 방법이
없어서, 심사는 "실제로 플레이해보고 콘텐츠를 확인"하는 것으로 한정되고, 보안은 전적으로 격리가
책임집니다. 임명된 신뢰 제작자라도 이 격리는 예외 없이 적용합니다 — 계정 탈취, 오염된 서드파티
라이브러리 등은 신뢰와 무관하게 발생할 수 있습니다.

1. **`owogg.com`과 완전히 다른 도메인**(서브도메인이 아님)에서 서빙 — `owogg.com` 세션 쿠키에
   접근할 수 없도록 하는 근본 차단.
2. **iframe `sandbox="allow-scripts allow-pointer-lock"`** — 슈터 장르를 위해 포인터 락은
   허용하되, `allow-same-origin`/`allow-top-navigation`/`allow-popups`는 제외.
3. **CSP `connect-src 'none'`** — 게임이 자기 에셋 외 외부와 통신하지 못하게 차단(유저 데이터
   유출 방지).

### 3.5 점수는 위조 가능 전제 — 차단이 아니라 격리로 대응

`postMessage`로 오는 점수는 devtools로 임의 조작이 가능해 **원천 차단이 불가능**합니다. 대응은:

- 유저 게임의 리더보드는 **내장 4개 게임과 별도 네임스페이스**로 분리.
- **XP는 게임별로 관리자가 직접 설정하며 기본값 0** — §3.7의 관리자 조정 메타데이터 항목.
  [`progression.ts`](../packages/core/src/domain/progression.ts)의
  `XP_DAILY_CAP_COMPLETIONS_PER_GAME = 10`이 게임당 상한이라, 게임을 자유롭게 만들 수 있으면
  게임 수만큼 상한이 배가되는 파밍 문제가 있습니다 — 기본 0으로 시작해 승인 시 관리자가 명시적으로
  XP를 부여하는 것으로 막습니다. 인플레된 XP는 나중에 되돌릴 수 없으므로 반드시 시작을 0으로.
- 매니페스트의 점수 `min`/`max` 범위는 서버에서 검증 — 기존
  [`scoreValidation.ts`](../packages/core/src/domain/scoreValidation.ts)의
  `GAME_MANIFEST_MAP` 정적 O(1) 조회를, 업로드 게임은 DB 조회 기반으로 확장해야 합니다(구현 시
  가장 손이 많이 가는 지점).
- **2026-08-17 베타 경화 — sandbox 게임 점수 제출은 명시적으로 미지원.** 확장 전까지
  `GAME_MANIFEST_MAP`에 없는 `gameId`(= sandbox 게임 포함 모든 미등록 게임)는 **즉시 거부**됩니다
  (`validateScoreByManifest`, `scripts/registry-builder.ts`). 기존에는 이 경우 `0~1,000,000`
  범위면 통과시키는 느슨한 fallback이 있었는데 — sandbox 게임 slug가 이 registry에 존재한 적이
  없어서, 사실상 **어떤 게임인지 검증도 안 된 임의의 점수를 받아주는 구멍**이었습니다. 이 fallback을
  제거하고 미등록 게임은 전부 거부로 바꿔, sandbox 게임 리더보드(위 DB 조회 기반 확장)가 실제로
  구현되기 전까지는 점수 제출 자체가 막힙니다 — "애매하게 열어두지 않는다"는 원칙에 따른 선택입니다.

### 3.6 제작 권한 — 승인제 (2026-08-15 확정, 2026-08-18 신청 경로 추가 + 스태프 암묵 부여)

- **V1은 승인된 게임 크리에이터(`game_creator_access`, `status='ACTIVE'`)만 업로드 가능**합니다.
  승인 없이는 접근할 수 없습니다 — 무료/유료 티어, 쿼터, 신고 절차 등 "누구나 즉시 제출"을
  전제로 한 장치는 여전히 V1 범위 밖입니다.
- **승인에 이르는 경로는 세 가지입니다**: ① 운영자가 직접 지정(기존, 신청 절차 없음), ②
  유저가 직접 신청(`game_creator_applications`)한 뒤 운영자가 심사·승인 — **2026-08-18 기준
  이 경로는 운영 준비가 끝날 때까지 임시로 닫혀 있습니다**(`canApplyForGameCreator()`, 추후
  업데이트 예정 — [`docs/AUTHORIZATION.md`](AUTHORIZATION.md) §5.3), ③ ADMIN/OPERATOR/
  SYSTEM_DEVELOPER는 별도 지정·신청 없이 암묵적으로 자격을 가짐(§5.3a, MODERATOR는 제외).
  어느 경로든 최종적으로 `game_creator_access`가 `ACTIVE`가 되거나(①②) 스태프 조건을
  만족해야(③) 업로드가 가능하다는 점은 동일합니다. 자세한 흐름은
  [`docs/AUTHORIZATION.md`](AUTHORIZATION.md) §5 참고.
- 지명 실패 시 최후 수단으로 **운영자 본인이 제작자로 등록해 대신 업로드**할 수 있습니다(다만
  ③번 경로로 ADMIN/OPERATOR는 이미 암묵 자격을 가지므로 실제로는 SYSTEM_DEVELOPER가 아닌 다른
  스태프에게 필요한 경우는 드뭅니다).
- 일반 유저 전면 개방(쿼터·과금·신고 절차 포함)은 V1이 안정된 뒤 별도로 설계·재개합니다.

**용어**: 게임을 만드는 사람은 이제 **GAME_CREATOR**/"게임 크리에이터"로 부릅니다(DB 테이블은
`game_creator_access` — 과거 `game_developers`에서 이름만 변경, §3.7). 이 코드베이스에는
"Creator"가 이미 스트리머(YouTube/CHZZK/SOOP/Twitch, `creator_profiles`)를 가리키는 용어로 쓰이고
있어([`CREATOR_SYSTEM.md`](CREATOR_SYSTEM.md)), 게임 제작자에 같은 단어를 단독으로 재사용하면
테이블·라우트·문서가 혼동됩니다 — 그래서 게임 쪽은 항상 **GAME_CREATOR**로, 방송 쪽은 항상
**STREAMER**로 명시적으로 구분해 부릅니다([`docs/AUTHORIZATION.md`](AUTHORIZATION.md) §7.3).
GAME_CREATOR는 OwOGG 플랫폼 자체를 만드는 Staff Role인 SYSTEM_DEVELOPER와도 다른 개념입니다
([`docs/AUTHORIZATION.md`](AUTHORIZATION.md) §5.1) — 헷갈리기 쉬운 두 용어이니 확실히 구분하세요.

**콘텐츠 정책(기본 원칙)**: 불법 콘텐츠·혐오/차별 표현·성인 콘텐츠 금지, 타인 IP 침해 에셋/텍스트
금지, 악성 코드·타 사용자 피해 로직 금지, OwOGG 전체 톤/브랜드와 크게 어긋나지 않을 것.

#### 3.6.1 동시 심사 제출 제한 — 제작자당 2개 (2026-08-17 베타 경화)

**평생 등록 가능한 게임 수 제한이 아니고, 승인된 총 게임 수 제한도 아닙니다** —
**"아직 심사 결정이 안 난 제출"이 동시에 몇 개까지 존재할 수 있는가**만 제한합니다.

```text
게임 A = PENDING_REVIEW  ─┐
게임 B = PENDING_REVIEW  ─┴─ 슬롯 2개 모두 사용 중 → 새 제출 거부(SUBMISSION_LIMIT_REACHED)

게임 A가 APPROVED/REJECTED/WITHDRAWN(제작자 철회) → 슬롯 반환 → 새 제출 1개 가능
```

`sandbox_games.review_slot`(NULL|1|2)로 구현했고, **DB 레벨 invariant**(제작자당
`(developer_user_id, review_slot)` partial UNIQUE INDEX)로 강제합니다 — 애플리케이션 레벨
`COUNT(*)` 체크 후 INSERT 방식은 동시 요청 race로 슬롯을 초과할 수 있어 채택하지 않았습니다.
실제로 슬롯 확보는 `INSERT ... SELECT`로, "빈 슬롯 계산"과 "게임 row 생성"을 한 문장으로 묶어
원자적으로 처리합니다(`packages/db/src/d1/D1SandboxGameRepository.ts` `create()`).

#### 3.6.2 드래그 앤 드롭 자동 등록 — `owogg.game.json` (2026-08-18, 2026-08-18 수동 폼 폐지)

ZIP 최상위에 `owogg.game.json` 매니페스트 파일을 넣어 두면, 게임 크리에이터 센터에 그 ZIP을
끌어다 놓는 것만으로 게임 등록과 첫 버전 업로드가 한 번에 끝납니다:

```json
{
  "slug": "ball-dodge",
  "title": "공 피하기",
  "genre": "action",
  "shortDescription": "장애물을 피해 최대한 오래 버티는 캐주얼 게임",
  "description": "선택 사항 — 상세 설명"
}
```

- `slug`/`title`/`genre`는 필수, `shortDescription`/`description`은 선택입니다. 검증 규칙은
  과거의 수동 등록 폼과 동일합니다 — 매니페스트 경로가 별도 검증을 두지 않고 기존
  `SandboxGameUseCases.createGame()`을 그대로 재사용하기 때문입니다
  (`SandboxGameUseCases.createGameFromBundle`,
  `packages/core/src/application/sandboxGameUseCases.ts`).
- **드래그 앤 드롭이 유일한 등록 경로입니다** (2026-08-18 — 게임 크리에이터 센터의 슬러그/제목/
  장르 수동 입력 폼은 제거했습니다). `owogg.game.json`이 없는 ZIP은 새 게임을 등록하지
  않습니다(`MANIFEST_MISSING`) — 이미 존재하는 게임에 새 버전을 올리는 "버전 업로드"만 매니페스트
  없이도 동작합니다(그건 새 게임을 만드는 게 아니라 기존 게임에 파일을 추가하는 것이므로). 파일은
  있는데 JSON이 깨졌거나 객체가 아니면 `BUNDLE_MALFORMED`로 명확히 실패합니다("아무 일도 없었던
  것"처럼 조용히 넘어가지 않음).
- ZIP은 **한 번만 압축 해제**됩니다 — 매니페스트를 읽는 것과 실제 파일을 발행하는 것이 같은
  `prepared.files`를 공유합니다.
- 발행되는 파일 자체는 매니페스트 유무와 무관하게 동일한 검증(§3.2.1의 zip bomb 방어, 경로 검증,
  `index.html` 존재 확인)을 거칩니다 — 매니페스트는 오직 "게임 row를 무엇으로 만들지"만 알려줄
  뿐, 번들 검증 절차를 우회하지 않습니다.
- API: `POST /api/dev/games/upload` (multipart, 필드명 `bundle`) — `docs/GAME_UPLOAD_GUIDE.md`와
  공개 위키([`/wiki/games/development`](../apps/web/app/routes/wikiGamesDevelopment.tsx))에서
  플레이어 대상 안내를 볼 수 있습니다.
- **저장/D1 쓰기 실패는 항상 타입이 있는 `PUBLISH_FAILED`로 귀결됩니다** (2026-08-18 프로덕션
  버그 수정) — 이전에는 원본 아카이브 저장(`storage.putObject`)이나 버전 row 삽입이 실패하면
  가공되지 않은 예외가 그대로 새어나가 라우트 계층에서 처리되지 않는 500(빈 JSON 본문)이 되었고,
  더 나쁘게는 `createGameFromBundle`의 앞쪽 절반(게임 row 생성)은 이미 성공한 뒤였기 때문에
  버전 없는 "고아" 게임이 남아 같은 슬러그로 재시도조차 막혔습니다. 지금은
  `SandboxGameUseCases`의 `uploadPreparedVersion`이 이 두 단계를 모두 감싸 예외를
  `PUBLISH_FAILED`로 정규화합니다.

#### 3.6.3 게임 삭제 — 두 가지 경로 (2026-08-18)

승인 이전이냐 이후냐에 따라 삭제 권한과 방식이 다릅니다:

- **게임 크리에이터 셀프서비스 삭제** (`DELETE /api/dev/games/:id`,
  `SandboxGameUseCases.deleteOwnGame`) — 자신이 등록한 게임이 **아직 한 번도 승인된 버전이
  없을 때만** 스스로 완전히 삭제할 수 있습니다. 별도 권한 부여 없이 소유권만으로 동작합니다.
  **진짜 하드 삭제**입니다 — 게임/버전/심사 로그 row가 전부 사라집니다(`SandboxGameRepository.
hardDelete`). 소프트 삭제와 달리 이래야만 `slug`의 UNIQUE 제약이 실제로 풀려 같은 이름으로
  즉시 재시도할 수 있습니다(고아가 된 등록 실패 게임을 지우고 재등록하는 정확한 시나리오). 이미
  승인된 버전이 하나라도 있으면 `CANNOT_DELETE_APPROVED_GAME`으로 거부되며, 그 시점부터는
  아래 경로로만 삭제할 수 있습니다.
- **관리자/운영자 삭제** (`DELETE /api/admin/sandbox-games/:id`,
  `SandboxGameUseCases.deleteGame`) — `sandbox_games.delete` 권한을 가진 스태프만(ADMIN/
  OPERATOR) 승인 여부와 무관하게 어떤 게임이든 삭제할 수 있습니다. **소프트 삭제**입니다 — row는
  감사(audit) 목적으로 남고, `deleted_at`/`deleted_by_admin_id`만 채워집니다(migration
  `0026_sandbox_game_soft_delete.sql`). 삭제 즉시 `visibility`가 강제로 `PRIVATE`로 전환되고,
  아직 심사 대기 중이던 버전이 있으면 함께 철회되며 심사 슬롯도 반환됩니다(§3.6.1과 동일한 슬롯
  반환 로직 재사용).

두 경로가 다른 삭제 방식을 쓰는 이유: 셀프서비스로 지울 수 있는 게임은 애초에 아무도 심사한 적이
없으므로 감사 기록으로 남길 가치가 없고, 하드 삭제라야 슬러그가 실제로 풀립니다. 반면 관리자가
지우는 게임은 이미 공개됐거나 심사를 거쳤을 수 있으므로 무엇이 왜 내려갔는지 기록이 남아야 합니다.

`sandbox_games.delete`가 `sandbox_games.review`(승인/반려)와 별개 권한인 이유: MODERATOR는
콘텐츠 심사는 하되, 게임을 완전히 내리는 더 강한 조치까지는 할 수 없어야 한다는 2026-08-18 제품
결정 때문입니다 — 그래서 `sandbox_games.delete`는 OPERATOR의 기본 권한 묶음에만 있고
MODERATOR에는 없습니다([`docs/AUTHORIZATION.md`](AUTHORIZATION.md) §4). 두 경로 모두 B2에 저장된
실제 파일(오브젝트)은 지우지 않습니다 — 스토리지 GC는 §3.2 `sourceArchiveObjectKey`에서 이미
"추후 버전 GC" 대상으로 남겨둔 별도 과제입니다.

### 3.7 DB 스키마 초안

핵심은 **게임(카탈로그 엔트리)과 번들 버전을 분리**하는 것입니다 — 재업로드는 재심사를 받아야
하지만, 그동안 기존 승인 버전은 계속 서빙되어야 합니다.

> ⚠️ 아래는 최초 설계 스케치이며, 실제 구현(review와 visibility를 완전히 분리한 두 축 모델 등)과
> 세부 컬럼이 갈라져 있습니다 — 정확한 최신 스키마는
> [`packages/db/migrations/0024_sandbox_games.sql`](../packages/db/migrations/0024_sandbox_games.sql)을
> source of truth로 참고하세요. 아래 `game_developers` 테이블은 마이그레이션
> [`0025`](../packages/db/migrations/0025_staff_roles_and_game_creator_program.sql)에서
> **`game_creator_access`로 이름만 변경**되었고(행 데이터는 그대로), 같은 마이그레이션이
> 셀프서비스 신청을 위한 `game_creator_applications` 테이블을 추가했습니다 — 둘 다 이 스케치에는
> 반영되어 있지 않으니 실제 컬럼은 마이그레이션 원문을 확인하세요.

```sql
-- 업로드 권한 (관리자가 임명, 또는 셀프서비스 신청 승인). admin_accounts와 별개 — 비밀번호/
-- Google step-up 없음. 실제 테이블명은 game_creator_access (마이그레이션 0025에서 rename).
CREATE TABLE game_developers (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  granted_by_admin_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',   -- ACTIVE | REVOKED
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 카탈로그 엔트리. 메타데이터는 전부 관리자가 번들 재업로드 없이 수정 가능
CREATE TABLE sandbox_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,               -- 그대로 scores.game_id로 사용
  developer_user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,                     -- ↓ 여기부터 관리자 세션에서 조정 가능
  short_description TEXT,
  description TEXT,
  genre TEXT NOT NULL,                     -- 장르 제약 없음 — §1 참고
  xp_per_completion INTEGER NOT NULL DEFAULT 0, -- 기본 0, 승인 시 관리자가 부여
  score_unit TEXT, score_direction TEXT, score_min INTEGER, score_max INTEGER,
  status TEXT NOT NULL DEFAULT 'DRAFT',    -- DRAFT|PENDING_REVIEW|APPROVED|REJECTED|DISABLED
  live_version_id INTEGER,                 -- 현재 서빙 중인 승인된 버전 (아래 테이블 FK)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 번들 버전 = 불변. 재업로드하면 새 행이 쌓이고 재심사 대상이 됨
CREATE TABLE sandbox_game_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL REFERENCES sandbox_games(id),
  object_key TEXT NOT NULL,                -- provider-neutral, 원본 ZIP 키 (uploads/<gameId>/<hash>.zip)
  content_hash TEXT NOT NULL,              -- 승인한 바이트 = 서빙 바이트 보장
  bundle_bytes INTEGER NOT NULL,           -- 압축된 원본 ZIP 크기
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW', -- PENDING_REVIEW|APPROVED|REJECTED (심사 축)
  uploaded_at TEXT NOT NULL,
  -- 배포 축 (심사 축과 독립, §3.2.1). READY만 서빙/라이브 지정 가능.
  publish_status TEXT NOT NULL DEFAULT 'UPLOADED', -- UPLOADED|PUBLISHING|READY|FAILED
  publish_error TEXT,
  published_at TEXT,
  manifest_key TEXT,                       -- 이 버전의 파일 목록 manifest 키
  published_size_bytes INTEGER,            -- 압축 해제 후 총 크기 (bundle_bytes와 다름)
  file_count INTEGER
);

-- Creator 심사 시스템의 creator_review_audit_log와 동일한 append-only 패턴 재사용
CREATE TABLE sandbox_game_review_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL REFERENCES sandbox_games(id),
  version_id INTEGER REFERENCES sandbox_game_versions(id),
  reviewer_admin_id INTEGER NOT NULL,
  action TEXT NOT NULL,                    -- APPROVED|REJECTED|DISABLED|METADATA_CHANGED
  reason TEXT,
  created_at TEXT NOT NULL
);
```

**점수/리더보드는 스키마 변경이 필요 없음**: `scores.game_id`는 이미 임의 문자열입니다 — 승인된
`sandbox_games.slug`를 그대로 `game_id`로 쓰면 기존 리더보드 인프라가 코드 변경 없이 그대로
적용됩니다(단, §3.5에서 언급한 것처럼 별도 네임스페이스로 취급).

**심사 워크플로우**는 Creator 심사 시스템(`/admin/creators`, 수동 심사 큐 + 감사 로그)과 동일한
UI/API 패턴을 재사용합니다. `/admin/games`(게임 활성화/비활성화)도 유사한 참고 사례입니다.

#### 3.7.1 캐시가 공개 상태 전환(테이크다운)을 우회하지 않도록 (2026-08-17 베타 경화)

`/games/:gameId/:versionId/*`는 `caches.default`(Cloudflare Cache API)를 씁니다. 이 캐시는 HIT
시 라우트 핸들러를 아예 호출하지 않으므로, **캐시 HIT가 DB의 visibility/승인 상태 재확인을 완전히
건너뛸 수 있습니다** — 만약 에셋 캐시 TTL이 그대로 1년(`IMMUTABLE_MAX_AGE_SECONDS`)이었다면, 게임을
PUBLIC → PRIVATE로 전환해도 이미 캐시된 요청은 **최대 1년간** 계속 서빙됐을 것입니다(테이크다운이
사실상 작동하지 않는 심각한 문제).

해결: **가용성 게이트를 바이트 캐시보다 먼저** 미들웨어 체인에 둡니다.

```text
request → 가용성 게이트(짧은 TTL, 60초) → 바이트 캐시(긴 TTL, 1년) → B2
```

가용성 게이트는 `(gameId, versionId)`가 지금 서빙 가능한지만 확인하는, 파일 경로와 무관한 별도의
`caches.default` 항목입니다(`SandboxGameUseCases.isVersionServable` — 실제 파일을 읽지 않는 저렴한
D1 전용 체크). 이 항목은 60초마다 만료되므로, **에셋 바이트 자체는 여전히 1년 immutable로 캐시할 수
있으면서도, 테이크다운은 최대 60초 안에 실제로 반영됩니다.** 회귀 테스트로 "PUBLIC으로 캐시 채움 →
PRIVATE 전환 → 동일 URL 재요청 시 차단"을 직접 검증했습니다
(`apps/api/test/gameServing.test.ts`).

### 3.8 새로 필요한 인프라

현재 저장소에는 없는 것들이며, 착수 전 준비가 필요합니다. 코드는 이미
`GameBundleStorageRepository` 포트 + `BackblazeB2GameBundleRepository` 구현으로 준비돼 있으므로
(`packages/db/src/storage/`), 아래는 전부 **계정/외부 설정** 작업이지 코드 작업이 아닙니다:

| 항목                                 | 용도                                                                                                      |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **Backblaze B2 계정 + private 버킷** | 게임 번들 저장. `B2_ENDPOINT`/`B2_REGION`/`B2_BUCKET_NAME` 확보 (§25)                                     |
| **범위 제한 Application Key**        | 해당 버킷만 접근 가능한 최소 권한 키 — `B2_KEY_ID`/`B2_APPLICATION_KEY`로 `wrangler secret put` (§7, §25) |
| **B2 Caps + Alerts**                 | 저장/다운로드/거래 한도 및 임계값 알림 — 비용 사고 방지의 핵심 (§12, §26)                                 |
| **별도 도메인 (`GAME_ORIGIN`)**      | 샌드박스 격리. 현재는 미연결 — 아래 참고                                                                  |
| **번들 서빙 라우트**                 | ✅ 구현됨 (`/play/:slug`, `/games/:gameId/:versionId/*` — 별도 Worker가 아니라 기존 API Worker의 라우트)  |

R2와 달리 **B2 접근은 Cloudflare "바인딩"이 아니라 일반 HTTPS(S3-compatible API) + Worker
secret**입니다 — 그래서 `apps/api/wrangler.jsonc`를 건드릴 필요가 전혀 없고, `wrangler deploy`가
버킷 존재 여부를 검증하지 않습니다(예전 R2 계획에서 있었던 "바인딩을 먼저 커밋하면 다음 배포부터
실패한다"는 위험이 이 전환으로 사라졌습니다).

**번들 서빙은 별도 Worker 프로젝트로 만들지 않았습니다.** 기존 API Worker에 `/play`, `/games`
라우트로 붙였습니다 — 격리에 실제로 기여하는 건 *브라우저가 보는 호스트명*이고 어느 코드베이스가
서빙하는지가 아니기 때문입니다. 따라서 별도 Worker를 배포·운영·인증 공유하는 복잡도를 지불하지
않고, `play.owogg.com`을 이 Worker로 라우팅하기만 하면 동일한 격리를 얻습니다.

⚠️ **`play.owogg.com` 라우트는 `wrangler.jsonc`에 아직 추가하지 않았습니다.** `custom_domain` 항목은
`wrangler deploy` 시점에 DNS/zone을 실제로 조작하므로, 운영자가 의도를 갖고 추가해야 하는 인프라
변경입니다(R2 바인딩 사고와 같은 부류의 위험).

**2026-08-17 베타 경화: `GAME_ORIGIN` 미설정 시 더 이상 API 오리진으로 폴백하지 않습니다 —
서빙 자체를 막습니다(fail closed).** `/play`, `/games` 두 라우터 모두 요청 호스트명을
`GAME_ORIGIN`(Worker secret, `wrangler.jsonc` 바인딩 아님)과 비교하는 게이트를 가장 먼저
통과해야 하며, 일치하지 않으면 D1 조회조차 없이 즉시 404입니다. `GAME_ORIGIN`이 아예 설정되지
않은 경우는 `localhost`/`127.0.0.1`만 예외로 허용됩니다(로컬 개발 편의) — 즉 **`play.owogg.com`을
연결하고 `GAME_ORIGIN`을 설정하기 전까지는 프로덕션(`api.owogg.com`)에서 샌드박스 게임이 전혀
서빙되지 않습니다.** 이건 의도된 동작입니다: `GAME_ORIGIN`이 없다는 건 격리를 만드는 별도 호스트가
아직 없다는 뜻이고, 그 상태에서 `api.owogg.com`으로 서빙을 허용하면 격리가 애초에 성립하지 않기
때문입니다.

### 3.9 명시적 비목표 (V1 범위 밖)

- 일반 유저 전면 개방(쿼터·과금·콘텐츠 신고 절차 포함) — 임명제로 시작.
- 실시간 멀티플레이어 게임 — 서버 권위 로직·치팅 방지·WebSocket 인프라가 별도로 필요합니다.
  별도 설계는 [`docs/MULTIPLAYER_GAME_DESIGN.md`](MULTIPLAYER_GAME_DESIGN.md) 참고.
- 네이티브 바이너리, 파일 시스템 접근이 필요한 게임(브라우저 샌드박스의 한계).

---

## 4. 착수 순서

**1단계 — 인프라 + 관리자 전용 파일럿.** B2 계정/버킷/Application Key + 샌드박스 도메인 + 번들
서빙 Worker + SDK를 만들고, `/admin/games`에서 관리자만 ZIP 업로드(임명된 제작자 워크플로우
이전에 인프라 자체를 검증). **목적: 샌드박스가 실제로 안전한지, Unity/Godot 빌드가 진짜
돌아가는지 실측** — 포인터 락, WASM 로딩(CORS), 오디오 자동재생 정책 등 실제로 터지는 문제가
여기서 다 나옵니다.

**2단계 — 제작자 임명 + 심사 워크플로우.** `game_creator_access`(구 `game_developers`),
`sandbox_games`, `sandbox_game_versions`, 감사 로그 + `/admin/games/review` 큐. 임명(또는
셀프서비스 신청 승인, §3.6)된 제작자가 업로드하면 관리자가 심사(§3.7)하고, 승인 시 §3.6의
메타데이터(제목/설명/장르/XP)를 관리자가 조정합니다.

**3단계 (V1 범위 밖, 추후) — 일반 유저 개방.** 쿼터·과금·콘텐츠 신고 절차를 갖춰 임명제를 풀 때
별도로 설계합니다.

현재 단계에서 확정된 원칙은 "B2 번들 업로드(URL 임베드 아님) + 우리 서빙", "별도 도메인 샌드박스
격리", "V1은 임명된 제작자만", "사람이 직접 승인", "승인 전 비공개", "XP 기본 0, 관리자 부여",
"장르 제약 없음", "비용 사고 방지를 위한 앱 quota + B2 Caps 이중 방어" 여덟 가지이며, 나머지
세부 사항(정확한 심사 SLA 등)은 1단계 착수 시점에 함께 확정합니다.
