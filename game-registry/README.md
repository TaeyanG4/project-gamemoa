# Game Registry

Canonical, source-controlled description of every game OwOGG serves.

A game is described by two files, and the split is the point:

```
game-registry/games/<slug>/
├── info.json     ← what the game IS      (its author describes it)
└── policy.json   ← what OwOGG ALLOWS     (an operator decides it)
```

## Why two files

`info.json` is the same kind of statement a Game Creator makes in their bundle's
`owogg.game.json` — a _submission manifest_: title, description, categories, how many
players, what you play it with. Its author is the person who made the game.

`policy.json` is everything a game's author must **not** be able to decide for
themselves: scoring bounds, whether it appears on a leaderboard, how much XP a
completion is worth, whether sign-in is required. Each of those is directly farmable.
XP most obviously — it is capped _per game_
(`XP_DAILY_CAP_COMPLETIONS_PER_GAME`), so a self-declared value would let anyone
multiply their own daily cap by publishing more games. Creator games therefore start
at `xpPerCompletion: 0` and are raised only by an explicit operator decision.

For the four official games in this directory both files are written by the same
people, so the split buys nothing today beyond documentation. It exists because the
moment creator games are registered here, the boundary has to already be real —
retrofitting a trust boundary onto a merged file is how policy fields get quietly
accepted from untrusted input.

## Current scope: SYSTEM games only

Only games owned by OwOGG itself (`owner.type === "SYSTEM"`) live here. Creator-owned
games are still described by `sandbox_games` rows in D1. The direction is a
B2-backed CreatorGameRegistry, resolved through the same `GameRegistry` port this
directory feeds — not yet implemented.

## Runtime status

This directory generates `GAME_DEFINITIONS`, which the composition root wires into
`StaticGameRegistry` (`apps/api/src/container.ts`) as the `GameRegistry` that
`ScoreUseCases` and `GameSettingsUseCases` resolve games through. `GAME_MANIFESTS` /
`GAME_MANIFEST_MAP`, generated from `games/*/src/manifest.ts`, remains the source for
everything not yet moved onto that port (achievements, personalization, creator/Discord
tooling).

The two are held to agreement by a machine check, not by discipline:

- `pnpm registry:check` fails if the generated files are stale, if any slug collides,
  or if the two sources disagree about any game.
- `packages/core/test/gameRegistry.test.ts` asserts the same equivalence as a test.

That agreement is what makes switching consumers over a small, reviewable change
later, rather than a rewrite that has to be trusted.

## Editing

Both generated files are checked in, and CI fails if they drift:

```bash
pnpm generate:registry   # after editing anything in this directory
pnpm registry:check      # what CI runs
```

Field-by-field rules — including which values are accepted and why `slug` can never
change once a game has shipped — live in `scripts/game-registry-schema.ts`, which is
the validator itself rather than a description of one.
