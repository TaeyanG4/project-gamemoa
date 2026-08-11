import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { manifest } from "../src/manifest.js";

describe("reaction-time manifest", () => {
  it("should have correct id and slug", () => {
    assert.equal(manifest.id, "reaction-time");
    assert.equal(manifest.slug, "reaction-time");
  });

  it("should be single player", () => {
    assert.ok(manifest.modes.includes("single"));
    assert.equal(manifest.minPlayers, 1);
    assert.equal(manifest.maxPlayers, 1);
  });

  it("should be published", () => {
    assert.equal(manifest.status, "published");
  });

  it("should support leaderboard", () => {
    assert.equal(manifest.supportsLeaderboard, true);
  });

  it("should not require auth", () => {
    assert.equal(manifest.requiresAuth, false);
  });
});
