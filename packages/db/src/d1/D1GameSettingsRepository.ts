import type { GameSettingRecord, GameSettingsRepository } from "@owogg/core";
import type { D1Database } from "./D1UserRepository.js";

function mapRow(row: Record<string, unknown>): GameSettingRecord {
  return {
    gameId: String(row.game_id),
    enabled: Number(row.enabled) === 1,
    disabledReason: row.disabled_reason ? String(row.disabled_reason) : null,
    updatedByAdminId: row.updated_by_admin_id === null ? null : Number(row.updated_by_admin_id),
    updatedAt: String(row.updated_at),
  };
}

export class D1GameSettingsRepository implements GameSettingsRepository {
  constructor(private db: D1Database) {}

  async getDisabledGameIds(): Promise<string[]> {
    const res = await this.db
      .prepare(`SELECT game_id FROM game_settings WHERE enabled = 0`)
      .all<{ game_id: string }>();
    return (res.results || []).map((r) => r.game_id);
  }

  async getAllOverrides(): Promise<GameSettingRecord[]> {
    const res = await this.db
      .prepare(`SELECT * FROM game_settings ORDER BY game_id ASC`)
      .all<Record<string, unknown>>();
    return (res.results || []).map(mapRow);
  }

  async setEnabled(
    gameId: string,
    enabled: boolean,
    reason: string | null,
    adminId: number,
  ): Promise<GameSettingRecord> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO game_settings (game_id, enabled, disabled_reason, updated_by_admin_id, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(game_id) DO UPDATE SET
           enabled = excluded.enabled,
           disabled_reason = excluded.disabled_reason,
           updated_by_admin_id = excluded.updated_by_admin_id,
           updated_at = excluded.updated_at`,
      )
      .bind(gameId, enabled ? 1 : 0, enabled ? null : reason, adminId, now)
      .run();

    return {
      gameId,
      enabled,
      disabledReason: enabled ? null : reason,
      updatedByAdminId: adminId,
      updatedAt: now,
    };
  }
}
