import test from "node:test";
import assert from "node:assert/strict";
import type { GameBundleStorageRepository, CreatorGameCanonicalDocument } from "@owogg/core";
import {
  CREATOR_GAME_DEFINITION_SCHEMA_VERSION,
  creatorGameDefinitionObjectKey,
} from "@owogg/core";
import { B2CreatorGameDefinitionRepository } from "../src/storage/B2CreatorGameDefinitionRepository.js";

/**
 * No real B2 network anywhere here — a fake, in-memory GameBundleStorageRepository stands in for
 * whatever real storage backs it (Backblaze B2 in production). Fail-closed parsing itself is
 * already covered exhaustively in packages/core/test/creatorGameCanonicalDocument.test.ts with
 * plain strings; these tests are about the ADAPTER's own composition — that it stores at the
 * right key, decodes bytes correctly, treats a 404 as null, and propagates (never swallows)
 * everything else the parser or the underlying storage itself can throw.
 */

function createFakeStorage(): GameBundleStorageRepository & {
  objects: Map<string, { bytes: Uint8Array; contentType: string }>;
  failGetContaining?: string;
} {
  return {
    objects: new Map(),
    async putObject(input) {
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

function validDocument(
  overrides: Partial<CreatorGameCanonicalDocument> = {},
): CreatorGameCanonicalDocument {
  return {
    schemaVersion: CREATOR_GAME_DEFINITION_SCHEMA_VERSION,
    slug: "my-cool-game",
    title: "My Cool Game",
    shortDescription: "A short description",
    description: "A longer description of the game.",
    genre: "puzzle",
    mode: "single",
    policy: {
      score: { unit: "pts", direction: "desc", min: 0, max: 1000 },
      leaderboard: true,
      xpPerCompletion: 0,
      requiresAuth: false,
    },
    updatedAt: "2026-08-20T00:00:00.000Z",
    ...overrides,
  };
}

test("findBySlug returns null for a slug with nothing ever written — a plain 404, not an error", async () => {
  const storage = createFakeStorage();
  const repo = new B2CreatorGameDefinitionRepository(storage);
  assert.equal(await repo.findBySlug("never-written"), null);
});

test("save writes to the deterministic key with Content-Type: application/json, and findBySlug reads it back", async () => {
  const storage = createFakeStorage();
  const repo = new B2CreatorGameDefinitionRepository(storage);
  const doc = validDocument();

  await repo.save(doc);

  const stored = storage.objects.get(creatorGameDefinitionObjectKey(doc.slug));
  assert.ok(stored, "expected an object at the deterministic key");
  assert.equal(stored!.contentType, "application/json");

  const found = await repo.findBySlug(doc.slug);
  assert.deepEqual(found, doc);
});

test("save overwrites whatever previously existed at the same slug", async () => {
  const storage = createFakeStorage();
  const repo = new B2CreatorGameDefinitionRepository(storage);
  const v1 = validDocument({ title: "Version 1" });
  const v2 = validDocument({ title: "Version 2" });

  await repo.save(v1);
  await repo.save(v2);

  const found = await repo.findBySlug(v1.slug);
  assert.equal(found?.title, "Version 2");
});

test("delete removes the document; a second delete is a no-op, not an error", async () => {
  const storage = createFakeStorage();
  const repo = new B2CreatorGameDefinitionRepository(storage);
  const doc = validDocument();
  await repo.save(doc);

  await repo.delete(doc.slug);
  assert.equal(await repo.findBySlug(doc.slug), null);

  // Idempotent — matches GameBundleStorageRepository.deleteObject's own 404-is-success contract.
  await assert.doesNotReject(() => repo.delete(doc.slug));
});

test("malformed stored JSON propagates as a thrown error, never a silent null", async () => {
  const storage = createFakeStorage();
  const repo = new B2CreatorGameDefinitionRepository(storage);
  storage.objects.set(creatorGameDefinitionObjectKey("broken"), {
    bytes: new TextEncoder().encode("{not valid json"),
    contentType: "application/json",
  });

  await assert.rejects(() => repo.findBySlug("broken"), /MALFORMED_JSON/);
});

test("a stored document for a different slug than requested (key collision/corruption) propagates SLUG_MISMATCH", async () => {
  const storage = createFakeStorage();
  const repo = new B2CreatorGameDefinitionRepository(storage);
  const doc = validDocument({ slug: "actual-slug" });
  // Simulates the object at "requested-slug"'s key somehow holding "actual-slug"'s bytes.
  storage.objects.set(creatorGameDefinitionObjectKey("requested-slug"), {
    bytes: new TextEncoder().encode(JSON.stringify(doc)),
    contentType: "application/json",
  });

  await assert.rejects(() => repo.findBySlug("requested-slug"), /SLUG_MISMATCH/);
});

test("an unsupported schemaVersion in the stored document propagates as a thrown error", async () => {
  const storage = createFakeStorage();
  const repo = new B2CreatorGameDefinitionRepository(storage);
  const raw = { ...validDocument(), schemaVersion: 99 };
  storage.objects.set(creatorGameDefinitionObjectKey(raw.slug), {
    bytes: new TextEncoder().encode(JSON.stringify(raw)),
    contentType: "application/json",
  });

  await assert.rejects(() => repo.findBySlug(raw.slug), /UNSUPPORTED_SCHEMA_VERSION/);
});

test("an invalid document shape in storage propagates as a thrown error", async () => {
  const storage = createFakeStorage();
  const repo = new B2CreatorGameDefinitionRepository(storage);
  storage.objects.set(creatorGameDefinitionObjectKey("garbage"), {
    bytes: new TextEncoder().encode(JSON.stringify({ schemaVersion: 1, slug: "garbage" })),
    contentType: "application/json",
  });

  await assert.rejects(() => repo.findBySlug("garbage"), /INVALID_DOCUMENT/);
});

test("an underlying storage failure on read propagates, not swallowed into null", async () => {
  const storage = createFakeStorage();
  storage.failGetContaining = "flaky";
  const repo = new B2CreatorGameDefinitionRepository(storage);

  await assert.rejects(() => repo.findBySlug("flaky-game"), /simulated storage failure/);
});

test("a deep-invalid stored presentation (e.g. fixed mode with no design resolution) propagates through the adapter, not just the pure parser", async () => {
  const storage = createFakeStorage();
  const repo = new B2CreatorGameDefinitionRepository(storage);
  const raw = {
    ...validDocument(),
    presentation: {
      viewport: { mode: "fixed" }, // missing preferredWidth/preferredHeight
      fullscreen: { supported: false },
      mobile: { support: "unsupported" },
    },
  };
  storage.objects.set(creatorGameDefinitionObjectKey(raw.slug), {
    bytes: new TextEncoder().encode(JSON.stringify(raw)),
    contentType: "application/json",
  });

  await assert.rejects(() => repo.findBySlug(raw.slug), /INVALID_DOCUMENT/);
});
