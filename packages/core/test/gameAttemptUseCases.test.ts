import test from "node:test";
import assert from "node:assert/strict";
import { GameAttemptUseCases } from "../src/application/gameAttemptUseCases.js";
import { signGameSession, type GameSessionPayload } from "../src/domain/gameSession.js";
import type { GameAttemptConsumptionRepository } from "../src/ports/gameAttempt.js";
import { tamperSignedToken } from "./helpers/tamperSignature.js";

// The atomicity guarantee itself (real concurrent D1 requests racing on the same attemptId) is
// proven against real SQLite in packages/db/test/D1GameAttemptConsumptionRepository.test.ts —
// this file exercises the orchestration GameAttemptUseCases.consume() adds on top: verifying the
// token, checking it matches the expected context, and only then asking the repository to spend
// it. A fake repository (in-memory Set) is enough to prove that orchestration; it wouldn't prove
// atomicity under a genuine race, which is exactly why that's tested at the D1 layer instead.

const SECRET = "test-secret-do-not-use-in-prod";

function samplePayload(overrides: Partial<GameSessionPayload> = {}): GameSessionPayload {
  return {
    userId: 1,
    gameId: 42,
    versionId: 7,
    attemptId: "11111111-1111-1111-1111-111111111111",
    exp: Math.floor(Date.now() / 1000) + 300,
    ...overrides,
  };
}

function createFakeRepo(): GameAttemptConsumptionRepository & { consumedIds: string[] } {
  const spent = new Set<string>();
  const consumedIds: string[] = [];
  return {
    consumedIds,
    async consumeAttempt(input) {
      if (spent.has(input.attemptId)) return { consumed: false };
      spent.add(input.attemptId);
      consumedIds.push(input.attemptId);
      return { consumed: true };
    },
  };
}

const EXPECTED = { userId: 1, gameId: 42, versionId: 7 };

test("a first, valid, matching token is consumed successfully", async () => {
  const repo = createFakeRepo();
  const useCases = new GameAttemptUseCases(repo);
  const token = await signGameSession(samplePayload(), SECRET);

  const result = await useCases.consume({ token, secret: SECRET, expected: EXPECTED });
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(repo.consumedIds, ["11111111-1111-1111-1111-111111111111"]);
});

test("the same attemptId presented a second time is rejected as ALREADY_CONSUMED", async () => {
  const repo = createFakeRepo();
  const useCases = new GameAttemptUseCases(repo);
  const token = await signGameSession(samplePayload(), SECRET);

  const first = await useCases.consume({ token, secret: SECRET, expected: EXPECTED });
  assert.equal(first.ok, true);

  const second = await useCases.consume({ token, secret: SECRET, expected: EXPECTED });
  assert.deepEqual(second, { ok: false, error: "ALREADY_CONSUMED" });
});

test("a tampered token is rejected as INVALID_TOKEN — the repository is never even reached", async () => {
  const repo = createFakeRepo();
  const useCases = new GameAttemptUseCases(repo);
  const token = await signGameSession(samplePayload(), SECRET);
  const tampered = tamperSignedToken(token);

  const result = await useCases.consume({ token: tampered, secret: SECRET, expected: EXPECTED });
  assert.deepEqual(result, { ok: false, error: "INVALID_TOKEN" });
  assert.deepEqual(repo.consumedIds, []);
});

test("an expired token is rejected as INVALID_TOKEN", async () => {
  const repo = createFakeRepo();
  const useCases = new GameAttemptUseCases(repo);
  const token = await signGameSession(
    samplePayload({ exp: Math.floor(Date.now() / 1000) - 10 }),
    SECRET,
  );

  const result = await useCases.consume({ token, secret: SECRET, expected: EXPECTED });
  assert.deepEqual(result, { ok: false, error: "INVALID_TOKEN" });
  assert.deepEqual(repo.consumedIds, []);
});

test("a token issued for a different user is rejected as CONTEXT_MISMATCH — the repository is never reached", async () => {
  const repo = createFakeRepo();
  const useCases = new GameAttemptUseCases(repo);
  const token = await signGameSession(samplePayload({ userId: 999 }), SECRET);

  const result = await useCases.consume({ token, secret: SECRET, expected: EXPECTED });
  assert.deepEqual(result, { ok: false, error: "CONTEXT_MISMATCH" });
  assert.deepEqual(repo.consumedIds, []);
});

test("a token issued for a different game is rejected as CONTEXT_MISMATCH", async () => {
  const repo = createFakeRepo();
  const useCases = new GameAttemptUseCases(repo);
  const token = await signGameSession(samplePayload({ gameId: 12345 }), SECRET);

  const result = await useCases.consume({ token, secret: SECRET, expected: EXPECTED });
  assert.deepEqual(result, { ok: false, error: "CONTEXT_MISMATCH" });
  assert.deepEqual(repo.consumedIds, []);
});

test("a token issued for a different (stale) version is rejected as CONTEXT_MISMATCH", async () => {
  const repo = createFakeRepo();
  const useCases = new GameAttemptUseCases(repo);
  const token = await signGameSession(samplePayload({ versionId: 999 }), SECRET);

  const result = await useCases.consume({ token, secret: SECRET, expected: EXPECTED });
  assert.deepEqual(result, { ok: false, error: "CONTEXT_MISMATCH" });
  assert.deepEqual(repo.consumedIds, []);
});
