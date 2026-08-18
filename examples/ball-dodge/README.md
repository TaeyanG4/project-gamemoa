# ball-dodge — Game Bridge reference integration

The first Creator game wired to `GameHost` through `IframeRuntime` + the Game Bridge
(`@owogg/game-sdk/bridge`) instead of the plain iframe embed every other sandbox game still uses.
Registered and served through the **existing, unmodified** Creator lifecycle
(upload → review → publish → B2) — nothing about that pipeline changed for this to work.

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
4. Visit `/games/ball-dodge` on the web app. `transitionalCreatorGameResolver` resolves it as a
   Creator game (via `GET /api/games/ball-dodge`) and renders `CreatorGameHost`, which mounts the
   bundle through `IframeRuntime`.
5. Click 시작 — confirm `GAME_STARTED` fires (no visible signal by itself, but nothing errors).
6. Let a ball hit the player. Confirm `GameHost`-styled result overlay appears with the survived
   seconds as the score and a `ballsSpawned` metadata entry — this is `GAME_COMPLETE` reaching the
   result UI and stopping exactly there, no score submission/leaderboard/XP call made.
7. Click 다시 시작 — confirm the iframe fully reloads (fresh bridge handshake) and the game is
   playable again.
8. Visit `/games/reaction-time` (or any of the other three built-in games) and confirm play,
   difficulty, score submission, and the leaderboard preview all work exactly as before — the
   SYSTEM path (`GameHost` + `LegacyReactRuntime`) is untouched by this integration.
