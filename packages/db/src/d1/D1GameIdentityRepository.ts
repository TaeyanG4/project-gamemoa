import {
  isValidGameIdentity,
  type GameIdentity,
  type GameIdentityRepository,
  type GamePublisher,
} from "@owogg/core";
import type { D1Database } from "./D1UserRepository.js";

/**
 * Projects a raw `games` generic D1 row to a domain `GameIdentity`.
 *
 * Invariants enforced (fail-closed, no silent data repairs):
 * - `id` is a positive finite integer.
 * - `slug` is a non-empty string matching its exact representation (no whitespace padding).
 * - `publisher_type` is strictly "OWOGG" | "USER".
 * - If `publisher_type === "OWOGG"`, `publisher_user_id` must be null/undefined -> `{ type: "OWOGG" }`.
 * - If `publisher_type === "USER"`, `publisher_user_id` must be a positive finite integer -> `{ type: "USER", userId }`.
 * - `visibility` is strictly "PRIVATE" | "PUBLIC".
 * - `live_version_id` is null or a positive finite integer.
 * - PUBLIC visibility requires a non-null `live_version_id`.
 * - `deleted_at` is null/undefined or a non-empty string preserved exact as-is (throws on malformed types).
 * - `created_at` and `updated_at` are non-empty strings.
 * - Resulting object satisfies `isValidGameIdentity`.
 *
 * Deliberately excludes all canonical metadata (title, genre, mode, score*, xp*) and
 * all UGC review workflow columns.
 */
export function mapGameIdentityRow(row: Record<string, unknown>): GameIdentity {
  const id = row.id;
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid or missing game id in games row: ${String(row.id)}`);
  }

  const slug = row.slug;
  if (typeof slug !== "string" || slug.length === 0 || slug !== slug.trim()) {
    throw new Error(`Invalid or malformed game slug in games row: ${String(row.slug)}`);
  }

  const publisherType = row.publisher_type;
  if (publisherType !== "OWOGG" && publisherType !== "USER") {
    throw new Error(
      `Invalid publisher_type in games row for game "${slug}": ${String(publisherType)}`,
    );
  }

  let publisher: GamePublisher;
  if (publisherType === "OWOGG") {
    if (row.publisher_user_id !== null && row.publisher_user_id !== undefined) {
      throw new Error(
        `OWOGG publisher must not have publisher_user_id in games row for game "${slug}"`,
      );
    }
    publisher = { type: "OWOGG" };
  } else {
    const publisherUserId = row.publisher_user_id;
    if (
      typeof publisherUserId !== "number" ||
      !Number.isInteger(publisherUserId) ||
      publisherUserId <= 0
    ) {
      throw new Error(
        `USER publisher must have a positive integer publisher_user_id in games row for game "${slug}": ${String(publisherUserId)}`,
      );
    }
    publisher = { type: "USER", userId: publisherUserId };
  }

  const visibility = row.visibility;
  if (visibility !== "PRIVATE" && visibility !== "PUBLIC") {
    throw new Error(`Invalid visibility in games row for game "${slug}": ${String(visibility)}`);
  }

  let liveVersionId: number | null = null;
  if (row.live_version_id !== null && row.live_version_id !== undefined) {
    const parsed = row.live_version_id;
    if (typeof parsed !== "number" || !Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(
        `Invalid live_version_id in games row for game "${slug}": ${String(row.live_version_id)}`,
      );
    }
    liveVersionId = parsed;
  }

  if (visibility === "PUBLIC" && liveVersionId === null) {
    throw new Error(
      `Invalid runtime state: PUBLIC game "${slug}" must have a non-null live_version_id`,
    );
  }

  let deletedAt: string | null = null;
  if (row.deleted_at !== null && row.deleted_at !== undefined) {
    if (typeof row.deleted_at !== "string" || row.deleted_at.length === 0) {
      throw new Error(
        `Invalid deleted_at in games row for game "${slug}": ${String(row.deleted_at)}`,
      );
    }
    deletedAt = row.deleted_at;
  }

  const createdAt = row.created_at;
  const updatedAt = row.updated_at;
  if (
    typeof createdAt !== "string" ||
    createdAt.length === 0 ||
    typeof updatedAt !== "string" ||
    updatedAt.length === 0
  ) {
    throw new Error(`Missing timestamp in games row for game "${slug}"`);
  }

  const identity: GameIdentity = {
    id,
    slug,
    publisher,
    visibility,
    liveVersionId,
    deletedAt,
    createdAt,
    updatedAt,
  };

  if (!isValidGameIdentity(identity)) {
    throw new Error(`Constructed GameIdentity failed domain validation for game "${slug}"`);
  }

  return identity;
}

/**
 * Legacy/transitional mapper from `sandbox_games` rows, kept for backfill parity verification.
 */
export function mapSandboxGameIdentityRow(row: Record<string, unknown>): GameIdentity {
  const id = Number(row.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid or missing game id in D1 row: ${String(row.id)}`);
  }

  if (typeof row.slug !== "string" || row.slug.length === 0 || row.slug !== row.slug.trim()) {
    throw new Error(`Invalid or malformed game slug in D1 row: ${String(row.slug)}`);
  }
  const slug = row.slug;

  const developerUserId = Number(row.developer_user_id);
  if (!Number.isInteger(developerUserId) || developerUserId <= 0) {
    throw new Error(
      `Invalid developer_user_id in D1 row for game "${slug}": ${String(row.developer_user_id)}`,
    );
  }

  const visibility = row.visibility;
  if (visibility !== "PRIVATE" && visibility !== "PUBLIC") {
    throw new Error(`Invalid visibility in D1 row for game "${slug}": ${String(visibility)}`);
  }

  let liveVersionId: number | null = null;
  if (row.live_version_id !== null && row.live_version_id !== undefined) {
    const parsed = Number(row.live_version_id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(
        `Invalid live_version_id in D1 row for game "${slug}": ${String(row.live_version_id)}`,
      );
    }
    liveVersionId = parsed;
  }

  if (visibility === "PUBLIC" && liveVersionId === null) {
    throw new Error(
      `Invalid runtime state: PUBLIC game "${slug}" must have a non-null live_version_id`,
    );
  }

  let deletedAt: string | null = null;
  if (row.deleted_at !== null && row.deleted_at !== undefined) {
    if (typeof row.deleted_at !== "string" || row.deleted_at.length === 0) {
      throw new Error(`Invalid deleted_at in D1 row for game "${slug}": ${String(row.deleted_at)}`);
    }
    deletedAt = row.deleted_at;
  }

  const createdAt =
    typeof row.created_at === "string" && row.created_at.length > 0 ? row.created_at : "";
  const updatedAt =
    typeof row.updated_at === "string" && row.updated_at.length > 0 ? row.updated_at : "";

  if (!createdAt || !updatedAt) {
    throw new Error(`Missing timestamp in D1 row for game "${slug}"`);
  }

  const identity: GameIdentity = {
    id,
    slug,
    publisher: {
      type: "USER",
      userId: developerUserId,
    },
    visibility,
    liveVersionId,
    deletedAt,
    createdAt,
    updatedAt,
  };

  if (!isValidGameIdentity(identity)) {
    throw new Error(`Constructed GameIdentity failed domain validation for game "${slug}"`);
  }

  return identity;
}

const GENERIC_GAMES_SELECT_COLUMNS =
  "id, slug, publisher_type, publisher_user_id, visibility, live_version_id, deleted_at, created_at, updated_at";

/**
 * Unified Game Platform, Stage A-2 — D1 adapter for GameIdentityRepository.
 *
 * Reads game identity and runtime state from the generic D1 `games` table.
 *
 * Query semantics:
 * - `findById(id)`: Looks up row by primary key. Returns `GameIdentity` (including `deletedAt`
 *   if soft-deleted) or `null` if not found.
 * - `findBySlug(slug)`: Runtime slug resolution. Returns active `GameIdentity` (`deleted_at IS NULL`)
 *   or `null` if absent or soft-deleted.
 * - `listAll()`: Runtime candidate identity enumeration. Returns active game identities
 *   (`deleted_at IS NULL`), ordered by `created_at DESC` matching existing D1 query ordering.
 *   Excludes soft-deleted rows.
 */
export class D1GameIdentityRepository implements GameIdentityRepository {
  constructor(private db: D1Database) {}

  async findById(id: number): Promise<GameIdentity | null> {
    const row = await this.db
      .prepare(`SELECT ${GENERIC_GAMES_SELECT_COLUMNS} FROM games WHERE id = ?`)
      .bind(id)
      .first<Record<string, unknown>>();
    return row ? mapGameIdentityRow(row) : null;
  }

  async findBySlug(slug: string): Promise<GameIdentity | null> {
    const row = await this.db
      .prepare(
        `SELECT ${GENERIC_GAMES_SELECT_COLUMNS} FROM games WHERE slug = ? AND deleted_at IS NULL`,
      )
      .bind(slug)
      .first<Record<string, unknown>>();
    return row ? mapGameIdentityRow(row) : null;
  }

  async listAll(): Promise<readonly GameIdentity[]> {
    const res = await this.db
      .prepare(
        `SELECT ${GENERIC_GAMES_SELECT_COLUMNS} FROM games WHERE deleted_at IS NULL ORDER BY created_at DESC`,
      )
      .all<Record<string, unknown>>();
    return (res.results || []).map(mapGameIdentityRow);
  }
}
