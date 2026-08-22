import assert from "node:assert/strict";
import test from "node:test";
import {
  GAME_DEFINITIONS,
  GamePublicationService,
  OfficialGameBootstrap,
  isSystemGameDefinition,
  systemGameDefinitionToGameCanonicalDocument,
  type GameBundleStorageRepository,
  type GameCanonicalDocument,
  type GameCanonicalRepository,
  type GameIdentity,
  type GameVersion,
  type GamePublicationFacts,
  type GamePublicationTarget,
  type OfficialGameBootstrapRepository,
  type PreparedBundle,
  type SystemGameDefinition,
} from "../src/index.js";

const OFFICIAL = GAME_DEFINITIONS.filter(isSystemGameDefinition);
const archive = new Uint8Array([1, 2, 3, 4]);
const prepared: PreparedBundle = {
  entry: "index.html",
  totalSize: 30,
  files: [
    {
      path: "index.html",
      bytes: new TextEncoder().encode("<main>official</main>"),
      contentType: "text/html",
    },
    {
      path: "assets/game.js",
      bytes: new TextEncoder().encode("export {}"),
      contentType: "application/javascript",
    },
  ],
};

function testHash(seed: number): string {
  return seed.toString(16).padStart(64, "0");
}

class FakeOfficialRepository implements OfficialGameBootstrapRepository {
  identities = new Map<string, GameIdentity>();
  versions = new Map<number, GameVersion>();
  reservations = new Map<string, number>();
  activated: Array<{ gameId: number; versionId: number }> = [];
  failed: number[] = [];
  nextGameId = 100;
  nextVersionId = 1000;
  conflictSlug: string | null = null;

  async ensureOwoggIdentity(input: { slug: string; nowIso: string }): Promise<GameIdentity> {
    if (input.slug === this.conflictSlug)
      throw new Error(`Official identity authority conflict for slug ${input.slug}`);
    const existing = this.identities.get(input.slug);
    if (existing) return existing;
    const identity: GameIdentity = {
      id: this.nextGameId++,
      slug: input.slug,
      publisher: { type: "OWOGG" },
      visibility: "PRIVATE",
      liveVersionId: null,
      deletedAt: null,
      createdAt: input.nowIso,
      updatedAt: input.nowIso,
    };
    this.identities.set(input.slug, identity);
    return identity;
  }

  async findVersionByContentHash(gameId: number, contentHash: string): Promise<GameVersion | null> {
    return (
      [...this.versions.values()].find(
        (version) => version.gameId === gameId && version.contentHash === contentHash,
      ) ?? null
    );
  }

  async createPublishingVersion(input: {
    gameId: number;
    objectKey: string;
    contentHash: string;
    bundleBytes: number;
    nowIso: string;
  }): Promise<GameVersion> {
    const version: GameVersion = {
      id: this.nextVersionId++,
      gameId: input.gameId,
      objectKey: input.objectKey,
      contentHash: input.contentHash,
      bundleBytes: input.bundleBytes,
      publishStatus: "PUBLISHING",
      publishError: null,
      publishedAt: null,
      manifestKey: null,
      publishedSizeBytes: null,
      fileCount: null,
      uploadedAt: input.nowIso,
    };
    this.versions.set(version.id, version);
    return version;
  }

  async markPublishing(target: GamePublicationTarget): Promise<void> {
    const version = this.requireTarget(target);
    if (version.publishStatus === "READY") throw new Error("cannot retry READY");
    const retried = {
      ...version,
      publishStatus: "PUBLISHING" as const,
      publishError: null,
      publishedAt: null,
      manifestKey: null,
      publishedSizeBytes: null,
      fileCount: null,
    };
    this.versions.set(target.versionId, retried);
  }

  async markReady(target: GamePublicationTarget, facts: GamePublicationFacts): Promise<void> {
    const version = this.requireTarget(target);
    if (version.publishStatus !== "PUBLISHING") throw new Error("version is not PUBLISHING");
    const ready = {
      ...version,
      publishStatus: "READY" as const,
      publishedAt: facts.publishedAt,
      manifestKey: facts.manifestKey,
      publishedSizeBytes: facts.publishedSizeBytes,
      fileCount: facts.fileCount,
    };
    this.versions.set(version.id, ready);
  }

  async markFailed(target: GamePublicationTarget, reason: string): Promise<void> {
    const version = this.requireTarget(target);
    if (version.publishStatus === "READY") return;
    const wasFailed = version.publishStatus === "FAILED";
    this.versions.set(target.versionId, {
      ...version,
      publishStatus: "FAILED",
      publishError: reason,
      publishedAt: null,
      manifestKey: null,
      publishedSizeBytes: null,
      fileCount: null,
    });
    if (!wasFailed) this.failed.push(target.versionId);
  }

  async ensureSlugReservation(input: { slug: string; gameId: number }): Promise<void> {
    const existing = this.reservations.get(input.slug);
    if (existing !== undefined && existing !== input.gameId)
      throw new Error("reservation conflict");
    this.reservations.set(input.slug, input.gameId);
  }

  async activateOwoggVersion(input: {
    gameId: number;
    versionId: number;
    nowIso: string;
  }): Promise<void> {
    const version = this.requireVersion(input.versionId);
    assert.equal(version.gameId, input.gameId);
    assert.equal(version.publishStatus, "READY");
    const identity = [...this.identities.values()].find(
      (candidate) => candidate.id === input.gameId,
    );
    assert.ok(identity);
    this.identities.set(identity.slug, {
      ...identity,
      visibility: "PUBLIC",
      liveVersionId: input.versionId,
      updatedAt: input.nowIso,
    });
    this.activated.push({ gameId: input.gameId, versionId: input.versionId });
  }

  private requireVersion(id: number): GameVersion {
    const version = this.versions.get(id);
    if (!version) throw new Error(`missing version ${id}`);
    return version;
  }

  private requireTarget(target: GamePublicationTarget): GameVersion {
    const version = this.requireVersion(target.versionId);
    if (version.gameId !== target.gameId || version.contentHash !== target.contentHash) {
      throw new Error(`Official publication target mismatch for version ${target.versionId}`);
    }
    return version;
  }
}

function fakeStorage(): GameBundleStorageRepository & {
  objects: Map<string, Uint8Array>;
  writes: string[];
  failKey: string | null;
} {
  const objects = new Map<string, Uint8Array>();
  return {
    objects,
    writes: [],
    failKey: null,
    async putObject(input) {
      this.writes.push(input.key);
      if (input.key === this.failKey) throw new Error("B2 write failed");
      const bytes = input.bytes instanceof Uint8Array ? input.bytes : new Uint8Array(input.bytes);
      objects.set(input.key, bytes);
    },
    async getObject(key) {
      const bytes = objects.get(key);
      return bytes
        ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
        : null;
    },
    async deleteObject(key) {
      objects.delete(key);
    },
  };
}

function fakeCanonicals(): GameCanonicalRepository & {
  documents: Map<string, GameCanonicalDocument>;
} {
  const documents = new Map<string, GameCanonicalDocument>();
  return {
    documents,
    async findBySlug(slug) {
      return documents.get(slug) ?? null;
    },
    async save(document) {
      documents.set(document.slug, document);
    },
    async delete(slug) {
      documents.delete(slug);
    },
  };
}

function bootstrap(
  repo = new FakeOfficialRepository(),
  storage = fakeStorage(),
  canonicals = fakeCanonicals(),
) {
  return {
    repo,
    storage,
    canonicals,
    service: new OfficialGameBootstrap(
      repo,
      storage,
      canonicals,
      new GamePublicationService(repo, storage),
    ),
  };
}

async function run(
  service: OfficialGameBootstrap,
  definition: SystemGameDefinition,
  hash: string,
  nowIso = "2026-08-21T00:00:00.000Z",
) {
  return service.bootstrap({ definition, archive, contentHash: hash, prepared, nowIso });
}

test("bootstrap publishes all four official games with OWOGG-only identities, READY generic bundles, canonical documents, and reservations", async () => {
  const { repo, storage, canonicals, service } = bootstrap();
  assert.deepEqual(OFFICIAL.map((definition) => definition.slug).sort(), [
    "aim-test",
    "memory-test",
    "reaction-time",
    "typing-test",
  ]);

  for (const [index, definition] of OFFICIAL.entries()) {
    await run(service, definition, testHash(index + 1));
  }

  assert.equal(repo.identities.size, 4);
  assert.equal(repo.versions.size, 4);
  assert.equal(repo.reservations.size, 4);
  assert.equal(repo.activated.length, 4);
  for (const [index, definition] of OFFICIAL.entries()) {
    const identity = repo.identities.get(definition.slug);
    assert.deepEqual(identity?.publisher, { type: "OWOGG" });
    assert.equal(identity?.visibility, "PUBLIC");
    assert.equal(repo.reservations.get(definition.slug), identity?.id);
    assert.ok(identity?.liveVersionId);
    assert.ok(storage.objects.has(`uploads/${identity?.id}/${testHash(index + 1)}.zip`));
    assert.ok(storage.objects.has(`games/${identity?.id}/${identity?.liveVersionId}/index.html`));
    assert.ok(
      storage.objects.has(`games/${identity?.id}/${identity?.liveVersionId}/.owogg-manifest.json`),
    );
    assert.deepEqual(
      canonicals.documents.get(definition.slug),
      systemGameDefinitionToGameCanonicalDocument(definition, "2026-08-21T00:00:00.000Z"),
    );
  }
});

test("unchanged hash reuses READY without republishing; changed hash allocates and activates a new version", async () => {
  const { repo, storage, service } = bootstrap();
  const definition = OFFICIAL[0] as SystemGameDefinition;
  const first = await run(service, definition, testHash(10));
  const writesAfterFirst = storage.writes.length;
  const same = await run(service, definition, testHash(10), "2026-08-22T00:00:00.000Z");
  assert.equal(storage.writes.length, writesAfterFirst);
  const changed = await run(service, definition, testHash(11), "2026-08-23T00:00:00.000Z");
  assert.equal(same.reusedReadyVersion, true);
  assert.equal(same.versionId, first.versionId);
  assert.notEqual(changed.versionId, first.versionId);
  assert.equal(repo.versions.size, 2);
  assert.equal(repo.identities.get(definition.slug)?.liveVersionId, changed.versionId);
});

test("a failed official version retries through the common publisher under the same numeric id", async () => {
  const { repo, storage, service } = bootstrap();
  const definition = OFFICIAL[0] as SystemGameDefinition;
  storage.failKey = "games/100/1000/.owogg-manifest.json";
  await assert.rejects(() => run(service, definition, testHash(12)), /B2 write failed/);
  assert.equal(repo.versions.get(1000)?.publishStatus, "FAILED");

  storage.failKey = null;
  const retried = await run(service, definition, testHash(12), "2026-08-22T00:00:00.000Z");
  assert.equal(retried.versionId, 1000);
  assert.equal(repo.versions.size, 1);
  assert.equal(repo.versions.get(1000)?.publishStatus, "READY");
  assert.equal(repo.identities.get(definition.slug)?.liveVersionId, 1000);
});

test("partial generic publish never becomes live and is marked FAILED", async () => {
  const { repo, storage, service } = bootstrap();
  const definition = OFFICIAL[0] as SystemGameDefinition;
  storage.failKey = "games/100/1000/.owogg-manifest.json";
  await assert.rejects(() => run(service, definition, testHash(13)), /B2 write failed/);
  assert.equal(repo.activated.length, 0);
  assert.equal(repo.failed.length, 1);
  assert.equal(repo.versions.get(1000)?.publishStatus, "FAILED");
});

test("USER authority and conflicting canonical state fail closed before activation", async () => {
  const { repo, canonicals, service } = bootstrap();
  const definition = OFFICIAL[0] as SystemGameDefinition;
  repo.conflictSlug = definition.slug;
  await assert.rejects(() => run(service, definition, testHash(14)), /authority conflict/);
  assert.equal(repo.versions.size, 0);

  repo.conflictSlug = null;
  canonicals.documents.set(definition.slug, {
    ...systemGameDefinitionToGameCanonicalDocument(definition, "2026-08-21T00:00:00.000Z"),
    title: "conflict",
  });
  await assert.rejects(() => run(service, definition, testHash(15)), /canonical conflict/);
  assert.equal(repo.activated.length, 0);
});

test("trusted official bootstrap upgrades legacy non-official canonical metadata only when all other fields match", async () => {
  const { canonicals, service } = bootstrap();
  const definition = OFFICIAL[0] as SystemGameDefinition;
  canonicals.documents.set(definition.slug, {
    ...systemGameDefinitionToGameCanonicalDocument(definition, "2026-08-21T00:00:00.000Z"),
    publisher: { official: false },
  });

  const result = await run(service, definition, testHash(16));
  assert.equal(result.canonicalCreated, true);
  assert.deepEqual(canonicals.documents.get(definition.slug)?.publisher, { official: true });
});
