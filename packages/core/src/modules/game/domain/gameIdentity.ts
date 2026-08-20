/**
 * Unified Game Platform, Stage A-1 — provider-neutral Game Identity & runtime state model.
 *
 * Expresses "WHO published this game and HOW it runs in the current platform runtime",
 * distinct from B2's `GameCanonicalDocument` ("WHAT the game is" — title, description,
 * score policy, presentation, catalog taxonomy).
 *
 * Deliberately minimal:
 * - Contains only identity (`id`, `slug`), publisher authority (`publisher`), runtime visibility
 *   (`visibility`), live version pointer (`liveVersionId`), soft-delete status (`deletedAt`), and
 *   audit timestamps (`createdAt`, `updatedAt`).
 * - Excludes all B2 canonical metadata (title, shortDescription, description, genre, mode,
 *   categories, tags, difficulty, score, leaderboard, xpPerCompletion, presentation).
 * - Excludes all UGC review workflow lifecycle fields (reviewSlot, reviewedByAdminId,
 *   rejectReason, deletedByAdminId, logoKey).
 */

import type { GamePublisher } from "./gamePublisher.js";

export interface GameIdentity {
  readonly id: number;
  readonly slug: string;
  readonly publisher: GamePublisher;

  readonly visibility: "PRIVATE" | "PUBLIC";
  readonly liveVersionId: number | null;

  readonly deletedAt: string | null;

  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Validates whether a value satisfies the structural and domain invariants of a `GameIdentity`.
 * Fail-closed: returns false for any missing/malformed field, non-positive integer id/userId,
 * or unexpected visibility value.
 */
export function isValidGameIdentity(value: unknown): value is GameIdentity {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<GameIdentity>;

  if (typeof candidate.id !== "number" || !Number.isInteger(candidate.id) || candidate.id <= 0) {
    return false;
  }

  if (typeof candidate.slug !== "string" || candidate.slug.trim().length === 0) {
    return false;
  }

  if (!candidate.publisher || typeof candidate.publisher !== "object") {
    return false;
  }

  if (candidate.publisher.type === "OWOGG") {
    // OWOGG publisher has no extra relational fields.
  } else if (candidate.publisher.type === "USER") {
    const userId = candidate.publisher.userId;
    if (typeof userId !== "number" || !Number.isInteger(userId) || userId <= 0) {
      return false;
    }
  } else {
    return false;
  }

  if (candidate.visibility !== "PRIVATE" && candidate.visibility !== "PUBLIC") {
    return false;
  }

  if (
    candidate.liveVersionId !== null &&
    (typeof candidate.liveVersionId !== "number" ||
      !Number.isInteger(candidate.liveVersionId) ||
      candidate.liveVersionId <= 0)
  ) {
    return false;
  }

  if (
    candidate.deletedAt !== null &&
    (typeof candidate.deletedAt !== "string" || candidate.deletedAt.length === 0)
  ) {
    return false;
  }

  if (
    typeof candidate.createdAt !== "string" ||
    candidate.createdAt.length === 0 ||
    typeof candidate.updatedAt !== "string" ||
    candidate.updatedAt.length === 0
  ) {
    return false;
  }

  return true;
}
