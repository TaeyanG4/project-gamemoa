# ball-dodge — Game Bridge 참고 통합

이 예제는 `GameHost` → `IframeRuntime` → Game Bridge(`@owogg/game-sdk/bridge`) 경로를 수동으로
확인하기 위한 업로드 가능한 참고 bundle입니다. 현재 USER 게임과 OWOGG 게임은 동일한 generic
runtime을 사용하며, USER 게임은 별도의 upload → review → publication 제어 흐름을 유지합니다.

Not the same artifact as
`apps/api/test/fixtures/game-deploy-smoke-test/ball-dodge/` — that fixture is a deliberately
SDK-free pipeline smoke test (see its own doc comment). This one exists specifically to exercise
the Bridge end to end.

## Build

```
node examples/ball-dodge/build.mjs
```

Vendors the current `packages/game-sdk/src/bridge/{protocol,client,index}.ts` into
`vendor/game-sdk-bridge/` (copied fresh every run, never committed — see `.gitignore`), compiles
`main.ts` + the vendored bridge together, copies the static assets, and zips the result into
`ball-dodge.zip` — the exact file to upload.

## Verify (optional, before uploading)

```
npx tsx examples/ball-dodge/verify-zip.mjs
```

Runs the actual production bundle validators
(`packages/core/src/domain/sandboxGameBundle.ts`) against the built zip, plus a check that the
Bridge really made it into the bundle.

## Manual E2E

1. Build the zip (above).
2. Sign in as a developer, open the Game Creator Center, and drag `ball-dodge.zip` onto the
   auto-registration drop zone. This creates the game and its first version through
   `createGameFromBundle` — the same call any Creator upload makes.
3. As an admin, approve the pending version and set the game's visibility to PUBLIC (same review
   flow as any other Creator game).
4. Web app에서 `/games/ball-dodge`를 엽니다. Generic public game API가 live version을 해석하고
   `GameHost`가 `IframeRuntime`과 Bridge를 통해 bundle을 실행합니다.
5. Click 시작 — confirm `GAME_STARTED` fires (no visible signal by itself, but nothing errors).
6. 공이 플레이어와 충돌하게 하고, 생존 시간이 score로 표시되며 `ballsSpawned` metadata가
   `GAME_COMPLETE`를 통해 결과 UI에 도달하는지 확인합니다. Score acceptance는 signed session과
   server-side canonical policy를 따릅니다.
7. Click 다시 시작 — confirm the iframe fully reloads (fresh bridge handshake) and the game is
   playable again.
8. `/games/reaction-time` 또는 다른 OWOGG 게임을 열어 동일한 `GameHost` → `IframeRuntime` → Bridge
   경로에서 play, difficulty, score submission, leaderboard preview가 동작하는지 확인합니다.
