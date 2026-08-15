import { createContainer, type AppContainer } from "./container.js";
import type { D1Database as WorkersD1Database } from "@cloudflare/workers-types";

/**
 * Builds a container whose reads may be served by a D1 read replica instead of the primary.
 *
 * D1 keeps one writable primary and (when read replication is enabled on the database) read-only
 * replicas in several regions. Replicas are only ever used when queries go through the Sessions
 * API — `env.DB.prepare(...)` directly always hits the primary. `withSession("first-unconstrained")`
 * opts a request into "any instance is fine to start from", which is what lets a read be answered
 * near the visitor instead of queueing behind every other query on the single primary.
 *
 * ⚠️ ONLY FOR STALENESS-TOLERANT PUBLIC READS. A replica can lag the primary, so this must never
 * back a read whose correctness depends on seeing the newest write:
 *
 *   ✅ safe:   public leaderboards / rankings (already served with a 30-60s edge cache, so they
 *              are explicitly allowed to lag by that much anyway — a replica adds nothing worse)
 *   ❌ unsafe: session lookup (D1SessionRepository.findSession). A user who just logged in — a
 *              write to the primary — could hit a replica that has not caught up, find no session
 *              row, and be told they are logged out. Auth stays on the primary deliberately.
 *              Making that path replica-safe requires threading D1 session *bookmarks* through
 *              the client between requests, which is a separate change, not a config flip.
 *   ❌ unsafe: anything that reads back a value it just wrote in the same request.
 *
 * Writes are unaffected either way: D1 always routes writes to the primary regardless of session
 * constraint, so there is no risk of a write landing on a replica.
 *
 * Falls back to the plain binding when `withSession` is unavailable (test doubles, older
 * runtimes), and is a no-op improvement — not an error — on databases that simply do not have
 * read replication enabled yet: the Sessions API is documented to work on those too, it just has
 * no replica to choose.
 */
export function createReadContainer(db: unknown): AppContainer {
  const maybeReplicated = db as Partial<WorkersD1Database>;

  if (typeof maybeReplicated?.withSession !== "function") {
    return createContainer(db as never);
  }

  // "first-unconstrained": let the first query land on whichever instance is closest/available
  // rather than forcing a round trip to the primary region.
  const session = maybeReplicated.withSession("first-unconstrained");
  return createContainer(session as never);
}
