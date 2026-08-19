// AUTO-GENERATED FILE — see scripts/publish-official-game-bundles.ts. DO NOT EDIT BY HAND.
//
// Maps a migrated SYSTEM game's slug to the exact bundle version currently published under
// official-games/<slug>/<version>/ (SystemGameBundlePublisher; served by
// apps/api/src/routes/gameServing.ts's /official-games/:slug/:version/* route). This is a plain
// deployment/runtime locator, deliberately kept OUT of GameDefinition/GameManifest — see
// GameHost.tsx's own doc comment on resolveGameRuntimeKind for why a build-time deploy artifact
// must never live inside a game's catalog metadata.
//
// Checked into git EMPTY: a contributor's local `pnpm dev`/`pnpm build` never needs Backblaze B2
// credentials, and every slug simply falls back to LegacyReactRuntime (see GameHost.tsx). The
// production deploy workflow's "Publish Official Game Bundles" step
// (.github/workflows/deploy.yml) overwrites this exact file with the real published hash for every
// migrated game, immediately before the "Build Web Frontend" step runs — never committed back to
// git. A slug missing from this map, whether because it hasn't been migrated yet or because a
// deploy's publish step failed, simply plays through the legacy runtime instead of a broken iframe
// URL — see resolveGameRuntimeKind in GameHost.tsx.
export interface SystemGameRelease {
  /** The bundle's own sha256 content hash — also its `/official-games/:slug/:version/` path
   * segment (see scripts/publish-official-game-bundles.ts). */
  version: string;
  /** Entry HTML file inside the published bundle, relative to its version root. Always
   * "index.html" today (BUNDLE_ENTRY_PATH), kept as a field rather than a hardcoded constant so a
   * future bundle layout change doesn't require touching every call site. */
  entry: string;
}

export const SYSTEM_GAME_RELEASES: Readonly<Record<string, SystemGameRelease>> = {};
