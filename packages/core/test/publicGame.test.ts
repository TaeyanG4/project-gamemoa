import test from "node:test";
import assert from "node:assert/strict";
import {
  GAME_DEFINITIONS,
  publicGameMediaUrl,
  systemGameDefinitionToGameCanonicalDocument,
  toPublicGame,
  type GameAsset,
  type GameIdentity,
  type GameVersion,
  type RuntimeGame,
} from "../src/index.js";

const definition = GAME_DEFINITIONS.find((item) => item.slug === "reaction-time");
assert.ok(definition, "fixture assumption: reaction-time exists in the generated registry");

const identity: GameIdentity = {
  id: 9,
  slug: definition.slug,
  publisher: { type: "OWOGG" },
  visibility: "PUBLIC",
  liveVersionId: 4,
  deletedAt: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

const liveVersion: GameVersion = {
  id: 4,
  gameId: identity.id,
  objectKey: "games/9/4/index.html",
  contentHash: "hash",
  bundleBytes: 10,
  publishStatus: "READY",
  publishError: null,
  publishedAt: "2026-08-01T00:00:00.000Z",
  manifestKey: "games/9/4/.owogg-manifest.json",
  publishedSizeBytes: 10,
  fileCount: 1,
  uploadedAt: "2026-08-01T00:00:00.000Z",
};

const runtime: RuntimeGame = {
  identity,
  liveVersion,
  canonical: systemGameDefinitionToGameCanonicalDocument(definition, "2026-08-01T00:00:00.000Z"),
};

test("toPublicGame exposes the provider-neutral canonical projection only", () => {
  const publicGame = toPublicGame(runtime, "https://api.example.test/logo");
  assert.equal(publicGame.publisherType, "OWOGG");
  assert.equal(publicGame.slug, "reaction-time");
  assert.equal(publicGame.title, definition.title);
  assert.deepEqual(publicGame.policy, runtime.canonical.policy);
  assert.deepEqual(publicGame.catalog, runtime.canonical.catalog);
  assert.equal(publicGame.mediaUrl, "https://api.example.test/logo");

  const raw = publicGame as unknown as Record<string, unknown>;
  for (const forbidden of ["id", "publisher_user_id", "publisherUserId", "liveVersionId"]) {
    assert.equal(forbidden in raw, false, `${forbidden} must not cross the public boundary`);
  }
});

test("TAXONOMY games keep their canonical thumbnail instead of a storage-backed logo URL", () => {
  const asset: GameAsset = {
    gameId: identity.id,
    kind: "LOGO",
    objectKey: "private/logo.svg",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
  assert.equal(
    publicGameMediaUrl(runtime, asset, "https://api.example.test/media/logo"),
    runtime.canonical.catalog.type === "TAXONOMY" ? runtime.canonical.catalog.thumbnail : null,
  );
});

test("GENRE_MODE games use the provider-neutral media endpoint only when a logo asset exists", () => {
  const genreRuntime: RuntimeGame = {
    ...runtime,
    identity: {
      ...identity,
      id: 10,
      slug: "ball-dodge",
      publisher: { type: "USER", userId: 7 },
      liveVersionId: 5,
    },
    liveVersion: { ...liveVersion, id: 5, gameId: 10 },
    canonical: {
      ...runtime.canonical,
      slug: "ball-dodge",
      catalog: { type: "GENRE_MODE", genre: "arcade", mode: "single" },
    },
  };
  const asset: GameAsset = {
    gameId: 10,
    kind: "LOGO",
    objectKey: "uploads/10/logo.svg",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
  assert.equal(
    publicGameMediaUrl(genreRuntime, asset, "/api/games/ball-dodge/media/logo"),
    "/api/games/ball-dodge/media/logo",
  );
  assert.equal(publicGameMediaUrl(genreRuntime, null, "/api/games/ball-dodge/media/logo"), null);
});
