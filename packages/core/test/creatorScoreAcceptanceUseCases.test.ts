import test from "node:test";
import assert from "node:assert/strict";
import { CreatorScoreAcceptanceUseCases } from "../src/application/creatorScoreAcceptanceUseCases.js";
import { signGameSession, type GameSessionPayload } from "../src/domain/gameSession.js";
import type {
  SandboxGameRecord,
  SandboxGameRepository,
  SandboxGameVersionRecord,
} from "../src/ports/sandboxGames.js";
import type { CreatorScoreAcceptanceRepository } from "../src/ports/creatorScoreAcceptance.js";
import { tamperSignedToken } from "./helpers/tamperSignature.js";

// The atomic accept-or-reject write itself is proven against real SQLite in
// packages/db/test/D1CreatorScoreAcceptanceRepository.test.ts. This file exercises everything
// CreatorScoreAcceptanceUseCases checks BEFORE that write ever happens — game availability, the
// token's own validity, whether it matches the live context, and score policy — using a fake
// repository that's simple enough to prove the orchestration, not real concurrency.

const SECRET = "test-secret-do-not-use-in-prod";

function makeGame(overrides: Partial<SandboxGameRecord> = {}): SandboxGameRecord {
  return {
    id: 1,
    slug: "ball-dodge",
    developerUserId: 1,
    title: "Ball Dodge",
    shortDescription: null,
    description: null,
    genre: "arcade",
    mode: "single",
    logoKey: null,
    xpPerCompletion: 0,
    scoreUnit: "seconds",
    scoreDirection: "desc",
    scoreMin: 0,
    scoreMax: 3600,
    scoreDisplayPrefix: null,
    scoreDisplaySuffix: null,
    visibility: "PUBLIC",
    liveVersionId: 7,
    reviewSlot: null,
    deletedAt: null,
    deletedByAdminId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeVersion(gameId: number, id: number): SandboxGameVersionRecord {
  return {
    id,
    gameId,
    objectKey: "uploads/1/abc.zip",
    contentHash: "fakehash",
    bundleBytes: 123,
    status: "APPROVED",
    reviewedByAdminId: 1,
    reviewedAt: new Date().toISOString(),
    rejectReason: null,
    uploadedAt: new Date().toISOString(),
    publishStatus: "READY",
    publishError: null,
    publishedAt: new Date().toISOString(),
    manifestKey: `games/${gameId}/${id}/.owogg-manifest.json`,
    publishedSizeBytes: 456,
    fileCount: 2,
  };
}

function createFakeSandboxGameRepo(
  game: SandboxGameRecord | null,
): Pick<SandboxGameRepository, "findBySlug" | "findVersionById"> {
  return {
    async findBySlug(slug) {
      return game && game.slug === slug ? game : null;
    },
    async findVersionById(id) {
      if (!game || game.liveVersionId !== id) return null;
      return makeVersion(game.id, id);
    },
  };
}

function createFakeAcceptanceRepo(): CreatorScoreAcceptanceRepository & {
  accepted: Array<{ attemptId: string; score: number }>;
} {
  const spent = new Set<string>();
  const accepted: Array<{ attemptId: string; score: number }> = [];
  return {
    accepted,
    async acceptScore(input) {
      if (spent.has(input.attemptId)) return { accepted: false };
      spent.add(input.attemptId);
      accepted.push({ attemptId: input.attemptId, score: input.score });
      return { accepted: true };
    },
  };
}

function samplePayload(overrides: Partial<GameSessionPayload> = {}): GameSessionPayload {
  return {
    userId: 1,
    gameId: 1,
    versionId: 7,
    attemptId: "11111111-1111-1111-1111-111111111111",
    exp: Math.floor(Date.now() / 1000) + 300,
    ...overrides,
  };
}

function buildUseCases(game: SandboxGameRecord | null) {
  const sandboxGameRepo = createFakeSandboxGameRepo(game) as SandboxGameRepository;
  const acceptanceRepo = createFakeAcceptanceRepo();
  const useCases = new CreatorScoreAcceptanceUseCases(sandboxGameRepo, acceptanceRepo);
  return { useCases, acceptanceRepo };
}

test("a valid token, matching context, and in-policy score is accepted", async () => {
  const game = makeGame();
  const { useCases, acceptanceRepo } = buildUseCases(game);
  const token = await signGameSession(samplePayload(), SECRET);

  const result = await useCases.accept({
    slug: "ball-dodge",
    userId: 1,
    nickname: "player",
    avatarUrl: null,
    token,
    secret: SECRET,
    score: 42,
  });

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(acceptanceRepo.accepted, [
    { attemptId: "11111111-1111-1111-1111-111111111111", score: 42 },
  ]);
});

test("a decimal score within bounds is accepted — ball-dodge measures survival time in seconds (e.g. 4.4), not a whole number", async () => {
  // Pins the actual Production bug this fix resolves: ball-dodge's GAME_COMPLETE score is a
  // fractional value, and validateScoreAgainstPolicy used to hard-reject anything non-integer.
  const game = makeGame();
  const { useCases, acceptanceRepo } = buildUseCases(game);
  const token = await signGameSession(samplePayload(), SECRET);

  const result = await useCases.accept({
    slug: "ball-dodge",
    userId: 1,
    nickname: "player",
    avatarUrl: null,
    token,
    secret: SECRET,
    score: 4.4,
  });

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(acceptanceRepo.accepted, [
    { attemptId: "11111111-1111-1111-1111-111111111111", score: 4.4 },
  ]);
});

test("an unknown slug is GAME_NOT_AVAILABLE", async () => {
  const { useCases } = buildUseCases(null);
  const token = await signGameSession(samplePayload(), SECRET);

  const result = await useCases.accept({
    slug: "no-such-game",
    userId: 1,
    nickname: "player",
    avatarUrl: null,
    token,
    secret: SECRET,
    score: 42,
  });
  assert.deepEqual(result, { ok: false, error: "GAME_NOT_AVAILABLE" });
});

test("a PRIVATE game is GAME_NOT_AVAILABLE, indistinguishable from unknown", async () => {
  const game = makeGame({ visibility: "PRIVATE", liveVersionId: null });
  const { useCases } = buildUseCases(game);
  const token = await signGameSession(samplePayload(), SECRET);

  const result = await useCases.accept({
    slug: "ball-dodge",
    userId: 1,
    nickname: "player",
    avatarUrl: null,
    token,
    secret: SECRET,
    score: 42,
  });
  assert.deepEqual(result, { ok: false, error: "GAME_NOT_AVAILABLE" });
});

test("a tampered token is INVALID_TOKEN, and the repository is never reached", async () => {
  const game = makeGame();
  const { useCases, acceptanceRepo } = buildUseCases(game);
  const token = await signGameSession(samplePayload(), SECRET);
  const tampered = tamperSignedToken(token);

  const result = await useCases.accept({
    slug: "ball-dodge",
    userId: 1,
    nickname: "player",
    avatarUrl: null,
    token: tampered,
    secret: SECRET,
    score: 42,
  });
  assert.deepEqual(result, { ok: false, error: "INVALID_TOKEN" });
  assert.deepEqual(acceptanceRepo.accepted, []);
});

test("an expired token is INVALID_TOKEN", async () => {
  const game = makeGame();
  const { useCases } = buildUseCases(game);
  const token = await signGameSession(
    samplePayload({ exp: Math.floor(Date.now() / 1000) - 10 }),
    SECRET,
  );

  const result = await useCases.accept({
    slug: "ball-dodge",
    userId: 1,
    nickname: "player",
    avatarUrl: null,
    token,
    secret: SECRET,
    score: 42,
  });
  assert.deepEqual(result, { ok: false, error: "INVALID_TOKEN" });
});

test("a token issued to a different user is CONTEXT_MISMATCH", async () => {
  const game = makeGame();
  const { useCases } = buildUseCases(game);
  const token = await signGameSession(samplePayload({ userId: 999 }), SECRET);

  const result = await useCases.accept({
    slug: "ball-dodge",
    userId: 1,
    nickname: "player",
    avatarUrl: null,
    token,
    secret: SECRET,
    score: 42,
  });
  assert.deepEqual(result, { ok: false, error: "CONTEXT_MISMATCH" });
});

test("a token issued against a since-changed live version is CONTEXT_MISMATCH — 'exact live version' is re-checked fresh", async () => {
  // Token was issued for versionId 7 (see samplePayload), but the game's live version has since
  // moved to 8 (an admin approved a new build, or rolled back) — the token must not still work.
  const game = makeGame({ liveVersionId: 8 });
  const { useCases } = buildUseCases(game);
  const token = await signGameSession(samplePayload({ versionId: 7 }), SECRET);

  const result = await useCases.accept({
    slug: "ball-dodge",
    userId: 1,
    nickname: "player",
    avatarUrl: null,
    token,
    secret: SECRET,
    score: 42,
  });
  assert.deepEqual(result, { ok: false, error: "CONTEXT_MISMATCH" });
});

test("a game with no score policy configured yet is SCORE_POLICY_NOT_CONFIGURED, not unbounded", async () => {
  const game = makeGame({ scoreUnit: null, scoreDirection: null, scoreMin: null, scoreMax: null });
  const { useCases } = buildUseCases(game);
  const token = await signGameSession(samplePayload(), SECRET);

  const result = await useCases.accept({
    slug: "ball-dodge",
    userId: 1,
    nickname: "player",
    avatarUrl: null,
    token,
    secret: SECRET,
    score: 999999999,
  });
  assert.deepEqual(result, { ok: false, error: "SCORE_POLICY_NOT_CONFIGURED" });
});

test("a score outside the configured bounds is INVALID_SCORE", async () => {
  const game = makeGame({ scoreMin: 0, scoreMax: 100 });
  const { useCases, acceptanceRepo } = buildUseCases(game);
  const token = await signGameSession(samplePayload(), SECRET);

  const result = await useCases.accept({
    slug: "ball-dodge",
    userId: 1,
    nickname: "player",
    avatarUrl: null,
    token,
    secret: SECRET,
    score: 999,
  });
  assert.equal(result.ok, false);
  assert.equal(result.ok ? null : result.error, "INVALID_SCORE");
  assert.deepEqual(acceptanceRepo.accepted, []);
});

test("the same token presented twice is accepted once, then ALREADY_CONSUMED", async () => {
  const game = makeGame();
  const { useCases } = buildUseCases(game);
  const token = await signGameSession(samplePayload(), SECRET);
  const call = () =>
    useCases.accept({
      slug: "ball-dodge",
      userId: 1,
      nickname: "player",
      avatarUrl: null,
      token,
      secret: SECRET,
      score: 42,
    });

  const first = await call();
  assert.equal(first.ok, true);

  const second = await call();
  assert.deepEqual(second, { ok: false, error: "ALREADY_CONSUMED" });
});
