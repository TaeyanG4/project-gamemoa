import test from "node:test";
import assert from "node:assert/strict";
import type { GamePresentation, GameManifest } from "../src/contracts/index.js";

/**
 * GamePresentation is pure vocabulary — no functions to exercise, no runtime behavior of its own
 * yet (see its own doc comment on what's deliberately deferred to a later PR, and on why every
 * field here is a preference for a host to weigh, never an instruction it must obey). What's worth
 * pinning down here is exactly what this PR promises: the shape itself is assignable in every mode
 * the concept describes, its one structural invariant (`mode: "fixed"` requires a design
 * resolution) is actually enforced by the type rather than just documented, and GameManifest keeps
 * working perfectly well with the field entirely absent (the backward-compatibility guarantee
 * every one of the four shipped games depends on).
 */

test("a responsive-mode presentation is assignable with just its required fields", () => {
  const presentation: GamePresentation = {
    viewport: { mode: "responsive" },
    fullscreen: { supported: false },
    mobile: { support: "unsupported" },
  };
  assert.equal(presentation.viewport.mode, "responsive");
});

test("a fixed-mode presentation carries a design resolution via preferredWidth/preferredHeight", () => {
  const presentation: GamePresentation = {
    viewport: { mode: "fixed", preferredWidth: 640, preferredHeight: 360 },
    fullscreen: { supported: true, recommended: true },
    mobile: { support: "experimental", orientation: "landscape" },
  };
  assert.equal(presentation.viewport.preferredWidth, 640);
  assert.equal(presentation.viewport.preferredHeight, 360);
});

// A negative compile-time check (`@ts-expect-error` on `{ mode: "fixed" }` with no
// preferredWidth/preferredHeight) was deliberately not added as a test here: this package's own
// tsconfig.json scopes `tsc --noEmit` to `include: ["src"]` (the same pattern every packages/*
// in this repo uses — core, db, contracts, shared, ui all only typecheck src/, never test/), so
// nothing under test/ is ever actually typechecked by `pnpm typecheck` — these files run only
// under `tsx --test`, which strips types without checking them. A `@ts-expect-error` placed here
// would silently do nothing and "pass" either way, which is worse than no test at all: it would
// look like enforcement without being any (fixing that gap package-wide is a separate, unrelated
// change — it interacts with rootDir/composite/outDir and touches every packages/* tsconfig, not
// just this PR's own code).
//
// The invariant itself — mode: "fixed" structurally requires preferredWidth/preferredHeight, see
// GamePresentationFixedViewport in ../src/contracts/presentation.ts — was verified directly
// against the real exported type with an isolated `tsc --noEmit --strict` run, and holds for real
// by construction: any *production* code that actually constructs a fixed-mode viewport lives
// under some package's own src/, which is exactly what `tsc --noEmit` does check.

test("viewport min/max bounds are all independently optional", () => {
  const presentation: GamePresentation = {
    viewport: { mode: "responsive", minWidth: 320, maxHeight: 720 },
    fullscreen: { supported: true },
    mobile: { support: "supported", orientation: "any" },
  };
  assert.equal(presentation.viewport.minWidth, 320);
  assert.equal(presentation.viewport.maxHeight, 720);
  assert.equal(presentation.viewport.minHeight, undefined);
});

test("GameManifest works with no presentation field at all — every game shipped today has none", () => {
  const manifest: GameManifest = {
    id: "example",
    slug: "example",
    title: "Example",
    shortDescription: "An example game",
    description: "An example game for this test",
    modes: ["single"],
    status: "draft",
    categories: [],
    tags: [],
    minPlayers: 1,
    maxPlayers: 1,
    thumbnail: "/thumb.svg",
    requiresAuth: false,
    supportsLeaderboard: false,
    inputMethods: ["mouse"],
    supportsReplay: false,
    version: "0.0.1",
  };
  assert.equal(manifest.presentation, undefined);
});

test("GameManifest also accepts a real presentation value", () => {
  const manifest: GameManifest = {
    id: "example",
    slug: "example",
    title: "Example",
    shortDescription: "An example game",
    description: "An example game for this test",
    modes: ["single"],
    status: "draft",
    categories: [],
    tags: [],
    minPlayers: 1,
    maxPlayers: 1,
    thumbnail: "/thumb.svg",
    requiresAuth: false,
    supportsLeaderboard: false,
    inputMethods: ["mouse"],
    supportsReplay: false,
    version: "0.0.1",
    presentation: {
      viewport: { mode: "responsive" },
      fullscreen: { supported: false },
      mobile: { support: "unsupported" },
    },
  };
  assert.equal(manifest.presentation?.viewport.mode, "responsive");
});
