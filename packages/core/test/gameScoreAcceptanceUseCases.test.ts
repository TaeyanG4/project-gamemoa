import test from "node:test";
import assert from "node:assert/strict";
import {
  GAME_SESSION_POLICY,
  GameScoreAcceptanceUseCases,
  signGameSession,
  type GameScoreAcceptanceRepository,
  type RuntimeGame,
  type RuntimeGameAvailability,
  type RuntimeGameRegistry,
} from "../src/index.js";
import { systemGameDefinitionToGameCanonicalDocument } from "../src/modules/game/domain/gameCanonicalMigration.js";
import { GAME_DEFINITIONS } from "../src/registry/gameDefinitions.generated.js";

const SECRET = "c2-focused-test-secret";

function runtimeGame(slug = "reaction-time"): RuntimeGame {
  const definition = GAME_DEFINITIONS.find((item) => item.slug === slug);
  assert.ok(definition);
  return {
    identity: {
      id: 91,
      slug,
      publisher: { type: "OWOGG" },
      visibility: "PUBLIC",
      liveVersionId: 17,
      deletedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    liveVersion: {
      id: 17,
      gameId: 91,
      objectKey: "games/91/17/index.html",
      contentHash: "hash",
      bundleBytes: 1,
      publishStatus: "READY",
      publishError: null,
      publishedAt: "2026-01-01T00:00:00.000Z",
      manifestKey: "games/91/17/.owogg-manifest.json",
      publishedSizeBytes: 1,
      fileCount: 1,
      uploadedAt: "2026-01-01T00:00:00.000Z",
    },
    canonical: systemGameDefinitionToGameCanonicalDocument(definition, "2026-01-01T00:00:00.000Z"),
  };
}

function createUseCases(runtime: RuntimeGame) {
  const consumed = new Set<string>();
  let nextScoreId = 100;
  const repo: GameScoreAcceptanceRepository = {
    async acceptScore(input) {
      if (consumed.has(input.attemptId)) return { accepted: false, scoreId: null };
      consumed.add(input.attemptId);
      return { accepted: true, scoreId: nextScoreId++ };
    },
  };
  const registry: RuntimeGameRegistry = {
    async findBySlug(slug) {
      return slug === runtime.identity.slug ? runtime : null;
    },
  };
  const availability = {
    async isVersionServable(gameId: number, versionId: number) {
      return gameId === runtime.identity.id && versionId === runtime.liveVersion.id;
    },
  } as RuntimeGameAvailability;
  const settings = {
    async getDisabledGameIds() {
      return [];
    },
  };
  return {
    useCases: new GameScoreAcceptanceUseCases(registry, availability, settings, repo),
  };
}

async function token(runtime: RuntimeGame, difficulty = "normal") {
  return signGameSession(
    {
      userId: 7,
      gameId: runtime.identity.id,
      versionId: runtime.liveVersion.id,
      attemptId: crypto.randomUUID(),
      exp: Math.floor(Date.now() / 1000) + GAME_SESSION_POLICY.EXPIRY_SECONDS,
      difficulty,
    },
    SECRET,
  );
}

test("generic acceptance resolves canonical policy and consumes a token once", async () => {
  const runtime = runtimeGame();
  const { useCases } = createUseCases(runtime);
  const signed = await token(runtime);

  const input = {
    slug: runtime.identity.slug,
    userId: 7,
    nickname: "player",
    avatarUrl: null,
    token: signed,
    secret: SECRET,
    score: 100,
    difficulty: "normal",
  };
  const accepted = await useCases.accept(input);
  assert.equal(accepted.ok, true);
  if (!accepted.ok) return;
  assert.equal(accepted.scoreId, 100);
  assert.equal(accepted.xpPerCompletion, runtime.canonical.policy.xpPerCompletion);

  const replay = await useCases.accept(input);
  assert.deepEqual(replay, { ok: false, error: "ALREADY_CONSUMED" });
});

test("difficulty is bound to the signed token and cannot be changed at acceptance", async () => {
  const runtime = runtimeGame("aim-test");
  const { useCases } = createUseCases(runtime);
  const signed = await token(runtime, "normal");

  const result = await useCases.accept({
    slug: runtime.identity.slug,
    userId: 7,
    nickname: "player",
    avatarUrl: null,
    token: signed,
    secret: SECRET,
    score: 100,
    difficulty: "hard",
  });
  assert.deepEqual(result, { ok: false, error: "CONTEXT_MISMATCH" });
});
