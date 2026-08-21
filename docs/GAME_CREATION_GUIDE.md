# OwOGG 게임 제작 가이드

상태: 가이드

마지막 검증: 2026-08-21

기준 소스:

- `packages/core/src/domain/sandboxGameBundle.ts`
- `packages/core/src/domain/sandboxGames.ts`
- `packages/core/src/application/gamePublicationService.ts`
- `packages/core/src/application/sandboxGameUseCases.ts`
- `packages/core/src/application/officialGameBootstrap.ts`
- `apps/api/src/routes/devGames.ts`
- `apps/api/src/routes/adminSandboxGames.ts`
- `apps/api/src/routes/gameServing.ts`
- `apps/web/app/features/game/GameHost.tsx`
- `packages/game-sdk/src/bridge/`

OwOGG에는 두 개의 **입력/control-plane**이 있지만 하나의 production runtime이 있습니다.

| 입력                          | 목적                                      | Runtime 결과               |
| ----------------------------- | ----------------------------------------- | -------------------------- |
| `games/*` + `game-registry/*` | OWOGG 소유 게임을 Git에서 build/bootstrap | generic D1/B2 game/version |
| Game Creator ZIP upload       | USER 게임 등록, publication, moderation   | generic D1/B2 game/version |

두 경로 모두 최종적으로 generic `games`, `game_versions`, `game_assets`와 B2 canonical/bundle을
사용합니다. `StaticGameRegistry`, publisher별 host/runtime, `/official-games/*`는 현재 production
경로가 아닙니다.

## 1. 게임이 지켜야 하는 runtime 계약

업로드 bundle은 자체 실행 가능한 정적 Web build여야 합니다.

- root에 `index.html`이 있어야 합니다. 모든 파일이 단일 최상위 폴더에 감싸진 ZIP은 publication
  준비 과정에서 그 폴더를 벗겨냅니다.
- 파일 참조는 bundle 내부의 상대 경로를 사용해야 합니다.
- 서버 코드, filesystem 접근, 비밀값, OwOGG cookie 직접 접근을 기대하지 않습니다.
- 게임 결과는 `@owogg/game-sdk/bridge` 계약으로 host에 전달합니다.
- host가 전달한 difficulty/session context를 사용하고 임의의 publisher/runtime URL을 만들지
  않습니다.

Bridge는 일반 RPC가 아닙니다. `HOST_INIT`, `GAME_READY`, `GAME_STARTED`, `GAME_COMPLETE`,
`GAME_CANCEL`, `HOST_RETRY`의 제한된 메시지와 크기/shape validation을 사용합니다. 게임은 raw
score를 완료 메시지로 보낼 수 있지만, 최종 acceptance는 서버 canonical policy와 signed
session이 결정합니다.

## 2. OWOGG 소스 게임

OWOGG 소유 게임을 저장소에 추가하는 기본 흐름입니다.

```bash
pnpm generate:game <slug>
# games/<slug>와 game-registry 입력 구현
pnpm generate:registry
pnpm registry:check
```

역할을 구분해야 합니다.

- `games/<slug>`: 게임 source package와 build output 규칙
- `game-registry/<slug>`: catalog/canonical 입력
- `GAME_DEFINITIONS`: 위 입력에서 생성되어 bootstrap과 여러 기존 build/test 소비자에 제공되는
  결정론적 데이터
- `GAME_MANIFESTS` / `GAME_MANIFEST_MAP`: 현재 도전과제, 개인화, Discord 등에서 계속 사용되는
  generated metadata

배포의 `pnpm bootstrap:official-games`가 OWOGG identity, content hash, canonical document,
immutable bundle, live version을 generic platform에 반영합니다. 같은 READY hash는 재사용하고,
hash가 바뀌면 새 numeric version을 publication한 후 live pointer를 전환합니다.

이 Git/bootstrap 흐름이 현재 OWOGG publication authority입니다. 향후 official-admin upload와의
precedence는 결정되지 않았으므로 도구나 문서가 임의로 선택하면 안 됩니다.

## 3. USER bundle 등록

### 3.1 새 게임 ZIP

Game Creator Center의 drag-and-drop 등록은 root에 다음 파일을 요구합니다.

```text
index.html
owogg.game.json
owogg.logo.png | .jpg | .jpeg | .webp | .svg
...game assets
```

`owogg.game.json`의 현재 등록 shape:

```json
{
  "slug": "my-game",
  "title": "My Game",
  "genre": "arcade",
  "shortDescription": "Short catalog description",
  "description": "Long description",
  "mode": "single"
}
```

`slug`, `title`, `genre`, `mode`는 현재 validation을 통과해야 합니다. `mode`는 `single` 또는
`multi`입니다. 정확한 길이와 형식 제한은 `SANDBOX_GAME_POLICY`가 권한 원천입니다.

새 등록 endpoint는 `multipart/form-data`의 `bundle` file을 받는
`POST /api/dev/games/upload`입니다. 과거 호환용 `POST /api/dev/games`는 남아 있지만 현재 Web UI
등록 흐름은 ZIP drag-and-drop입니다.

### 3.2 새 버전 ZIP

기존 게임 소유자는 `POST /api/dev/games/:id/versions`에 같은 `bundle` field로 새 standalone
ZIP을 올립니다. 등록 manifest와 logo는 **새 게임 등록**에 필요한 정보입니다. version upload가
게임 단위 logo를 자동 교체하는 흐름은 아닙니다.

### 3.3 현재 bundle 안전 제한

`SANDBOX_GAME_POLICY`가 현재 다음 제한을 강제합니다.

| 항목                            |   제한 |
| ------------------------------- | -----: |
| compressed upload               | 20 MiB |
| extracted bytes                 | 50 MiB |
| file count                      |    300 |
| path depth                      |     16 |
| new-game logo                   |  2 MiB |
| creator concurrent review slots |      2 |

절대 경로, drive path, `..`, 비정상 압축 비율, 누락된 `index.html`은 거부됩니다. publication은
request-time unzip serving을 하지 않고 검증된 파일을 version prefix에 개별 객체로 기록합니다.

## 4. 생명주기를 혼동하지 않기

### 4.1 소스/업로드 생명주기

```text
ZIP receive
→ archive metadata/path/size validation
→ normalized standalone files
→ source archive retained for USER retry
→ generic numeric identity/version allocation
```

USER source archive key는 content-addressed `uploads/<gameId>/<contentHash>.zip`입니다. 공개 파일은
별도의 version-scoped prefix를 사용합니다.

### 4.2 공통 publication 생명주기

```text
(gameId, versionId, contentHash)
→ PUBLISHING
→ games/<gameId>/<versionId>/<files>
→ games/<gameId>/<versionId>/.owogg-manifest.json  (last)
→ READY
```

파일 또는 manifest/DB 전이가 실패하면 version은 제공되지 않으며 `FAILED`로 기록됩니다. USER
관리자는 source archive로 같은 numeric version을 republish할 수 있습니다. release map이나
manifest-only publication은 현재 구조가 아닙니다.

### 4.3 USER review 생명주기

```text
PENDING_REVIEW
→ APPROVED | REJECTED | WITHDRAWN
APPROVED → revoke → PENDING_REVIEW
```

관리자 review API는 queue/detail, approve, reject, revoke, republish, live-version, metadata,
visibility, delete/purge를 제공합니다. Permission과 use-case invariant가 각 동작을 제한합니다.
특히 non-READY version은 승인할 수 없고, 승인된 version만 live로 선택할 수 있습니다.

```text
Publication READY != Moderation APPROVED
```

두 상태축 중 하나만 보고 게임이 public이라고 판단하면 안 됩니다. Generic runtime은 public
identity, live READY version, valid canonical, kill-switch 상태를 검사하고 USER control plane은
APPROVED/live/visibility 변경 자격을 관리합니다.

## 5. runtime 제공

```text
GET /play/:slug
→ RuntimeGameRegistry resolves generic identity/live version/canonical
→ redirect to /games/<gameId>/<versionId>/index.html
→ immutable version assets
```

`/games/:gameId/:versionId/*`는 exact numeric version과 manifest를 검증해 파일을 제공합니다.
`/official-games/*`는 404가 의도된 제거 경로입니다.

Web의 `GameHost`는 publisher를 보고 다른 host를 고르지 않습니다. public game/session을 가져오고
`IframeRuntime`을 구성하며 Bridge 완료를 score submission과 결과 UI에 연결합니다.

## 6. 점수 승인

게임 시작 전 API가 exact slug/live version/difficulty에 묶인 signed one-use session을 발급합니다.
완료 후 server는 다음을 다시 검증합니다.

- 서명, 만료, one-use attempt
- game와 version binding
- difficulty binding
- 현재 live/READY/public/kill-switch 상태
- B2 canonical score policy와 score shape/range

Bridge 결과나 client manifest만으로 랭킹 점수를 승인하지 않습니다.

## 7. 제출 전 점검

- standalone build를 로컬 static server에서 열었을 때 `index.html`과 모든 상대 asset이 동작함
- Bridge가 ready/start/complete/cancel을 계약에 맞게 보냄
- retry에서 상태가 정상 초기화됨
- difficulty가 host 초기값과 일치함
- ZIP root와 필수 등록 파일이 올바름
- compressed/extracted/file/logo 제한 이내임

실제 UI 업로드 순서는 [Game Upload Guide](GAME_UPLOAD_GUIDE.md), 전체 runtime 경계는
[Game Platform Architecture](GAME_PLATFORM_ARCHITECTURE.md)를 참조하세요.
