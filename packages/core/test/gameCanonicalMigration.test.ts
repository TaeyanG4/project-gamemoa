import test from "node:test";
import assert from "node:assert/strict";
import {
  creatorCanonicalDocumentToGameCanonicalDocument,
  systemGameDefinitionToGameCanonicalDocument,
} from "../src/modules/game/domain/gameCanonicalMigration.js";
import {
  CREATOR_GAME_DEFINITION_SCHEMA_VERSION,
  type CreatorGameCanonicalDocument,
} from "../src/domain/creatorGameCanonicalDocument.js";
import type { SystemGameDefinition } from "../src/modules/game/domain/gameDefinition.js";
import { GAME_MANIFESTS } from "../src/index.js";

function creatorDoc(
  overrides: Partial<CreatorGameCanonicalDocument> = {},
): CreatorGameCanonicalDocument {
  return {
    schemaVersion: CREATOR_GAME_DEFINITION_SCHEMA_VERSION,
    slug: "my-creator-game",
    title: "My Creator Game",
    shortDescription: "short",
    description: "long",
    genre: "puzzle",
    mode: "single",
    policy: {
      score: { unit: "pts", direction: "desc", min: 0, max: 100, displayPrefix: "P:" },
      leaderboard: true,
      xpPerCompletion: 25,
      requiresAuth: false,
    },
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ── Creator -> generic ────────────────────────────────────────────────────────

test("creator->generic: title/shortDescription/description/genre/mode are lossless", () => {
  const source = creatorDoc();
  const result = creatorCanonicalDocumentToGameCanonicalDocument(source);

  assert.equal(result.title, source.title);
  assert.equal(result.shortDescription, source.shortDescription);
  assert.equal(result.description, source.description);
  assert.deepEqual(result.catalog, { type: "GENRE_MODE", genre: "puzzle", mode: "single" });
});

test("creator->generic: policy (score, leaderboard, xpPerCompletion, requiresAuth) is lossless", () => {
  const source = creatorDoc();
  const result = creatorCanonicalDocumentToGameCanonicalDocument(source);
  assert.deepEqual(result.policy, source.policy);
});

test("creator->generic: requiresAuth=false is preserved exactly, not recomputed", () => {
  const source = creatorDoc({
    policy: { score: null, leaderboard: false, xpPerCompletion: 0, requiresAuth: false },
  });
  const result = creatorCanonicalDocumentToGameCanonicalDocument(source);
  assert.equal(result.policy.requiresAuth, false);
});

test("creator->generic: leaderboard=true is preserved exactly", () => {
  const source = creatorDoc();
  const result = creatorCanonicalDocumentToGameCanonicalDocument(source);
  assert.equal(result.policy.leaderboard, true);
});

test("creator->generic: an explicit score:null is preserved, never coerced into an empty ScoreConfig", () => {
  const source = creatorDoc({
    policy: { score: null, leaderboard: false, xpPerCompletion: 0, requiresAuth: false },
  });
  const result = creatorCanonicalDocumentToGameCanonicalDocument(source);
  assert.equal(result.policy.score, null);
});

test("creator->generic: decimal score bounds and display strings are preserved without truncation", () => {
  const source = creatorDoc({
    policy: {
      score: { unit: "s", direction: "asc", min: 0.5, max: 99.9, displaySuffix: " ms" },
      leaderboard: true,
      xpPerCompletion: 10,
      requiresAuth: false,
    },
  });
  const result = creatorCanonicalDocumentToGameCanonicalDocument(source);
  assert.deepEqual(result.policy.score, {
    unit: "s",
    direction: "asc",
    min: 0.5,
    max: 99.9,
    displaySuffix: " ms",
  });
});

test("creator->generic: presentation is preserved verbatim when present", () => {
  const presentation = {
    viewport: { mode: "fixed" as const, preferredWidth: 640, preferredHeight: 360 },
    fullscreen: { supported: true, recommended: false },
    mobile: { support: "unsupported" as const },
  };
  const source = creatorDoc({ presentation });
  const result = creatorCanonicalDocumentToGameCanonicalDocument(source);
  assert.deepEqual(result.presentation, presentation);
});

test("creator->generic: presentation is omitted (undefined) when the source has none", () => {
  const source = creatorDoc();
  const result = creatorCanonicalDocumentToGameCanonicalDocument(source);
  assert.equal(result.presentation, undefined);
});

test("creator->generic: difficulty is always undefined — Creator canonical has no such concept to lose", () => {
  const source = creatorDoc();
  const result = creatorCanonicalDocumentToGameCanonicalDocument(source);
  assert.equal(result.difficulty, undefined);
});

test("creator->generic: supportsReplay is explicitly false — a restated platform fact, not a fabricated default", () => {
  const source = creatorDoc();
  const result = creatorCanonicalDocumentToGameCanonicalDocument(source);
  assert.equal(result.supportsReplay, false);
});

test("creator->generic: updatedAt is copied exactly, never regenerated", () => {
  const source = creatorDoc({ updatedAt: "2020-06-15T12:34:56.000Z" });
  const result = creatorCanonicalDocumentToGameCanonicalDocument(source);
  assert.equal(result.updatedAt, "2020-06-15T12:34:56.000Z");
});

test("creator->generic: mode multi carries through the GENRE_MODE catalog verbatim", () => {
  const source = creatorDoc({ mode: "multi" });
  const result = creatorCanonicalDocumentToGameCanonicalDocument(source);
  assert.equal(result.catalog.type, "GENRE_MODE");
  if (result.catalog.type === "GENRE_MODE") {
    assert.equal(result.catalog.mode, "multi");
  }
});

// ── SYSTEM -> generic ─────────────────────────────────────────────────────────

function systemDefinitionFromManifest(slug: string): SystemGameDefinition {
  const manifest = GAME_MANIFESTS.find((m) => m.slug === slug);
  assert.ok(manifest, `expected a real built-in manifest for ${slug}`);
  return {
    slug: manifest.slug,
    owner: { type: "SYSTEM" },
    title: manifest.title,
    shortDescription: manifest.shortDescription,
    description: manifest.description,
    status: manifest.status,
    categories: manifest.categories,
    tags: manifest.tags,
    modes: manifest.modes,
    inputMethods: manifest.inputMethods,
    minPlayers: manifest.minPlayers,
    maxPlayers: manifest.maxPlayers,
    thumbnail: manifest.thumbnail,
    ...(manifest.accent !== undefined ? { accent: manifest.accent } : {}),
    ...(manifest.estimatedRoundSeconds !== undefined
      ? { estimatedRoundSeconds: manifest.estimatedRoundSeconds }
      : {}),
    ...(manifest.difficulty !== undefined ? { difficulty: manifest.difficulty } : {}),
    supportsReplay: manifest.supportsReplay,
    ...(manifest.presentation !== undefined ? { presentation: manifest.presentation } : {}),
    policy: {
      score: manifest.scoreConfig ?? null,
      leaderboard: manifest.supportsLeaderboard,
      xpPerCompletion: 0,
      requiresAuth: manifest.requiresAuth,
    },
  };
}

test("system->generic: categories/tags/modes/inputMethods are lossless", () => {
  const definition = systemDefinitionFromManifest(GAME_MANIFESTS[0]!.slug);
  const result = systemGameDefinitionToGameCanonicalDocument(
    definition,
    "2026-01-01T00:00:00.000Z",
  );

  assert.equal(result.catalog.type, "TAXONOMY");
  if (result.catalog.type === "TAXONOMY") {
    assert.deepEqual(result.catalog.categories, definition.categories);
    assert.deepEqual(result.catalog.tags, definition.tags);
    assert.deepEqual(result.catalog.modes, definition.modes);
    assert.deepEqual(result.catalog.inputMethods, definition.inputMethods);
  }
});

test("system->generic: minPlayers/maxPlayers/thumbnail/accent are lossless", () => {
  const definition: SystemGameDefinition = {
    ...systemDefinitionFromManifest(GAME_MANIFESTS[0]!.slug),
    minPlayers: 1,
    maxPlayers: 4,
    thumbnail: "/thumb.svg",
    accent: "#abcdef",
  };
  const result = systemGameDefinitionToGameCanonicalDocument(
    definition,
    "2026-01-01T00:00:00.000Z",
  );

  assert.equal(result.catalog.type, "TAXONOMY");
  if (result.catalog.type === "TAXONOMY") {
    assert.equal(result.catalog.minPlayers, 1);
    assert.equal(result.catalog.maxPlayers, 4);
    assert.equal(result.catalog.thumbnail, "/thumb.svg");
    assert.equal(result.catalog.accent, "#abcdef");
  }
});

test("system->generic: difficulty and supportsReplay are lossless", () => {
  const difficulty = {
    levels: [
      { id: "normal", label: "Normal" },
      { id: "hard", label: "Hard" },
    ],
    defaultLevelId: "normal",
  };
  const definition: SystemGameDefinition = {
    ...systemDefinitionFromManifest(GAME_MANIFESTS[0]!.slug),
    difficulty,
    supportsReplay: false,
  };
  const result = systemGameDefinitionToGameCanonicalDocument(
    definition,
    "2026-01-01T00:00:00.000Z",
  );
  assert.deepEqual(result.difficulty, difficulty);
  assert.equal(result.supportsReplay, false);
});

test("system->generic: policy and presentation are lossless", () => {
  const presentation = {
    viewport: { mode: "responsive" as const },
    fullscreen: { supported: false },
    mobile: { support: "supported" as const, orientation: "any" as const },
  };
  const definition: SystemGameDefinition = {
    ...systemDefinitionFromManifest(GAME_MANIFESTS[0]!.slug),
    presentation,
    policy: {
      score: { unit: "pts", direction: "desc", min: 0, max: 999 },
      leaderboard: true,
      xpPerCompletion: 5,
      requiresAuth: false,
    },
  };
  const result = systemGameDefinitionToGameCanonicalDocument(
    definition,
    "2026-01-01T00:00:00.000Z",
  );
  assert.deepEqual(result.presentation, presentation);
  assert.deepEqual(result.policy, definition.policy);
});

test("system->generic: definition.status never leaks into the canonical document", () => {
  const definition: SystemGameDefinition = {
    ...systemDefinitionFromManifest(GAME_MANIFESTS[0]!.slug),
    status: "beta",
  };
  const result = systemGameDefinitionToGameCanonicalDocument(
    definition,
    "2026-01-01T00:00:00.000Z",
  );
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes("beta"));
  assert.ok(!("status" in result));
});

test("system->generic: updatedAt is exactly the caller-supplied timestamp, never generated internally", () => {
  const definition = systemDefinitionFromManifest(GAME_MANIFESTS[0]!.slug);
  const result = systemGameDefinitionToGameCanonicalDocument(
    definition,
    "2019-03-03T03:03:03.000Z",
  );
  assert.equal(result.updatedAt, "2019-03-03T03:03:03.000Z");
});

test("system->generic: title/shortDescription/description are lossless", () => {
  const definition = systemDefinitionFromManifest(GAME_MANIFESTS[0]!.slug);
  const result = systemGameDefinitionToGameCanonicalDocument(
    definition,
    "2026-01-01T00:00:00.000Z",
  );
  assert.equal(result.title, definition.title);
  assert.equal(result.shortDescription, definition.shortDescription);
  assert.equal(result.description, definition.description);
});
