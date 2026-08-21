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

## Current scope: official bootstrap source only

Only games owned by OwOGG itself (`owner.type === "SYSTEM"`) live here. The owner field is build
input, not production publisher authority: runtime authority is the generic D1 identity
(`publisher_type = 'OWOGG'` or `USER`). User-published games remain managed by the sandbox review
control plane and converge into the same generic runtime persistence.

## Runtime status

This directory generates `GAME_DEFINITIONS` as deterministic source input for official standalone
bundle builds and the idempotent generic OWOGG bootstrap. It is not queried by production runtime
delivery. Production resolves every publisher through `RuntimeGameRegistry`: D1 identity/live
version plus B2 canonical document and generic bundle.

`GAME_MANIFESTS` / `GAME_MANIFEST_MAP`, generated from `games/*/src/manifest.ts`, remains source
input for achievements, personalization, creator/Discord tooling that has not yet converged. Those
build/control-plane consumers are why the official game source folders and generators stay.

The two are held to agreement by a machine check, not by discipline:

- `pnpm registry:check` fails if the generated files are stale, if any slug collides,
  or if the two sources disagree about any game.
- registry-builder/schema tests assert the same equivalence at the build boundary.

That agreement protects bootstrap input without creating a second runtime registry.

## Editing

Both generated files are checked in, and CI fails if they drift:

```bash
pnpm generate:registry   # after editing anything in this directory
pnpm registry:check      # what CI runs
```

Field-by-field rules — including which values are accepted and why `slug` can never
change once a game has shipped — live in `scripts/game-registry-schema.ts`, which is
the validator itself rather than a description of one.
