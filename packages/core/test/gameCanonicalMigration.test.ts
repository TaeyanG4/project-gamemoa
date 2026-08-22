import test from "node:test";
import assert from "node:assert/strict";
import { systemGameDefinitionToGameCanonicalDocument } from "../src/modules/game/domain/gameCanonicalMigration.js";
import type { SystemGameDefinition } from "../src/modules/game/domain/gameDefinition.js";

// ── SYSTEM -> generic ─────────────────────────────────────────────────────────

function systemDefinitionFromManifest(): SystemGameDefinition {
  return {
    slug: "fixture-game",
    owner: { type: "SYSTEM" },
    title: "Fixture Game",
    shortDescription: "Short fixture description",
    description: "Fixture description",
    status: "published",
    categories: ["test"],
    tags: ["fixture"],
    modes: ["single"],
    inputMethods: ["mouse"],
    minPlayers: 1,
    maxPlayers: 1,
    thumbnail: "/fixture.svg",
    supportsReplay: false,
    policy: {
      score: { unit: "pts", direction: "desc", min: 0, max: 999 },
      leaderboard: true,
      xpPerCompletion: 0,
      requiresAuth: false,
    },
  };
}

test("system->generic: categories/tags/modes/inputMethods are lossless", () => {
  const definition = systemDefinitionFromManifest();
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
    ...systemDefinitionFromManifest(),
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
    ...systemDefinitionFromManifest(),
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
    ...systemDefinitionFromManifest(),
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
    ...systemDefinitionFromManifest(),
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
  const definition = systemDefinitionFromManifest();
  const result = systemGameDefinitionToGameCanonicalDocument(
    definition,
    "2019-03-03T03:03:03.000Z",
  );
  assert.equal(result.updatedAt, "2019-03-03T03:03:03.000Z");
});

test("system->generic: title/shortDescription/description are lossless", () => {
  const definition = systemDefinitionFromManifest();
  const result = systemGameDefinitionToGameCanonicalDocument(
    definition,
    "2026-01-01T00:00:00.000Z",
  );
  assert.equal(result.title, definition.title);
  assert.equal(result.shortDescription, definition.shortDescription);
  assert.equal(result.description, definition.description);
});
