import test from "node:test";
import assert from "node:assert/strict";
import type { GameManifest } from "@owogg/game-sdk/contracts";
import {
  GAME_MANIFESTS,
  GAME_OWNER_TYPES,
  isCreatorOwned,
  isScored,
  isValidGameOwnerType,
  type GameDefinition,
  type GameOwner,
} from "../src/index.js";

/**
 * The Unified Game Platform foundation added in this PR is types plus one port — nothing produces
 * a GameDefinition yet. What is worth pinning down now is the claim the next PR depends on: that a
 * GameDefinition can carry everything today's built-in GameManifest carries. If that stops being
 * true, the file-based registry would start by silently dropping catalog metadata.
 *
 * This is not the migration adapter (that belongs with the registry itself) — it is the smallest
 * thing that fails when the shapes drift apart.
 */
function asDefinition(manifest: GameManifest, owner: GameOwner): GameDefinition {
  return {
    slug: manifest.slug,
    owner,
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
    accent: manifest.accent,
    estimatedRoundSeconds: manifest.estimatedRoundSeconds,
    difficulty: manifest.difficulty,
    supportsReplay: manifest.supportsReplay,
    policy: {
      score: manifest.scoreConfig ?? null,
      leaderboard: manifest.supportsLeaderboard,
      // XP is an operator decision that lives nowhere in GameManifest today (it is applied by
      // progression rules, and starts at 0 for creator games) — the one field a definition adds
      // rather than carries over.
      xpPerCompletion: 0,
      requiresAuth: manifest.requiresAuth,
    },
  };
}

test("every shipped built-in manifest is expressible as a GameDefinition without loss", () => {
  assert.ok(GAME_MANIFESTS.length > 0, "the generated registry should not be empty");

  for (const manifest of GAME_MANIFESTS) {
    const definition = asDefinition(manifest, { type: "SYSTEM" });

    assert.equal(definition.slug, manifest.slug);
    assert.equal(definition.title, manifest.title);
    assert.deepEqual(definition.categories, manifest.categories);
    assert.deepEqual(definition.modes, manifest.modes);
    assert.deepEqual(definition.inputMethods, manifest.inputMethods);
    assert.equal(definition.policy.leaderboard, manifest.supportsLeaderboard);
    assert.equal(definition.policy.requiresAuth, manifest.requiresAuth);
    assert.deepEqual(definition.policy.score, manifest.scoreConfig ?? null);
    assert.deepEqual(definition.difficulty, manifest.difficulty);
  }
});

test("a manifest's id and slug agree today, which is why a definition keeps only slug", () => {
  // GameDefinition drops `id` deliberately: slug is what scores, favorites and recent-plays are
  // keyed by. That is only safe while the two are interchangeable for every shipped game.
  for (const manifest of GAME_MANIFESTS) {
    assert.equal(manifest.id, manifest.slug, `${manifest.slug} has diverging id/slug`);
  }
});

test("built-in games carry a score policy, so score validation has something to read", () => {
  const scored = GAME_MANIFESTS.filter((m) => m.scoreConfig).map((m) =>
    asDefinition(m, { type: "SYSTEM" }),
  );
  assert.ok(scored.length > 0);
  for (const definition of scored) {
    assert.ok(isScored(definition));
    assert.ok(definition.policy.score);
    assert.ok(definition.policy.score.min < definition.policy.score.max);
  }
});

test("owner is a discriminated union, not a free-text marker", () => {
  const system: GameOwner = { type: "SYSTEM" };
  const creator: GameOwner = { type: "CREATOR", userId: 42 };

  assert.equal(isCreatorOwned(system), false);
  assert.equal(isCreatorOwned(creator), true);
  // Narrowing is what replaces `manifest.version === "sandbox"` in the web catalog.
  if (isCreatorOwned(creator)) assert.equal(creator.userId, 42);
});

test("only SYSTEM and CREATOR are owner types — sandbox is not a kind of game", () => {
  assert.deepEqual([...GAME_OWNER_TYPES], ["SYSTEM", "CREATOR"]);
  assert.ok(isValidGameOwnerType("SYSTEM"));
  assert.ok(isValidGameOwnerType("CREATOR"));
  assert.ok(!isValidGameOwnerType("SANDBOX"));
  assert.ok(!isValidGameOwnerType(undefined));
});
