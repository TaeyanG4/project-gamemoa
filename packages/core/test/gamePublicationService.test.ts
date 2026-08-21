import assert from "node:assert/strict";
import test from "node:test";
import {
  GamePublicationService,
  describePublicationFailure,
} from "../src/application/gamePublicationService.js";
import type { GameBundleStorageRepository } from "../src/ports/sandboxGames.js";
import type {
  GamePublicationFacts,
  GameVersionPublicationRepository,
} from "../src/modules/game/ports/gameVersionPublicationRepository.js";
import type { PreparedBundle } from "../src/domain/sandboxGameBundle.js";
import { buildBundleManifest } from "../src/domain/sandboxGameBundle.js";

const prepared: PreparedBundle = {
  entry: "index.html",
  totalSize: 16,
  files: [
    {
      path: "index.html",
      bytes: new TextEncoder().encode("<main></main>"),
      contentType: "text/html",
    },
    {
      path: "assets/game.js",
      bytes: new TextEncoder().encode("ok"),
      contentType: "application/javascript",
    },
  ],
};

function stateRepository(): GameVersionPublicationRepository & {
  states: string[];
  readyFacts: GamePublicationFacts | null;
  failure: string | null;
} {
  return {
    states: [],
    readyFacts: null,
    failure: null,
    async markPublishing() {
      this.states.push("PUBLISHING");
      this.readyFacts = null;
      this.failure = null;
    },
    async markReady(_versionId, facts) {
      this.states.push("READY");
      this.readyFacts = facts;
    },
    async markFailed(_versionId, reason) {
      this.states.push("FAILED");
      this.failure = reason;
    },
  };
}

function storage(): GameBundleStorageRepository & {
  objects: Map<string, Uint8Array>;
  writes: string[];
  failKey: string | null;
} {
  return {
    objects: new Map(),
    writes: [],
    failKey: null,
    async putObject(input) {
      this.writes.push(input.key);
      if (input.key === this.failKey)
        throw new Error(`provider request failed: ${"x".repeat(300)}`);
      const bytes = input.bytes instanceof Uint8Array ? input.bytes : new Uint8Array(input.bytes);
      this.objects.set(input.key, bytes);
    },
    async getObject(key) {
      const bytes = this.objects.get(key);
      return bytes
        ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
        : null;
    },
    async deleteObject(key) {
      this.objects.delete(key);
    },
  };
}

test("publishes numeric generic paths, writes manifest last, and records exact READY facts", async () => {
  const states = stateRepository();
  const objects = storage();
  const service = new GamePublicationService(states, objects);
  const facts = await service.publish({
    gameId: 12,
    versionId: 34,
    contentHash: "hash-abc",
    prepared,
    publishedAt: "2026-08-21T00:00:00.000Z",
  });

  assert.deepEqual(objects.writes, [
    "games/12/34/index.html",
    "games/12/34/assets/game.js",
    "games/12/34/.owogg-manifest.json",
  ]);
  assert.deepEqual(states.states, ["PUBLISHING", "READY"]);
  assert.deepEqual(states.readyFacts, facts);
  assert.deepEqual(facts, {
    publishedAt: "2026-08-21T00:00:00.000Z",
    manifestKey: "games/12/34/.owogg-manifest.json",
    publishedSizeBytes: prepared.totalSize,
    fileCount: prepared.files.length,
  });

  const manifestBytes = objects.objects.get(facts.manifestKey);
  assert.ok(manifestBytes);
  const serializedManifest = new TextDecoder().decode(manifestBytes);
  assert.equal(
    serializedManifest,
    JSON.stringify(
      buildBundleManifest({
        gameId: 12,
        versionId: 34,
        contentHash: "hash-abc",
        prepared,
        publishedAt: "2026-08-21T00:00:00.000Z",
      }),
    ),
  );
  const manifest = JSON.parse(serializedManifest) as Record<string, unknown>;
  assert.equal(manifest.gameId, 12);
  assert.equal(manifest.versionId, 34);
  assert.equal(manifest.contentHash, "hash-abc");
});

test("a file failure never writes a manifest or READY state and stores a bounded safe reason", async () => {
  const states = stateRepository();
  const objects = storage();
  objects.failKey = "games/12/34/assets/game.js";
  const service = new GamePublicationService(states, objects);

  await assert.rejects(() =>
    service.publish({
      gameId: 12,
      versionId: 34,
      contentHash: "hash-abc",
      prepared,
      publishedAt: "2026-08-21T00:00:00.000Z",
    }),
  );
  assert.equal(objects.objects.has("games/12/34/.owogg-manifest.json"), false);
  assert.deepEqual(states.states, ["PUBLISHING", "FAILED"]);
  assert.equal(states.failure, "bundle publication failed (Error)");
  assert.equal(states.failure?.includes("provider request"), false);
});

test("a manifest failure remains non-READY and retry converges on the same numeric version", async () => {
  const states = stateRepository();
  const objects = storage();
  const manifestKey = "games/12/34/.owogg-manifest.json";
  objects.failKey = manifestKey;
  const service = new GamePublicationService(states, objects);
  const input = {
    gameId: 12,
    versionId: 34,
    contentHash: "hash-abc",
    prepared,
    publishedAt: "2026-08-21T00:00:00.000Z",
  };

  await assert.rejects(() => service.publish(input));
  assert.deepEqual(states.states, ["PUBLISHING", "FAILED"]);

  objects.failKey = null;
  const facts = await service.publish(input);
  assert.equal(facts.manifestKey, manifestKey);
  assert.deepEqual(states.states, ["PUBLISHING", "FAILED", "PUBLISHING", "READY"]);
  assert.ok(objects.objects.has(manifestKey));
});

test("failure normalization never exposes arbitrary non-Error text", () => {
  assert.equal(
    describePublicationFailure("secret value"),
    "bundle publication failed (unknown error)",
  );
});
