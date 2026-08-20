import type { RuntimeGame } from "../domain/runtimeGame.js";

/** Read-only boundary for resolving a currently playable game, regardless of publisher. */
export interface RuntimeGameRegistry {
  /** Returns null for every unavailable or malformed runtime state. Never falls back to legacy
   * publisher-specific metadata when generic persistence is incomplete. */
  findBySlug(slug: string): Promise<RuntimeGame | null>;

  /** Enumerates generic runtime candidates using the same identity/version/canonical join as
   * findBySlug. Private, deleted, non-live, non-READY, missing, or malformed entries are omitted
   * fail-closed; D1 kill-switch state is applied by RuntimeGameAvailability at the caller. */
  listPublic(): Promise<readonly RuntimeGame[]>;
}
