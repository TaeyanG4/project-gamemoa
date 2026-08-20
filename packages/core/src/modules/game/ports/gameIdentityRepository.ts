/**
 * Unified Game Platform, Stage A-1 — persistence port for Game Identity & runtime state.
 *
 * Provider-neutral port through which a future `RuntimeGameRegistry` reads game identity and
 * runtime availability from D1.
 *
 * Method semantics:
 * - `findById(id)`: Looks up a game by primary key. Returns its `GameIdentity` (including
 *   its `deletedAt` timestamp if soft-deleted); returns `null` if no row exists with that `id`.
 * - `findBySlug(slug)`: Runtime lookup by slug. Returns the active `GameIdentity` matching `slug`
 *   whose `deleted_at IS NULL`; returns `null` if absent or soft-deleted.
 * - `listAll()`: Runtime candidate identity enumeration. Returns all active (`deleted_at IS NULL`)
 *   game identities. Excludes soft-deleted rows so runtime enumerations never surface deleted games.
 */

import type { GameIdentity } from "../domain/gameIdentity.js";

export interface GameIdentityRepository {
  /**
   * Looks up a game by primary key `id`.
   * Returns its `GameIdentity` (including `deletedAt` if soft-deleted), or `null` if not found.
   */
  findById(id: number): Promise<GameIdentity | null>;

  /**
   * Looks up an active game by its unique `slug`.
   * Soft-deleted games (`deleted_at IS NOT NULL`) return `null` so they stop resolving in runtime.
   */
  findBySlug(slug: string): Promise<GameIdentity | null>;

  /**
   * Enumerates all active game identities for runtime candidates.
   * Excludes soft-deleted games (`deleted_at IS NULL`).
   */
  listAll(): Promise<readonly GameIdentity[]>;
}
