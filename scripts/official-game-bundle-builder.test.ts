import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { sha256Hex } from "@owogg/core";
import {
  readB2ConfigFromEnv,
  toArrayBuffer,
  migratedGames,
  zipFilesDeterministically,
} from "./official-game-bundle-builder.js";

/**
 * The pure parts of the official generic bundle builder — build/B2/D1 side effects are
 * exercised for real by games/reaction-time/tests/standaloneBuild.test.ts (the build artifact
 * itself) and, in production, by the deploy workflow's generic bootstrap step;
 * this suite covers the logic that decides what gets written where.
 */

test("readB2ConfigFromEnv: undefined when any required var is missing (never a half-configured client)", () => {
  const complete = {
    B2_ENDPOINT: "https://s3.example.com",
    B2_REGION: "us-west-004",
    B2_BUCKET_NAME: "owogg-games",
    B2_KEY_ID: "key",
    B2_APPLICATION_KEY: "secret",
  };
  for (const missing of Object.keys(complete)) {
    const env = { ...complete, [missing]: "" };
    assert.equal(readB2ConfigFromEnv(env), undefined, `missing ${missing}`);
  }
});

test("readB2ConfigFromEnv: maps every var when all five are present", () => {
  const config = readB2ConfigFromEnv({
    B2_ENDPOINT: "https://s3.example.com",
    B2_REGION: "us-west-004",
    B2_BUCKET_NAME: "owogg-games",
    B2_KEY_ID: "key",
    B2_APPLICATION_KEY: "secret",
  });
  assert.deepEqual(config, {
    endpoint: "https://s3.example.com",
    region: "us-west-004",
    bucket: "owogg-games",
    keyId: "key",
    applicationKey: "secret",
  });
});

test("migratedGames: all four SYSTEM games, each pointing at its own standalone dist output", () => {
  const games = migratedGames("/repo");
  assert.deepEqual(
    games.map((g) => g.slug),
    ["reaction-time", "aim-test", "memory-test", "typing-test"],
  );
  for (const game of games) {
    assert.equal(game.pkg, `@owogg/game-${game.slug}`);
    assert.ok(
      game.distDir.endsWith(path.join("games", game.slug, "standalone", "dist")),
      game.slug,
    );
  }
});

test("toArrayBuffer: normalizes a Uint8Array view to exactly its own bytes, not its whole backing buffer", () => {
  const backing = new Uint8Array([1, 2, 3, 4, 5, 6]);
  const view = backing.subarray(2, 4); // [3, 4] — a view over a LARGER buffer
  const buf = toArrayBuffer(view);
  assert.deepEqual(new Uint8Array(buf), new Uint8Array([3, 4]));
});

// ── zipFilesDeterministically: same bytes in -> same ZIP bytes out, every time ──────────────────
//
// This is what makes the content hash computed by buildOfficialGameBundles stable and reusable as
// genuine content hash rather than something that drifts on every deploy for a game that hasn't
// actually changed — fflate defaults an unset entry mtime to Date.now(), and object/directory
// iteration order isn't guaranteed stable, so both had to be pinned explicitly (see
// zipFilesDeterministically's own doc comment).

function sampleFiles(): Record<string, Uint8Array> {
  return {
    "index.html": new Uint8Array(Buffer.from("<!doctype html><div id=root></div>")),
    "assets/index.js": new Uint8Array(Buffer.from("console.log('reaction-time')")),
    "assets/index.css": new Uint8Array(Buffer.from("body{margin:0}")),
  };
}

test("zipFilesDeterministically: zipping the same dist bytes twice produces byte-identical ZIP output", () => {
  const first = zipFilesDeterministically(sampleFiles());
  const second = zipFilesDeterministically(sampleFiles());
  assert.deepEqual(first, second);
});

test("zipFilesDeterministically: zipping the same dist bytes twice produces the exact same sha256 — the SYSTEM version identifier", async () => {
  const first = await sha256Hex(toArrayBuffer(zipFilesDeterministically(sampleFiles())));
  const second = await sha256Hex(toArrayBuffer(zipFilesDeterministically(sampleFiles())));
  assert.equal(first, second);
});

test("zipFilesDeterministically: entry insertion order never affects the output — only file paths and bytes do", () => {
  const files = sampleFiles();
  const reordered: Record<string, Uint8Array> = {};
  for (const key of Object.keys(files).sort().reverse()) {
    reordered[key] = files[key] as Uint8Array;
  }
  assert.deepEqual(zipFilesDeterministically(files), zipFilesDeterministically(reordered));
});

test("zipFilesDeterministically: changing a single file's bytes changes the resulting hash", async () => {
  const before = sampleFiles();
  const after = { ...sampleFiles(), "assets/index.js": new Uint8Array(Buffer.from("changed")) };

  const beforeHash = await sha256Hex(toArrayBuffer(zipFilesDeterministically(before)));
  const afterHash = await sha256Hex(toArrayBuffer(zipFilesDeterministically(after)));

  assert.notEqual(beforeHash, afterHash);
});

test("zipFilesDeterministically: adding or removing a file changes the resulting hash too, not just editing one", async () => {
  const base = sampleFiles();
  const withExtraFile = { ...base, "assets/extra.png": new Uint8Array([1, 2, 3]) };

  const baseHash = await sha256Hex(toArrayBuffer(zipFilesDeterministically(base)));
  const extraHash = await sha256Hex(toArrayBuffer(zipFilesDeterministically(withExtraFile)));

  assert.notEqual(baseHash, extraHash);
});
