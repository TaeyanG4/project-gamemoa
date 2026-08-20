import {
  isValidGameVersion,
  type GameVersion,
  type GameVersionPublishStatus,
  type GameVersionRepository,
} from "@owogg/core";
import type { D1Database } from "./D1UserRepository.js";

const GAME_VERSION_SELECT_COLUMNS =
  "id, game_id, object_key, content_hash, bundle_bytes, publish_status, publish_error, published_at, manifest_key, published_size_bytes, file_count, uploaded_at";

function requiredPositiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid ${field} in game_versions row: ${String(value)}`);
  }
  return value;
}

function requiredNonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid ${field} in game_versions row: ${String(value)}`);
  }
  return value;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid ${field} in game_versions row: ${String(value)}`);
  }
  return value;
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  return requiredString(value, field);
}

function nullableNonNegativeInteger(value: unknown, field: string): number | null {
  if (value === null || value === undefined) return null;
  return requiredNonNegativeInteger(value, field);
}

export function mapGameVersionRow(row: Record<string, unknown>): GameVersion {
  const publishStatus = row.publish_status;
  if (
    publishStatus !== "UPLOADED" &&
    publishStatus !== "PUBLISHING" &&
    publishStatus !== "READY" &&
    publishStatus !== "FAILED"
  ) {
    throw new Error(`Invalid publish_status in game_versions row: ${String(publishStatus)}`);
  }

  const version: GameVersion = {
    id: requiredPositiveInteger(row.id, "id"),
    gameId: requiredPositiveInteger(row.game_id, "game_id"),
    objectKey: requiredString(row.object_key, "object_key"),
    contentHash: requiredString(row.content_hash, "content_hash"),
    bundleBytes: requiredNonNegativeInteger(row.bundle_bytes, "bundle_bytes"),
    publishStatus: publishStatus as GameVersionPublishStatus,
    publishError: nullableString(row.publish_error, "publish_error"),
    publishedAt: nullableString(row.published_at, "published_at"),
    manifestKey: nullableString(row.manifest_key, "manifest_key"),
    publishedSizeBytes: nullableNonNegativeInteger(
      row.published_size_bytes,
      "published_size_bytes",
    ),
    fileCount: nullableNonNegativeInteger(row.file_count, "file_count"),
    uploadedAt: requiredString(row.uploaded_at, "uploaded_at"),
  };

  if (!isValidGameVersion(version)) {
    throw new Error("Constructed GameVersion failed domain validation");
  }
  return version;
}

export class D1GameVersionRepository implements GameVersionRepository {
  constructor(private db: D1Database) {}

  async findById(id: number): Promise<GameVersion | null> {
    const row = await this.db
      .prepare(`SELECT ${GAME_VERSION_SELECT_COLUMNS} FROM game_versions WHERE id = ?`)
      .bind(id)
      .first<Record<string, unknown>>();
    return row ? mapGameVersionRow(row) : null;
  }

  async listByGameId(gameId: number): Promise<readonly GameVersion[]> {
    const res = await this.db
      .prepare(
        `SELECT ${GAME_VERSION_SELECT_COLUMNS} FROM game_versions WHERE game_id = ? ORDER BY uploaded_at DESC, id DESC`,
      )
      .bind(gameId)
      .all<Record<string, unknown>>();
    return (res.results || []).map(mapGameVersionRow);
  }

  async findForGame(gameId: number, versionId: number): Promise<GameVersion | null> {
    const row = await this.db
      .prepare(
        `SELECT ${GAME_VERSION_SELECT_COLUMNS} FROM game_versions WHERE game_id = ? AND id = ?`,
      )
      .bind(gameId, versionId)
      .first<Record<string, unknown>>();
    return row ? mapGameVersionRow(row) : null;
  }
}
