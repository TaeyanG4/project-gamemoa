/**
 * Pure, framework-free controller connecting CreatorGameHost's play lifecycle to the Game
 * Session + Creator score acceptance endpoints. Deliberately not a React hook: apps/web's test
 * suite has no DOM/component renderer (see gameHostMetadata.test.ts's own doc comment, and
 * gameBridgeHost.ts for the established precedent of pulling exactly this kind of orchestration
 * out into a plain, dependency-injected factory function so it can be unit-tested directly —
 * creatorScoreFlow.test.ts is this module's counterpart to gameBridgeEndToEnd.test.ts).
 * CreatorGameHost.tsx holds one instance and forwards its status callback into React state,
 * mirroring exactly how IframeRuntime.tsx wraps createGameBridgeHost.
 *
 * Lifecycle contract:
 * - startAttempt() once per attempt (component mount AND every retry) — fetches a fresh Game
 *   Session token for an authenticated caller and holds it internally. The token NEVER leaves
 *   this module: it is not returned, not logged, and CreatorGameHost must never pass it to
 *   IframeRuntime/HOST_INIT — the iframe has no legitimate use for it and every check that
 *   matters (PUBLIC + live version, session validity, context match, score policy, one-time
 *   consumption) happens server-side regardless of what the iframe does or doesn't send.
 * - handleComplete() once per GAME_COMPLETE — submits the currently-held token's score, if any
 *   is present and the caller is authenticated. The token is spent from this controller's own
 *   state immediately (before the network call resolves), so a second handleComplete() for the
 *   same attempt — whether a genuine duplicate GAME_COMPLETE from a buggy/compromised game, or
 *   this module being called twice for any other reason — can never reach the network a second
 *   time. The server's own one-time attemptId consumption (packages/core's
 *   CreatorScoreAcceptanceUseCases) is the real, authoritative guarantee; this is defense in
 *   depth at the layer closest to the UI, not a replacement for it.
 * - A failed fetchGameSession or acceptScore call never throws out of either method — gameplay
 *   itself (the local result CreatorGameHost already rendered) must survive a session/scoring
 *   failure untouched. Failure is reported only through onStatusChange, for the result screen to
 *   show.
 *
 * Attempt generation (async race safety): every startAttempt() call bumps an internal `generation`
 * counter, and every async continuation (a fetchGameSession or acceptScore promise resolving)
 * captures the generation it started under and re-checks it before touching any shared state or
 * firing a callback. This closes three races that spentForThisAttempt/heldToken alone don't:
 *  1. A slow fetchGameSession from a PREVIOUS attempt resolving after a retry has already started
 *     a new one must not overwrite the new attempt's already-held (or still-pending) token.
 *  2. A fetchGameSession that resolves AFTER handleComplete already ran for this same attempt
 *     (GAME_COMPLETE arrived before the session did — a real ordering the game and the session
 *     fetch race against each other, with no guarantee either wins) must not retroactively stash
 *     a token nothing will ever knowingly submit with.
 *  3. A slow acceptScore from a PREVIOUS attempt resolving after a retry must not flip the result
 *     screen's status back to that attempt's success/error — the screen belongs to whichever
 *     attempt is current now.
 * In every case the discard is silent: no callback fires, no state changes. This is purely a
 * same-process async-ordering guard — it has nothing to do with, and does not replace, the
 * server's own one-time attemptId consumption, which is what actually prevents two different
 * attempts from both landing a score.
 */

export type CreatorScoreSubmissionState = "idle" | "guest" | "submitting" | "success" | "error";

export interface CreatorScoreFlowDeps {
  slug: string;
  fetchGameSession: (
    slug: string,
    difficulty?: string,
  ) => Promise<{ token: string; expiresAt: string }>;
  acceptScore: (
    slug: string,
    input: { token: string; score: number; difficulty?: string },
  ) => Promise<{ success: true }>;
}

export interface CreatorScoreFlowCallbacks {
  onStatusChange: (state: CreatorScoreSubmissionState, message?: string) => void;
}

export interface CreatorScoreFlow {
  startAttempt(authenticated: boolean, difficulty?: string): Promise<void>;
  handleComplete(
    authenticated: boolean,
    result: { score?: number; metadata?: Record<string, unknown> },
  ): Promise<void>;
}

export function createCreatorScoreFlow(
  deps: CreatorScoreFlowDeps,
  callbacks: CreatorScoreFlowCallbacks,
): CreatorScoreFlow {
  let heldToken: string | null = null;
  let heldDifficulty = "normal";
  let spentForThisAttempt = false;
  // Bumped by every startAttempt() call — see this module's own doc comment ("Attempt
  // generation") for what this guards against and why spentForThisAttempt/heldToken alone can't.
  let generation = 0;

  async function startAttempt(authenticated: boolean, difficulty = "normal"): Promise<void> {
    generation += 1;
    const myGeneration = generation;

    heldToken = null;
    heldDifficulty = difficulty;
    spentForThisAttempt = false;
    callbacks.onStatusChange("idle");

    // Anonymous play stays unranked (no session to fetch, nothing to hold) — handleComplete()
    // reports "guest" on its own when the round ends, so nothing further is needed here.
    if (!authenticated) return;

    let session: { token: string };
    try {
      session = await deps.fetchGameSession(deps.slug, difficulty);
    } catch {
      // Session issuance failing must not block gameplay — the iframe was never waiting on this.
      // handleComplete() below simply has no token to submit with when this attempt ends, and
      // reports that as a save failure at that point instead. Only clear heldToken if this
      // response is still the current attempt's own — see the success path below for why.
      if (myGeneration === generation && !spentForThisAttempt) heldToken = null;
      return;
    }

    // Discard a stale response: either a newer attempt has since started (a retry beat this
    // fetch back), or GAME_COMPLETE already ran for this very attempt before this fetch
    // returned (spentForThisAttempt) — in both cases nothing may ever knowingly submit with
    // this token, so it is never stored.
    if (myGeneration !== generation || spentForThisAttempt) return;
    heldToken = session.token;
  }

  async function handleComplete(
    authenticated: boolean,
    result: { score?: number; metadata?: Record<string, unknown> },
  ): Promise<void> {
    const myGeneration = generation;

    // Read live, at completion time — not a value frozen at attempt start. Same rationale as
    // GameHost's runtime.complete(): a snapshot taken at round-start can go stale if login state
    // changes mid-round, and the live value is always the correct one to act on.
    if (!authenticated) {
      callbacks.onStatusChange("guest");
      return;
    }

    // Nothing to submit — this Creator game's round didn't produce a score.
    if (result.score === undefined) return;

    // Duplicate GAME_COMPLETE for this attempt — never reach the network twice. See this
    // module's own doc comment for why this exists alongside (not instead of) the server's own
    // one-time consumption guarantee.
    if (spentForThisAttempt) return;

    const token = heldToken;
    spentForThisAttempt = true;
    heldToken = null;

    if (!token) {
      callbacks.onStatusChange("error");
      return;
    }

    callbacks.onStatusChange("submitting");
    try {
      await deps.acceptScore(deps.slug, {
        token,
        score: result.score,
        difficulty: heldDifficulty,
      });
      // A retry may have started (and possibly already finished) a whole new attempt while this
      // call was in flight — the result screen belongs to that attempt now, not this one.
      if (myGeneration !== generation) return;
      callbacks.onStatusChange("success");
    } catch (err) {
      if (myGeneration !== generation) return;
      callbacks.onStatusChange("error", err instanceof Error ? err.message : undefined);
    }
  }

  return { startAttempt, handleComplete };
}
