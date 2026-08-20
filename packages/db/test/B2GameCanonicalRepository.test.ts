import test from "node:test";
import assert from "node:assert/strict";
import type { GameBundleStorageRepository, GameCanonicalDocument } from "@owogg/core";
import { GAME_CANONICAL_SCHEMA_VERSION, gameCanonicalObjectKey } from "@owogg/core";
// Imported through this package's own public entrypoint (../src/index.js — exactly what
// packages/db/package.json's "." export points to), not by direct path to
// storage/B2GameCanonicalRepository.js. This is deliberate: it's what actually proves
// `import { B2GameCanonicalRepository } from "@owogg/db"` works for a real external consumer (a
// future Stage's container wiring) — a direct-path import would still compile even if this class
// were missing from src/index.ts entirely, which is exactly the gap that let that omission ship
// unnoticed once already.
import { B2GameCanonicalRepository } from "../src/index.js";

/**
 * No real B2 network anywhere here — a fake, in-memory GameBundleStorageRepository stands in for
 * whatever real storage backs it (Backblaze B2 in production). Fail-closed parsing itself is
 * already covered exhaustively in packages/core/test/gameCanonicalDocument.test.ts with plain
 * strings; these tests are about the ADAPTER's own composition — that it stores at the right key,
 * decodes bytes correctly, treats a 404 as null, rejects an invalid document BEFORE ever calling
 * putObject, and propagates (never swallows) everything else the parser or the underlying storage
 * itself can throw.
 */

function createFakeStorage(): GameBundleStorageRepository & {
  objects: Map<string, { bytes: Uint8Array; contentType: string }>;
  putCalls: number;
  failGetContaining?: string;
} {
  return {
    objects: new Map(),
    putCalls: 0,
    async putObject(input) {
      this.putCalls++;
      const raw =
        input.bytes instanceof Uint8Array
          ? input.bytes
          : new Uint8Array(input.bytes as ArrayBuffer);
      this.objects.set(input.key, { bytes: raw, contentType: input.contentType });
    },
    async getObject(key) {
      if (this.failGetContaining && key.includes(this.failGetContaining)) {
        throw new Error(`simulated storage failure for ${key}`);
      }
      const found = this.objects.get(key);
      return found ? found.bytes.buffer.slice(0) : null;
    },
    async deleteObject(key) {
      this.objects.delete(key);
    },
  };
}

function genreModeDoc(overrides: Partial<GameCanonicalDocument> = {}): GameCanonicalDocument {
  return {
    schemaVersion: GAME_CANONICAL_SCHEMA_VERSION,
    slug: "my-game",
    title: "My Game",
    shortDescription: "short",
    description: "long",
    policy: {
      score: { unit: "pts", direction: "desc", min: 0, max: 100 },
      leaderboard: true,
      xpPerCompletion: 10,
      requiresAuth: false,
    },
    supportsReplay: false,
    catalog: { type: "GENRE_MODE", genre: "puzzle", mode: "single" },
    updatedAt: "2026-08-20T00:00:00.000Z",
    ...overrides,
  };
}

function taxonomyDoc(overrides: Partial<GameCanonicalDocument> = {}): GameCanonicalDocument {
  return {
    schemaVersion: GAME_CANONICAL_SCHEMA_VERSION,
    slug: "system-game",
    title: "System Game",
    shortDescription: "short",
    description: "long",
    policy: {
      score: { unit: "pts", direction: "desc", min: 0, max: 100 },
      leaderboard: true,
      xpPerCompletion: 0,
      requiresAuth: false,
    },
    supportsReplay: false,
    catalog: {
      type: "TAXONOMY",
      categories: ["aim", "reaction"],
      tags: ["에임"],
      modes: ["single"],
      inputMethods: ["mouse", "touch"],
      minPlayers: 1,
      maxPlayers: 1,
      thumbnail: "/thumb.svg",
    },
    updatedAt: "2026-08-20T00:00:00.000Z",
    ...overrides,
  };
}

test("findBySlug returns null for a slug with nothing ever written — a plain 404, not an error", async () => {
  const storage = createFakeStorage();
  const repo = new B2GameCanonicalRepository(storage);
  assert.equal(await repo.findBySlug("never-written"), null);
});

test("findBySlug reads at the deterministic gameCanonicalObjectKey, not any other prefix", async () => {
  const storage = createFakeStorage();
  const repo = new B2GameCanonicalRepository(storage);
  const doc = genreModeDoc();
  await repo.save(doc);

  assert.ok(storage.objects.has(gameCanonicalObjectKey(doc.slug)));
  assert.ok(!storage.objects.has(`creator-games/${doc.slug}/definition.json`));
});

test("save writes a valid GENRE_MODE document and findBySlug reads it back", async () => {
  const storage = createFakeStorage();
  const repo = new B2GameCanonicalRepository(storage);
  const doc = genreModeDoc();

  await repo.save(doc);

  const stored = storage.objects.get(gameCanonicalObjectKey(doc.slug));
  assert.ok(stored, "expected an object at the deterministic key");
  assert.equal(stored!.contentType, "application/json");

  const found = await repo.findBySlug(doc.slug);
  assert.deepEqual(found, doc);
});

test("save writes a valid TAXONOMY document and findBySlug reads it back", async () => {
  const storage = createFakeStorage();
  const repo = new B2GameCanonicalRepository(storage);
  const doc = taxonomyDoc();

  await repo.save(doc);
  const found = await repo.findBySlug(doc.slug);
  assert.deepEqual(found, doc);
});

test("decimal score bounds survive a save/findBySlug round-trip without truncation", async () => {
  const storage = createFakeStorage();
  const repo = new B2GameCanonicalRepository(storage);
  const doc = genreModeDoc({
    policy: {
      score: { unit: "s", direction: "asc", min: 0.25, max: 10.75 },
      leaderboard: true,
      xpPerCompletion: 1,
      requiresAuth: false,
    },
  });

  await repo.save(doc);
  const found = await repo.findBySlug(doc.slug);
  assert.equal(found?.policy.score?.min, 0.25);
  assert.equal(found?.policy.score?.max, 10.75);
});

test("score:null (with leaderboard:false) is a valid document that round-trips as explicitly unscored", async () => {
  const storage = createFakeStorage();
  const repo = new B2GameCanonicalRepository(storage);
  const doc = genreModeDoc({
    policy: { score: null, leaderboard: false, xpPerCompletion: 0, requiresAuth: false },
  });

  await repo.save(doc);
  const found = await repo.findBySlug(doc.slug);
  assert.equal(found?.policy.score, null);
});

test("save overwrites whatever previously existed at the same slug", async () => {
  const storage = createFakeStorage();
  const repo = new B2GameCanonicalRepository(storage);
  const v1 = genreModeDoc({ title: "Version 1" });
  const v2 = genreModeDoc({ title: "Version 2" });

  await repo.save(v1);
  await repo.save(v2);

  const found = await repo.findBySlug(v1.slug);
  assert.equal(found?.title, "Version 2");
});

test("delete removes the document; a second delete is a no-op, not an error", async () => {
  const storage = createFakeStorage();
  const repo = new B2GameCanonicalRepository(storage);
  const doc = genreModeDoc();
  await repo.save(doc);

  await repo.delete(doc.slug);
  assert.equal(await repo.findBySlug(doc.slug), null);

  // Idempotent — matches GameBundleStorageRepository.deleteObject's own 404-is-success contract.
  await assert.doesNotReject(() => repo.delete(doc.slug));
});

test("malformed stored JSON propagates as a thrown error, never a silent null", async () => {
  const storage = createFakeStorage();
  const repo = new B2GameCanonicalRepository(storage);
  storage.objects.set(gameCanonicalObjectKey("broken"), {
    bytes: new TextEncoder().encode("{not valid json"),
    contentType: "application/json",
  });

  await assert.rejects(() => repo.findBySlug("broken"), /MALFORMED_JSON/);
});

test("a stored document for a different slug than requested (key collision/corruption) propagates SLUG_MISMATCH", async () => {
  const storage = createFakeStorage();
  const repo = new B2GameCanonicalRepository(storage);
  const doc = genreModeDoc({ slug: "actual-slug" });
  storage.objects.set(gameCanonicalObjectKey("requested-slug"), {
    bytes: new TextEncoder().encode(JSON.stringify(doc)),
    contentType: "application/json",
  });

  await assert.rejects(() => repo.findBySlug("requested-slug"), /SLUG_MISMATCH/);
});

test("an underlying storage failure on read propagates, not swallowed into null", async () => {
  const storage = createFakeStorage();
  storage.failGetContaining = "flaky";
  const repo = new B2GameCanonicalRepository(storage);

  await assert.rejects(() => repo.findBySlug("flaky-game"), /simulated storage failure/);
});

// ── save-time validation ────────────────────────────────────────────────────

test("save rejects score.min === score.max BEFORE calling putObject", async () => {
  const storage = createFakeStorage();
  const repo = new B2GameCanonicalRepository(storage);
  const doc = genreModeDoc({
    policy: {
      score: { unit: "pts", direction: "desc", min: 100, max: 100 },
      leaderboard: true,
      xpPerCompletion: 0,
      requiresAuth: false,
    },
  });

  await assert.rejects(() => repo.save(doc), /INVALID_DOCUMENT/);
  assert.equal(storage.putCalls, 0, "an invalid document must never reach storage.putObject");
  assert.equal(await repo.findBySlug(doc.slug), null);
});

test("save rejects score:null combined with leaderboard:true BEFORE calling putObject", async () => {
  const storage = createFakeStorage();
  const repo = new B2GameCanonicalRepository(storage);
  const doc = genreModeDoc({
    policy: { score: null, leaderboard: true, xpPerCompletion: 0, requiresAuth: false },
  });

  await assert.rejects(() => repo.save(doc), /INVALID_DOCUMENT/);
  assert.equal(storage.putCalls, 0);
});

test("save rejects an out-of-range xpPerCompletion BEFORE calling putObject", async () => {
  const storage = createFakeStorage();
  const repo = new B2GameCanonicalRepository(storage);
  const doc = genreModeDoc({
    policy: {
      score: { unit: "pts", direction: "desc", min: 0, max: 100 },
      leaderboard: true,
      xpPerCompletion: 100_001,
      requiresAuth: false,
    },
  });

  await assert.rejects(() => repo.save(doc), /INVALID_DOCUMENT/);
  assert.equal(storage.putCalls, 0);
});
