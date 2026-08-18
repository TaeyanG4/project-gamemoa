import test from "node:test";
import assert from "node:assert/strict";
import { resolveGameSource } from "../features/game/transitionalCreatorGameResolver";
import type { PublicCreatorGame, PublicSystemGame } from "@owogg/contracts";

/**
 * resolveGameSource is the pure half of transitionalCreatorGameResolver.ts — no React, no DOM —
 * so it's exercised directly here against fake `isSystemSlug`/`fetchPublicGame`. The React hook
 * wrapping it (useGameSourceResolution) is not covered by an automated test: this test suite has
 * no DOM renderer, same honest-scoping call as GameHost/CreatorGameHost themselves.
 */

const creatorGame: PublicCreatorGame = {
  ownerType: "CREATOR",
  slug: "ball-dodge",
  title: "공 피하기",
  shortDescription: null,
  description: null,
  genre: "arcade",
  mode: "single",
  hasLogo: true,
  requiresAuth: false,
  supportsLeaderboard: false,
};

const systemGame: PublicSystemGame = {
  ownerType: "SYSTEM",
  slug: "reaction-time",
  title: "Reaction Time",
  shortDescription: "",
  description: "",
  status: "published",
  categories: [],
  tags: [],
  modes: ["single"],
  inputMethods: ["mouse"],
  minPlayers: 1,
  maxPlayers: 1,
  thumbnail: "",
  requiresAuth: false,
  supportsLeaderboard: true,
};

test("a SYSTEM slug resolves to kind:system without ever calling fetchPublicGame", async () => {
  let fetchCalls = 0;
  const result = await resolveGameSource("reaction-time", {
    isSystemSlug: (slug) => slug === "reaction-time",
    fetchPublicGame: async () => {
      fetchCalls += 1;
      throw new Error("must not be called");
    },
  });

  assert.deepEqual(result, { status: "resolved", kind: "system" });
  assert.equal(fetchCalls, 0);
});

test("a non-SYSTEM slug that resolves to a CREATOR game returns kind:creator with the game payload", async () => {
  const result = await resolveGameSource("ball-dodge", {
    isSystemSlug: () => false,
    fetchPublicGame: async (slug) => {
      assert.equal(slug, "ball-dodge");
      return creatorGame;
    },
  });

  assert.deepEqual(result, { status: "resolved", kind: "creator", game: creatorGame });
});

test("a fetch rejection (404 or otherwise) resolves to kind:not_found, never throws", async () => {
  await assert.doesNotReject(async () => {
    const result = await resolveGameSource("no-such-game", {
      isSystemSlug: () => false,
      fetchPublicGame: async () => {
        throw new Error("HTTP 404");
      },
    });
    assert.deepEqual(result, { status: "resolved", kind: "not_found" });
  });
});

test("a defensive case — the API disagrees and says SYSTEM for a slug isSystemSlug missed — still resolves to kind:system, not creator", async () => {
  const result = await resolveGameSource("some-slug", {
    isSystemSlug: () => false,
    fetchPublicGame: async () => systemGame,
  });

  assert.deepEqual(result, { status: "resolved", kind: "system" });
});
