import type { GameAsset, GameAssetKind, GameAssetRepository } from "@owogg/core";
import type { D1Database } from "./D1UserRepository.js";

export class D1GameAssetRepository implements GameAssetRepository {
  constructor(private readonly db: D1Database) {}

  async findByGameId(gameId: number, kind: GameAssetKind): Promise<GameAsset | null> {
    const row = await this.db
      .prepare(
        `SELECT game_id, kind, object_key, updated_at
         FROM game_assets
         WHERE game_id = ? AND kind = ?`,
      )
      .bind(gameId, kind)
      .first<Record<string, unknown>>();
    if (!row) return null;

    if (
      typeof row.game_id !== "number" ||
      !Number.isInteger(row.game_id) ||
      row.game_id <= 0 ||
      row.kind !== kind ||
      typeof row.object_key !== "string" ||
      row.object_key.length === 0 ||
      typeof row.updated_at !== "string" ||
      row.updated_at.length === 0
    ) {
      throw new Error(`Malformed game asset row for game ${String(row.game_id)}`);
    }

    return {
      gameId: row.game_id,
      kind,
      objectKey: row.object_key,
      updatedAt: row.updated_at,
    };
  }
}
