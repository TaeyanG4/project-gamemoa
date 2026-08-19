import test from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import { SystemGameBundlePublisher, sha256Hex } from "@owogg/core";
import { FflateBundleArchiveReader } from "../src/infrastructure/games/FflateBundleArchiveReader.js";
import { BackblazeB2GameBundleRepository } from "@owogg/db";

/**
 * Real build -> validate -> publish -> read, end to end, for a SYSTEM (official OwOGG) game bundle
 * — the foundation feat/official-game-publisher-foundation exists to prove, mirroring
 * publishPipeline.test.ts's own realism for the Creator path: a real zip (fflate), the real
 * FflateBundleArchiveReader, and the real BackblazeB2GameBundleRepository S3-signing adapter, with
 * only the network boundary stubbed. No D1 anywhere in this file — see
 * SystemGameBundlePublisher's own doc comment for why that absence is the point, not an oversight.
 *
 * The fixture bundle below is a small SYNTHETIC placeholder, not reaction-time's real source —
 * migrating an actual SYSTEM game onto this pipeline (real build tooling, real Game Bridge SDK
 * wiring) is explicitly the next PR's scope, not this one's. `game.js` here only illustrates that
 * a bundle CAN reference @owogg/game-sdk's bridge client; nothing in this test executes it.
 */

const B2_ENV = {
  endpoint: "https://s3.us-west-004.backblazeb2.com",
  region: "us-west-004",
  bucket: "owogg-game-bundles",
  keyId: "someKeyId",
  applicationKey: "someApplicationKey",
};

/** Records every object write (and actually holds the bytes, so a GET genuinely round-trips what
 * was PUT) — same fetch-stubbing approach as publishPipeline.test.ts's createStorageStub, extended
 * to serve real bodies back since this file's own readManifest test needs that. */
function createStorageStub(options: { failPutContaining?: string } = {}) {
  const originalFetch = globalThis.fetch;
  const puts: Array<{ key: string; contentType: string | null; contentEncoding: string | null }> =
    [];
  const objects = new Map<string, { bytes: ArrayBuffer; contentType: string }>();

  globalThis.fetch = (async (input: URL | RequestInfo | string) => {
    const request = input as Request;
    const href =
      typeof input === "string" ? input : input instanceof URL ? input.href : request.url;
    const url = new URL(href);
    const key = decodeURIComponent(url.pathname.split("/").slice(2).join("/"));
    const method = typeof input === "string" ? "GET" : (request.method ?? "GET");

    if (method === "PUT") {
      if (options.failPutContaining && key.includes(options.failPutContaining)) {
        return new Response("storage exploded", { status: 500 });
      }
      const contentType = request.headers?.get("Content-Type") ?? null;
      puts.push({
        key,
        contentType,
        contentEncoding: request.headers?.get("Content-Encoding") ?? null,
      });
      objects.set(key, {
        bytes: await request.arrayBuffer(),
        contentType: contentType ?? "application/octet-stream",
      });
      return new Response("", { status: 200 });
    }
    if (method === "GET") {
      const found = objects.get(key);
      if (!found) return new Response("not found", { status: 404 });
      return new Response(found.bytes, {
        status: 200,
        headers: { "Content-Type": found.contentType },
      });
    }
    return new Response("not found", { status: 404 });
  }) as unknown as typeof fetch;

  return {
    puts,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

function buildFixtureArchive(): Uint8Array {
  return zipSync({
    "index.html": strToU8("<!doctype html><html><body><div id=root></div></body></html>"),
    "game.js": strToU8(
      "// A real migration would import { connectGameBridge } from '@owogg/game-sdk/bridge' here.\nconsole.log('reaction-time (placeholder fixture)');",
    ),
  });
}

test("build -> validate -> publish -> read: a real zip becomes one B2 object per file plus a manifest, under an immutable slug+version key", async () => {
  const archive = buildFixtureArchive();
  const version = await sha256Hex(archive.buffer as ArrayBuffer);
  const storage = createStorageStub();

  try {
    const publisher = new SystemGameBundlePublisher(
      new BackblazeB2GameBundleRepository(B2_ENV),
      new FflateBundleArchiveReader(),
    );

    const prepared = publisher.prepare(archive.buffer as ArrayBuffer);
    assert.equal(prepared.entry, "index.html");
    assert.equal(prepared.files.length, 2);

    const manifest = await publisher.publish({
      slug: "reaction-time",
      version,
      prepared,
      publishedAt: "2026-08-19T00:00:00.000Z",
    });

    assert.equal(manifest.slug, "reaction-time");
    assert.equal(manifest.version, version);
    assert.equal(manifest.fileCount, 2);

    const keys = storage.puts.map((p) => p.key);
    assert.ok(keys.includes(`official-games/reaction-time/${version}/index.html`));
    assert.ok(keys.includes(`official-games/reaction-time/${version}/game.js`));
    assert.ok(keys.includes(`official-games/reaction-time/${version}/.owogg-manifest.json`));
    assert.equal(keys.length, 3);
    assert.ok(
      !keys.some((k) => k.startsWith("games/") || k.startsWith("uploads/")),
      "never touches Creator's own key prefixes",
    );

    const html = storage.puts.find((p) => p.key.endsWith("index.html"));
    assert.equal(html?.contentType, "text/html; charset=utf-8");

    // The actual "read" half of build -> validate -> publish -> read: a fresh readManifest call
    // fetches the real object just PUT, through the same signed-GET path a future consumer would
    // use, and gets back the exact manifest publish() returned.
    const reread = await publisher.readManifest("reaction-time", version);
    // Compared against the JSON round-trip of the in-memory manifest, not the object itself — a
    // `contentEncoding: undefined` key survives in memory but is dropped by JSON.stringify, so
    // that's the correct shape for what a real read-back produces, not a quirk to work around.
    assert.deepEqual(reread, JSON.parse(JSON.stringify(manifest)));
  } finally {
    storage.restore();
  }
});

test("republishing byte-identical content is idempotent — same hash, same key, same object written again", async () => {
  const archive = buildFixtureArchive();
  const version = await sha256Hex(archive.buffer as ArrayBuffer);
  const storage = createStorageStub();

  try {
    const publisher = new SystemGameBundlePublisher(
      new BackblazeB2GameBundleRepository(B2_ENV),
      new FflateBundleArchiveReader(),
    );
    const prepared = publisher.prepare(archive.buffer as ArrayBuffer);

    const first = await publisher.publish({
      slug: "reaction-time",
      version,
      prepared,
      publishedAt: "2026-08-19T00:00:00.000Z",
    });
    const second = await publisher.publish({
      slug: "reaction-time",
      version,
      prepared,
      publishedAt: "2026-08-19T00:05:00.000Z",
    });

    assert.equal(first.version, second.version, "identical bytes hash to the identical version");

    // Two publishes, six PUT calls total (3 objects each), but only 3 DISTINCT keys — the second
    // publish overwrote the exact same immutable-version keys with identical bytes rather than
    // creating a second, parallel set under some other version.
    assert.equal(storage.puts.length, 6);
    const uniqueKeys = new Set(storage.puts.map((p) => p.key));
    assert.equal(uniqueKeys.size, 3);
    for (const key of uniqueKeys) {
      assert.ok(key.startsWith(`official-games/reaction-time/${version}/`));
    }
  } finally {
    storage.restore();
  }
});

test("a bundle with no index.html is rejected before anything reaches storage", async () => {
  const archive = zipSync({ "readme.txt": strToU8("no game here") });
  const storage = createStorageStub();

  try {
    const publisher = new SystemGameBundlePublisher(
      new BackblazeB2GameBundleRepository(B2_ENV),
      new FflateBundleArchiveReader(),
    );
    assert.throws(() => publisher.prepare(archive.buffer as ArrayBuffer), /BUNDLE_MISSING_ENTRY/);
    assert.deepEqual(storage.puts, []);
  } finally {
    storage.restore();
  }
});

test("a non-zip archive is rejected as malformed rather than throwing something unexpected", async () => {
  const storage = createStorageStub();
  try {
    const publisher = new SystemGameBundlePublisher(
      new BackblazeB2GameBundleRepository(B2_ENV),
      new FflateBundleArchiveReader(),
    );
    const notAZip = strToU8("this is definitely not a zip file");
    assert.throws(() => publisher.prepare(notAZip.buffer as ArrayBuffer), /BUNDLE_MALFORMED/);
    assert.deepEqual(storage.puts, []);
  } finally {
    storage.restore();
  }
});
