import test from "node:test";
import assert from "node:assert/strict";
import { createGameScoreFlow } from "../features/game/gameScoreFlow";

// gameScoreFlow.ts is the framework-free controller GameHost.tsx wraps — see that
// module's own doc comment for why this is a plain factory function rather than a hook (apps/web
// has no component-render test harness; gameBridgeEndToEnd.test.ts is the established precedent
// for testing this kind of orchestration directly, without a DOM). This file covers the PR's own
// required scenarios (play session -> COMPLETE -> score saved once; retry -> new session;
// duplicate COMPLETE -> no duplicate score) plus the surrounding auth/failure edges.

function createFakeDeps() {
  let sessionCounter = 0;
  const issuedTokens: string[] = [];
  const acceptedCalls: Array<{ slug: string; token: string; score: number }> = [];
  const consumedTokens = new Set<string>();

  async function fetchGameSession() {
    sessionCounter += 1;
    const token = `token-${sessionCounter}`;
    issuedTokens.push(token);
    return { token, expiresAt: new Date(Date.now() + 300_000).toISOString() };
  }

  async function acceptScore(slug: string, input: { token: string; score: number }) {
    acceptedCalls.push({ slug, token: input.token, score: input.score });
    // Mirrors the server's own one-time-consumption guarantee (D1GameScoreAcceptanceRepository)
    // at this fake's level — a second call with an already-spent token is rejected, the same shape
    // of failure a real ALREADY_CONSUMED response would produce.
    if (consumedTokens.has(input.token)) {
      throw new Error("이미 처리된 플레이입니다.");
    }
    consumedTokens.add(input.token);
    return { success: true as const };
  }

  return { fetchGameSession, acceptScore, issuedTokens, acceptedCalls };
}

/** A promise this test controls the settlement of — for scenarios that need an async response
 * to stay pending until the test has set up a later event (a retry, a second response arriving
 * first), rather than resolving as soon as it's awaited. */
function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function createFlow(deps: ReturnType<typeof createFakeDeps>, slug = "ball-dodge") {
  const statuses: Array<{ state: string; message?: string }> = [];
  const flow = createGameScoreFlow(
    {
      slug,
      // Indirected through deps rather than binding deps.fetchGameSession/acceptScore directly —
      // some tests reassign those fields on an already-created flow (see the "rejected score
      // submission" test below), which only works if the flow keeps calling back through deps
      // itself instead of a snapshot taken at creation time.
      fetchGameSession: () => deps.fetchGameSession(),
      acceptScore: (s, input) => deps.acceptScore(s, input),
    },
    {
      onStatusChange: (state, message) => statuses.push({ state, ...(message ? { message } : {}) }),
    },
  );
  return { flow, statuses };
}

test("play session -> GAME_COMPLETE with a score -> the score is saved exactly once", async () => {
  const deps = createFakeDeps();
  const { flow, statuses } = createFlow(deps);

  await flow.startAttempt(true);
  await flow.handleComplete(true, { score: 42 });

  assert.deepEqual(deps.acceptedCalls, [{ slug: "ball-dodge", token: "token-1", score: 42 }]);
  assert.deepEqual(
    statuses.map((s) => s.state),
    ["idle", "submitting", "success"],
  );
});

test("retry issues a brand-new session — the next attempt never reuses a spent or stale token", async () => {
  const deps = createFakeDeps();
  const { flow } = createFlow(deps);

  await flow.startAttempt(true); // attempt 1
  await flow.handleComplete(true, { score: 10 });

  await flow.startAttempt(true); // retry -> attempt 2, a fresh fetchGameSession call
  await flow.handleComplete(true, { score: 20 });

  assert.equal(deps.issuedTokens.length, 2, "one fetchGameSession call per attempt");
  assert.notEqual(deps.issuedTokens[0], deps.issuedTokens[1]);
  assert.deepEqual(
    deps.acceptedCalls.map((c) => c.token),
    ["token-1", "token-2"],
    "each attempt submits with its own attempt's token, never the previous one",
  );
});

test("a duplicate GAME_COMPLETE for the same attempt never reaches the network twice", async () => {
  const deps = createFakeDeps();
  const { flow } = createFlow(deps);

  await flow.startAttempt(true);
  await flow.handleComplete(true, { score: 5 });
  // Simulates a buggy/compromised game bypassing the Bridge's own duplicate guard
  // (gameBridgeHost.ts) and somehow reaching this controller a second time for the same attempt.
  await flow.handleComplete(true, { score: 999 });

  assert.equal(deps.acceptedCalls.length, 1, "exactly one network call for this attempt");
  assert.equal(
    deps.acceptedCalls[0]?.score,
    5,
    "the duplicate call's score must never overwrite the first",
  );
});

test("an anonymous player never triggers a session fetch or a score submission", async () => {
  const deps = createFakeDeps();
  const { flow, statuses } = createFlow(deps);

  await flow.startAttempt(false);
  await flow.handleComplete(false, { score: 30 });

  assert.equal(deps.issuedTokens.length, 0);
  assert.equal(deps.acceptedCalls.length, 0);
  assert.deepEqual(
    statuses.map((s) => s.state),
    ["idle", "guest"],
  );
});

test("a login state that flips to logged-out between attempt start and GAME_COMPLETE is treated as guest, even though a token was held", async () => {
  const deps = createFakeDeps();
  const { flow, statuses } = createFlow(deps);

  await flow.startAttempt(true); // logged in at attempt start — a token IS fetched and held
  await flow.handleComplete(false, { score: 15 }); // logged out by the time the round ends

  assert.equal(deps.issuedTokens.length, 1, "the session fetch at attempt start still happened");
  assert.equal(
    deps.acceptedCalls.length,
    0,
    "but a live logged-out read at completion blocks submission",
  );
  assert.deepEqual(
    statuses.map((s) => s.state),
    ["idle", "guest"],
  );
});

test("a GAME_COMPLETE with no score is a no-op — nothing to submit, no status change", async () => {
  const deps = createFakeDeps();
  const { flow, statuses } = createFlow(deps);

  await flow.startAttempt(true);
  statuses.length = 0; // only care about what handleComplete itself does below
  await flow.handleComplete(true, { metadata: { foo: "bar" } });

  assert.equal(deps.acceptedCalls.length, 0);
  assert.deepEqual(statuses, []);
});

test("a failed session fetch never blocks gameplay — GAME_COMPLETE with a score reports a save failure instead of throwing", async () => {
  const deps = createFakeDeps();
  deps.fetchGameSession = async () => {
    throw new Error("network down");
  };
  const { flow, statuses } = createFlow(deps);

  await flow.startAttempt(true);
  await flow.handleComplete(true, { score: 7 });

  assert.equal(
    deps.acceptedCalls.length,
    0,
    "no token was ever held, so no submission is attempted",
  );
  assert.deepEqual(
    statuses.map((s) => s.state),
    ["idle", "error"],
  );
});

test("a rejected score submission (e.g. ALREADY_CONSUMED, an out-of-policy score) reports 'error' with the server's own message, and the local result is untouched by this module either way", async () => {
  const deps = createFakeDeps();
  const { flow, statuses } = createFlow(deps);

  await flow.startAttempt(true);
  await flow.handleComplete(true, { score: 5 });
  await flow.startAttempt(true); // retry — fresh token

  // Force the underlying call to reject this attempt's token, as a server-side
  // SCORE_POLICY_NOT_CONFIGURED/INVALID_SCORE/ALREADY_CONSUMED rejection would.
  deps.acceptScore = async () => {
    throw new Error("이 게임은 아직 점수 제출을 지원하지 않습니다.");
  };
  await flow.handleComplete(true, { score: 8 });

  const last = statuses.at(-1);
  assert.equal(last?.state, "error");
  assert.equal(last?.message, "이 게임은 아직 점수 제출을 지원하지 않습니다.");
});

// ── attempt generation: async race safety ─────────────────────────────────────

test("1) a slow session A response never overwrites B's already-held token — only B's token is ever submitted", async () => {
  const deps = createFakeDeps();
  const deferredA = createDeferred<{ token: string; expiresAt: string }>();
  let fetchCallCount = 0;
  deps.fetchGameSession = async () => {
    fetchCallCount += 1;
    if (fetchCallCount === 1) return deferredA.promise; // attempt A — stays pending
    return { token: `token-B-${fetchCallCount}`, expiresAt: new Date().toISOString() };
  };
  const { flow } = createFlow(deps);

  const startA = flow.startAttempt(true); // fetch #1 registered, pending
  const startB = flow.startAttempt(true); // retry — fetch #2 registered, resolves promptly
  await startB; // B's own token is now held

  // A's slow session response finally arrives, well after B has already taken over.
  deferredA.resolve({ token: "token-A-stale", expiresAt: new Date().toISOString() });
  await startA;

  await flow.handleComplete(true, { score: 42 });

  assert.equal(deps.acceptedCalls.length, 1);
  assert.equal(deps.acceptedCalls[0]?.token, "token-B-2", "only B's token is ever submitted");
});

test("2) GAME_COMPLETE finishing before the session fetch returns means that late token is never used", async () => {
  const deps = createFakeDeps();
  const deferred = createDeferred<{ token: string; expiresAt: string }>();
  deps.fetchGameSession = async () => deferred.promise;
  const { flow, statuses } = createFlow(deps);

  const startPromise = flow.startAttempt(true); // fetch registered, still pending
  await flow.handleComplete(true, { score: 10 }); // no token held yet -> reported as a save failure

  assert.deepEqual(
    statuses.map((s) => s.state),
    ["idle", "error"],
  );
  assert.equal(deps.acceptedCalls.length, 0);

  // The slow session response finally arrives, after this attempt already finished.
  deferred.resolve({ token: "late-token", expiresAt: new Date().toISOString() });
  await startPromise;

  // Arriving late changes nothing observable — no new status, and (since nothing in this module
  // ever re-triggers a submission on its own) no way for "late-token" to ever reach the network.
  assert.deepEqual(
    statuses.map((s) => s.state),
    ["idle", "error"],
  );
  assert.equal(deps.acceptedCalls.length, 0);
});

test("3) A's pending acceptScore resolving after B's retry never changes B's status", async () => {
  const deps = createFakeDeps();
  const deferredAccept = createDeferred<{ success: true }>();
  let acceptCallCount = 0;
  deps.acceptScore = async (slug, input) => {
    acceptCallCount += 1;
    deps.acceptedCalls.push({ slug, token: input.token, score: input.score });
    if (acceptCallCount === 1) return deferredAccept.promise; // A's submission — stays pending
    return { success: true as const };
  };
  const { flow, statuses } = createFlow(deps);

  await flow.startAttempt(true); // attempt A
  const completeA = flow.handleComplete(true, { score: 10 }); // fires A's acceptScore (pending)

  await flow.startAttempt(true); // retry — attempt B starts while A is still in flight
  statuses.length = 0; // only care about what happens to B's status from here on

  // A's pending submission finally resolves, well after B has already taken over.
  deferredAccept.resolve({ success: true });
  await completeA;

  // assert.equal on .length rather than deepEqual(statuses, []) — the latter's TS signature
  // (deepStrictEqual<T>(actual, expected): asserts actual is T) would narrow `statuses` itself
  // to `never[]` for the rest of this test, breaking the `.map()` call below.
  assert.equal(statuses.length, 0, "A's late success must never touch B's status");

  // B's own lifecycle keeps working normally afterward, unaffected by A's stale resolution.
  await flow.handleComplete(true, { score: 20 });
  assert.deepEqual(
    statuses.map((s) => s.state),
    ["submitting", "success"],
  );
});

test("different game slugs never cross-contaminate a held token", async () => {
  const deps = createFakeDeps();
  const { flow: flowA } = createFlow(deps, "ball-dodge");
  const { flow: flowB } = createFlow(deps, "memory-match");

  await flowA.startAttempt(true);
  await flowB.startAttempt(true);
  await flowA.handleComplete(true, { score: 1 });
  await flowB.handleComplete(true, { score: 2 });

  assert.deepEqual(
    deps.acceptedCalls.map((c) => c.slug),
    ["ball-dodge", "memory-match"],
  );
});
