import test from "node:test";
import assert from "node:assert/strict";
import { SystemGameBundlePublisher } from "../src/application/systemGameBundlePublisher.js";
import type {
  GameBundleStorageRepository,
  BundleArchiveReader,
} from "../src/ports/sandboxGames.js";

// Proves build (prepare) -> validate -> publish -> read for a SYSTEM game, entirely without D1 —
// no repo of any kind is injected here, only the two storage/archive ports GameBundlePublisher
// already depends on (see systemGameBundlePublisher.ts's own doc comment for why that's the whole
// point). Real zip bytes/fflate are exercised end-to-end in
// apps/api/test/systemGameBundlePublishSmokeTest.test.ts, mirroring publishPipeline.test.ts's own
// split between "core tests inject archive contents directly" and "apps/api tests use a real zip".

function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

const MINIMAL_BUNDLE: Record<string, Uint8Array> = {
  "index.html": bytes("<h1>reaction-time (fixture)</h1>"),
  "game.js": bytes("console.log('bridge client would connect here');"),
};

function createFakeArchiveReader(
  entries: Record<string, Uint8Array> = MINIMAL_BUNDLE,
): BundleArchiveReader & { malformed: boolean } {
  return {
    malformed: false,
    readMetadata() {
      if (this.malformed) throw new Error("not a zip");
      return Object.entries(entries).map(([path, b]) => ({
        path,
        declaredSize: b.byteLength,
        compressedSize: b.byteLength,
      }));
    },
    read() {
      if (this.malformed) throw new Error("not a zip");
      return entries;
    },
  };
}

function createFakeStorage(): GameBundleStorageRepository & {
  objects: Map<string, { bytes: Uint8Array; contentType: string; contentEncoding?: string }>;
  putKeys: string[];
} {
  const objects = new Map<
    string,
    { bytes: Uint8Array; contentType: string; contentEncoding?: string }
  >();
  const putKeys: string[] = [];
  return {
    objects,
    putKeys,
    async putObject(input) {
      putKeys.push(input.key);
      const raw =
        input.bytes instanceof Uint8Array
          ? input.bytes
          : new Uint8Array(input.bytes as ArrayBuffer);
      objects.set(input.key, {
        bytes: raw,
        contentType: input.contentType,
        ...(input.contentEncoding ? { contentEncoding: input.contentEncoding } : {}),
      });
    },
    async getObject(key) {
      const found = objects.get(key);
      if (!found) return null;
      return found.bytes.buffer.slice(
        found.bytes.byteOffset,
        found.bytes.byteOffset + found.bytes.byteLength,
      ) as ArrayBuffer;
    },
    async deleteObject(key) {
      objects.delete(key);
    },
  };
}

test("prepare -> publish writes one object per file plus the manifest, all under the version's immutable prefix", async () => {
  const storage = createFakeStorage();
  const archives = createFakeArchiveReader();
  const publisher = new SystemGameBundlePublisher(storage, archives);

  const prepared = publisher.prepare(new ArrayBuffer(0)); // fake reader ignores the bytes it's handed
  const manifest = await publisher.publish({
    slug: "reaction-time",
    version: "abc123",
    prepared,
    publishedAt: "2026-08-19T00:00:00.000Z",
  });

  assert.equal(manifest.fileCount, 2);
  assert.equal(storage.putKeys.length, 3); // index.html + game.js + manifest
  assert.ok(storage.objects.has("official-games/reaction-time/abc123/index.html"));
  assert.ok(storage.objects.has("official-games/reaction-time/abc123/game.js"));
  assert.ok(storage.objects.has("official-games/reaction-time/abc123/.owogg-manifest.json"));

  // Manifest is written last — assert the put ORDER, not just presence, since "files first,
  // manifest last" is the actual commit-record guarantee this class exists to provide.
  const manifestIndex = storage.putKeys.indexOf(
    "official-games/reaction-time/abc123/.owogg-manifest.json",
  );
  assert.equal(manifestIndex, storage.putKeys.length - 1);
});

test("readManifest round-trips exactly what publish wrote", async () => {
  const storage = createFakeStorage();
  const publisher = new SystemGameBundlePublisher(storage, createFakeArchiveReader());

  const prepared = publisher.prepare(new ArrayBuffer(0));
  await publisher.publish({
    slug: "reaction-time",
    version: "abc123",
    prepared,
    publishedAt: "2026-08-19T00:00:00.000Z",
  });

  const manifest = await publisher.readManifest("reaction-time", "abc123");
  assert.ok(manifest);
  assert.equal(manifest?.slug, "reaction-time");
  assert.equal(manifest?.version, "abc123");
  assert.equal(manifest?.fileCount, 2);
});

test("readManifest is null for a version that was never published — not published is not an error", async () => {
  const storage = createFakeStorage();
  const publisher = new SystemGameBundlePublisher(storage, createFakeArchiveReader());
  assert.equal(await publisher.readManifest("reaction-time", "never-published"), null);
});

test("different slugs and different versions of the same slug never collide in storage", async () => {
  const storage = createFakeStorage();
  const publisher = new SystemGameBundlePublisher(storage, createFakeArchiveReader());

  const prepared = publisher.prepare(new ArrayBuffer(0));
  await publisher.publish({
    slug: "reaction-time",
    version: "v1",
    prepared,
    publishedAt: "2026-08-19T00:00:00.000Z",
  });
  await publisher.publish({
    slug: "reaction-time",
    version: "v2",
    prepared,
    publishedAt: "2026-08-19T00:01:00.000Z",
  });
  await publisher.publish({
    slug: "aim-test",
    version: "v1",
    prepared,
    publishedAt: "2026-08-19T00:02:00.000Z",
  });

  assert.ok(await publisher.readManifest("reaction-time", "v1"));
  assert.ok(await publisher.readManifest("reaction-time", "v2"));
  assert.ok(await publisher.readManifest("aim-test", "v1"));
  // v1 and v2 of reaction-time are genuinely separate published sets, not one overwriting the other.
  assert.equal(storage.objects.size, 3 * 3); // 3 slugs/versions x (index.html + game.js + manifest)
});

test("a malformed archive is rejected before anything is ever written to storage", async () => {
  const storage = createFakeStorage();
  const archives = createFakeArchiveReader();
  archives.malformed = true;
  const publisher = new SystemGameBundlePublisher(storage, archives);

  assert.throws(() => publisher.prepare(new ArrayBuffer(0)), /BUNDLE_MALFORMED/);
  assert.equal(storage.putKeys.length, 0);
});

test("a bundle with no index.html is rejected by prepare(), before publish() is ever reachable", () => {
  const storage = createFakeStorage();
  const archives = createFakeArchiveReader({ "readme.txt": bytes("no game here") });
  const publisher = new SystemGameBundlePublisher(storage, archives);

  assert.throws(() => publisher.prepare(new ArrayBuffer(0)), /BUNDLE_MISSING_ENTRY/);
});
