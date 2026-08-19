import test from "node:test";
import assert from "node:assert/strict";
import {
  systemGameSourceArchiveObjectKey,
  systemGamePublishedVersionPrefix,
  systemGamePublishedObjectKey,
  systemGamePublishedManifestObjectKey,
  buildSystemGameBundleManifest,
} from "../src/domain/systemGameBundle.js";
import { PUBLISHED_MANIFEST_FILENAME } from "../src/domain/sandboxGameBundle.js";
import type { PreparedBundle } from "../src/domain/sandboxGameBundle.js";

// Pure key-layout/manifest tests, mirroring sandboxGameBundle.test.ts's own style for the
// SYSTEM-game counterpart. See systemGameBundle.ts's own doc comment for why identity here is
// (slug, version) — plain strings — rather than Creator's (gameId, versionId) D1 integers.

test("source archive key is content-addressed under a slug, distinct from Creator's uploads/ prefix", () => {
  const key = systemGameSourceArchiveObjectKey("reaction-time", "abc123");
  assert.equal(key, "official-uploads/reaction-time/abc123.zip");
  assert.ok(!key.startsWith("uploads/"));
});

test("published version prefix and object keys are namespaced under official-games/, distinct from Creator's games/ prefix", () => {
  const prefix = systemGamePublishedVersionPrefix("reaction-time", "abc123");
  assert.equal(prefix, "official-games/reaction-time/abc123/");
  assert.ok(!prefix.startsWith("games/"));

  const objectKey = systemGamePublishedObjectKey("reaction-time", "abc123", "index.html");
  assert.equal(objectKey, "official-games/reaction-time/abc123/index.html");

  const nestedKey = systemGamePublishedObjectKey("reaction-time", "abc123", "assets/sound.mp3");
  assert.equal(nestedKey, "official-games/reaction-time/abc123/assets/sound.mp3");
});

test("the manifest key uses the same reserved filename Creator publishes use, and sits inside the version prefix", () => {
  const key = systemGamePublishedManifestObjectKey("reaction-time", "abc123");
  assert.equal(key, `official-games/reaction-time/abc123/${PUBLISHED_MANIFEST_FILENAME}`);
});

test("different slugs or different versions of the same slug never share a prefix", () => {
  const a = systemGamePublishedVersionPrefix("reaction-time", "hash-1");
  const b = systemGamePublishedVersionPrefix("aim-test", "hash-1");
  const c = systemGamePublishedVersionPrefix("reaction-time", "hash-2");
  assert.notEqual(a, b);
  assert.notEqual(a, c);
});

test("buildSystemGameBundleManifest carries slug/version/entry/sizes through from the prepared bundle", () => {
  const prepared: PreparedBundle = {
    entry: "index.html",
    totalSize: 42,
    files: [
      {
        path: "index.html",
        bytes: new Uint8Array(30),
        contentType: "text/html; charset=utf-8",
      },
      {
        path: "game.js",
        bytes: new Uint8Array(12),
        contentType: "application/javascript; charset=utf-8",
      },
    ],
  };

  const manifest = buildSystemGameBundleManifest({
    slug: "reaction-time",
    version: "abc123",
    prepared,
    publishedAt: "2026-08-19T00:00:00.000Z",
  });

  assert.equal(manifest.slug, "reaction-time");
  assert.equal(manifest.version, "abc123");
  assert.equal(manifest.entry, "index.html");
  assert.equal(manifest.fileCount, 2);
  assert.equal(manifest.totalSize, 42);
  assert.equal(manifest.publishedAt, "2026-08-19T00:00:00.000Z");
  assert.deepEqual(
    manifest.files.map((f) => f.path),
    ["index.html", "game.js"],
  );
  assert.equal(manifest.files[0]?.size, 30);
  assert.equal(manifest.files[1]?.contentType, "application/javascript; charset=utf-8");
});
