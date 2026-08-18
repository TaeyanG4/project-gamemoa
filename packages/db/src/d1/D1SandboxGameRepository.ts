import type {
  SandboxGameRepository,
  SandboxGameRecord,
  SandboxGameVersionRecord,
  SandboxGameReviewAuditEntry,
  SandboxGameMetadataInput,
  SandboxGamePendingVersionsPage,
  SandboxGameVisibility,
  SandboxGameVersionStatus,
  SandboxGamePublishStatus,
  SandboxGameMode,
} from "@owogg/core";
import type { D1Database } from "./D1UserRepository.js";

function mapGameRow(row: Record<string, unknown>): SandboxGameRecord {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    developerUserId: Number(row.developer_user_id),
    title: String(row.title),
    shortDescription: row.short_description ? String(row.short_description) : null,
    description: row.description ? String(row.description) : null,
    genre: String(row.genre),
    // Falls back to "single" for pre-2026-08-18 rows inserted before this column existed with a
    // NOT NULL DEFAULT (migration 0027) — the DB default already covers this, `?? "single"` here
    // is just defense in depth against a row read through a stale schema.
    mode: (row.mode as SandboxGameMode | undefined) ?? "single",
    logoKey: row.logo_key ? String(row.logo_key) : null,
    xpPerCompletion: Number(row.xp_per_completion ?? 0),
    scoreUnit: row.score_unit ? String(row.score_unit) : null,
    scoreDirection: (row.score_direction as "asc" | "desc" | null) ?? null,
    scoreMin: row.score_min === null || row.score_min === undefined ? null : Number(row.score_min),
    scoreMax: row.score_max === null || row.score_max === undefined ? null : Number(row.score_max),
    scoreDisplayPrefix: row.score_display_prefix ? String(row.score_display_prefix) : null,
    scoreDisplaySuffix: row.score_display_suffix ? String(row.score_display_suffix) : null,
    visibility: row.visibility as SandboxGameVisibility,
    liveVersionId:
      row.live_version_id === null || row.live_version_id === undefined
        ? null
        : Number(row.live_version_id),
    reviewSlot:
      row.review_slot === null || row.review_slot === undefined
        ? null
        : (Number(row.review_slot) as 1 | 2),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    deletedByAdminId:
      row.deleted_by_admin_id === null || row.deleted_by_admin_id === undefined
        ? null
        : Number(row.deleted_by_admin_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapVersionRow(row: Record<string, unknown>): SandboxGameVersionRecord {
  return {
    id: Number(row.id),
    gameId: Number(row.game_id),
    objectKey: String(row.object_key),
    contentHash: String(row.content_hash),
    bundleBytes: Number(row.bundle_bytes),
    status: row.status as SandboxGameVersionStatus,
    reviewedByAdminId:
      row.reviewed_by_admin_id === null || row.reviewed_by_admin_id === undefined
        ? null
        : Number(row.reviewed_by_admin_id),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    rejectReason: row.reject_reason ? String(row.reject_reason) : null,
    uploadedAt: String(row.uploaded_at),
    publishStatus: (row.publish_status as SandboxGamePublishStatus | undefined) ?? "UPLOADED",
    publishError: row.publish_error ? String(row.publish_error) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    manifestKey: row.manifest_key ? String(row.manifest_key) : null,
    publishedSizeBytes:
      row.published_size_bytes === null || row.published_size_bytes === undefined
        ? null
        : Number(row.published_size_bytes),
    fileCount:
      row.file_count === null || row.file_count === undefined ? null : Number(row.file_count),
  };
}

function mapAuditRow(row: Record<string, unknown>): SandboxGameReviewAuditEntry {
  return {
    id: Number(row.id),
    gameId: Number(row.game_id),
    versionId:
      row.version_id === null || row.version_id === undefined ? null : Number(row.version_id),
    actorAdminId: Number(row.actor_admin_id),
    action: String(row.action),
    reason: row.reason ? String(row.reason) : null,
    metadata: row.metadata_json ? JSON.parse(String(row.metadata_json)) : null,
    createdAt: String(row.created_at),
  };
}

/** Column/param pairs for a partial metadata UPDATE — only fields present in `input` are
 * touched, so an admin editing just the title never clobbers score config set earlier. */
function buildMetadataAssignments(input: SandboxGameMetadataInput): {
  sets: string[];
  params: unknown[];
} {
  const sets: string[] = [];
  const params: unknown[] = [];
  const push = (column: string, value: unknown) => {
    sets.push(`${column} = ?`);
    params.push(value);
  };

  if (input.title !== undefined) push("title", input.title.trim());
  if (input.shortDescription !== undefined) push("short_description", input.shortDescription);
  if (input.description !== undefined) push("description", input.description);
  if (input.genre !== undefined) push("genre", input.genre.trim());
  if (input.xpPerCompletion !== undefined) push("xp_per_completion", input.xpPerCompletion);
  if (input.scoreUnit !== undefined) push("score_unit", input.scoreUnit);
  if (input.scoreDirection !== undefined) push("score_direction", input.scoreDirection);
  if (input.scoreMin !== undefined) push("score_min", input.scoreMin);
  if (input.scoreMax !== undefined) push("score_max", input.scoreMax);
  if (input.scoreDisplayPrefix !== undefined)
    push("score_display_prefix", input.scoreDisplayPrefix);
  if (input.scoreDisplaySuffix !== undefined)
    push("score_display_suffix", input.scoreDisplaySuffix);

  return { sets, params };
}

export class D1SandboxGameRepository implements SandboxGameRepository {
  constructor(private db: D1Database) {}

  async findById(id: number): Promise<SandboxGameRecord | null> {
    const row = await this.db
      .prepare(`SELECT * FROM sandbox_games WHERE id = ?`)
      .bind(id)
      .first<Record<string, unknown>>();
    return row ? mapGameRow(row) : null;
  }

  // Excludes soft-deleted games — this is the slug lookup /play/:slug resolves through, so a
  // deleted game's slug must stop resolving immediately, not just stop being servable once found.
  async findBySlug(slug: string): Promise<SandboxGameRecord | null> {
    const row = await this.db
      .prepare(`SELECT * FROM sandbox_games WHERE slug = ? AND deleted_at IS NULL`)
      .bind(slug)
      .first<Record<string, unknown>>();
    return row ? mapGameRow(row) : null;
  }

  // Deliberately NOT filtered by deleted_at — see the port doc comment. Checks existence only
  // (SELECT 1), not the full row, since the caller just needs a boolean.
  async slugExists(slug: string): Promise<boolean> {
    const row = await this.db
      .prepare(`SELECT 1 FROM sandbox_games WHERE slug = ?`)
      .bind(slug)
      .first<{ 1: number }>();
    return row !== null;
  }

  // Deliberately NOT filtered by deleted_at — a developer's own "my games" list still shows a
  // deleted game (with deletedAt set) so they know what happened to it, the same way a REJECTED
  // version stays visible rather than disappearing.
  async listByDeveloper(developerUserId: number): Promise<SandboxGameRecord[]> {
    const res = await this.db
      .prepare(`SELECT * FROM sandbox_games WHERE developer_user_id = ? ORDER BY created_at DESC`)
      .bind(developerUserId)
      .all<Record<string, unknown>>();
    return (res.results || []).map(mapGameRow);
  }

  async listPublic(): Promise<SandboxGameRecord[]> {
    const res = await this.db
      .prepare(
        `SELECT * FROM sandbox_games WHERE visibility = 'PUBLIC' AND deleted_at IS NULL ORDER BY created_at DESC`,
      )
      .all<Record<string, unknown>>();
    return (res.results || []).map(mapGameRow);
  }

  // Deliberately NOT filtered by deleted_at — see the port doc comment. This is the admin's only
  // browse-everything surface, and purgeGame only ever applies to an already-deleted game, so
  // admins need to be able to find one here without already knowing its id.
  async listAll(): Promise<SandboxGameRecord[]> {
    const res = await this.db
      .prepare(`SELECT * FROM sandbox_games ORDER BY created_at DESC`)
      .all<Record<string, unknown>>();
    return (res.results || []).map(mapGameRow);
  }

  async softDelete(
    id: number,
    deletedByAdminId: number,
    nowIso: string,
  ): Promise<SandboxGameRecord> {
    const row = await this.db
      .prepare(
        `UPDATE sandbox_games
         SET deleted_at = ?, deleted_by_admin_id = ?, visibility = 'PRIVATE', updated_at = ?
         WHERE id = ?
         RETURNING *`,
      )
      .bind(nowIso, deletedByAdminId, nowIso, id)
      .first<Record<string, unknown>>();
    if (!row) throw new Error(`sandbox_games row ${id} vanished mid-delete`);
    return mapGameRow(row);
  }

  async hardDelete(id: number): Promise<void> {
    // Children first, parent last — explicit rather than relying on the schema's
    // ON DELETE CASCADE actually being enforced (SQLite/D1 foreign-key enforcement is a per-
    // connection PRAGMA; being explicit here doesn't depend on it). One batch() call for
    // atomicity across the three statements.
    await this.db.batch([
      this.db.prepare(`DELETE FROM sandbox_game_review_audit_log WHERE game_id = ?`).bind(id),
      this.db.prepare(`DELETE FROM sandbox_game_versions WHERE game_id = ?`).bind(id),
      this.db.prepare(`DELETE FROM sandbox_games WHERE id = ?`).bind(id),
    ]);
  }

  async create(input: {
    slug: string;
    developerUserId: number;
    title: string;
    shortDescription: string | null;
    description: string | null;
    genre: string;
    mode: SandboxGameMode;
    nowIso: string;
  }): Promise<SandboxGameRecord | null> {
    // INSERT ... SELECT rather than a plain INSERT: the SELECT computes the lowest review_slot
    // (1 or 2) not already held by this developer, and its WHERE clause makes the SELECT produce
    // *zero rows* — so the INSERT writes nothing at all — when both slots are already taken. That
    // makes "is a slot available" and "claim it" one atomic statement instead of a separate
    // COUNT(*) check followed by an INSERT, which is exactly the TOCTOU race a naive
    // count-then-insert would have. The partial UNIQUE INDEX in migration 0024 is the backstop of
    // last resort, not the primary mechanism.
    const res = await this.db
      .prepare(
        `INSERT INTO sandbox_games
           (slug, developer_user_id, title, short_description, description, genre, mode,
            review_slot, created_at, updated_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, avail.slot, ?, ?
         FROM (
           SELECT MIN(s.slot) AS slot
           FROM (SELECT 1 AS slot UNION ALL SELECT 2) s
           WHERE s.slot NOT IN (
             SELECT review_slot FROM sandbox_games
             WHERE developer_user_id = ? AND review_slot IS NOT NULL
           )
         ) avail
         WHERE avail.slot IS NOT NULL`,
      )
      .bind(
        input.slug,
        input.developerUserId,
        input.title,
        input.shortDescription,
        input.description,
        input.genre,
        input.mode,
        input.nowIso,
        input.nowIso,
        input.developerUserId,
      )
      .run();

    if (!res.meta?.changes) return null; // no review slot available

    // Deliberately NOT `WHERE rowid = last_insert_rowid()` here: that reads connection-global
    // state, and this repository's whole point is being safe under concurrent callers sharing one
    // connection — a second create() interleaving its own INSERT between this statement and the
    // read-back would make this read back *its* row instead of the caller's own (confirmed by a
    // concurrent-create test that failed exactly this way before this fix). `slug` is UNIQUE and
    // was just written by this exact call, so filtering on it is race-proof without needing a
    // connection-scoped identifier at all.
    const row = await this.db
      .prepare(`SELECT * FROM sandbox_games WHERE slug = ?`)
      .bind(input.slug)
      .first<Record<string, unknown>>();
    if (!row) throw new Error("sandbox_games row vanished immediately after insert");
    return mapGameRow(row);
  }

  async releaseReviewSlot(id: number, nowIso: string): Promise<SandboxGameRecord> {
    await this.db
      .prepare(
        `UPDATE sandbox_games SET review_slot = NULL, updated_at = ?
         WHERE id = ? AND review_slot IS NOT NULL`,
      )
      .bind(nowIso, id)
      .run();
    const updated = await this.findById(id);
    if (!updated) throw new Error(`sandbox_games row ${id} not found after slot release`);
    return updated;
  }

  async updateMetadata(
    id: number,
    input: SandboxGameMetadataInput,
    nowIso: string,
  ): Promise<SandboxGameRecord> {
    const { sets, params } = buildMetadataAssignments(input);
    if (sets.length > 0) {
      await this.db
        .prepare(`UPDATE sandbox_games SET ${sets.join(", ")}, updated_at = ? WHERE id = ?`)
        .bind(...params, nowIso, id)
        .run();
    }
    const updated = await this.findById(id);
    if (!updated) throw new Error(`sandbox_games row ${id} not found after metadata update`);
    return updated;
  }

  async setVisibility(
    id: number,
    visibility: SandboxGameVisibility,
    nowIso: string,
  ): Promise<SandboxGameRecord> {
    await this.db
      .prepare(`UPDATE sandbox_games SET visibility = ?, updated_at = ? WHERE id = ?`)
      .bind(visibility, nowIso, id)
      .run();
    const updated = await this.findById(id);
    if (!updated) throw new Error(`sandbox_games row ${id} not found after visibility update`);
    return updated;
  }

  async setLogo(id: number, logoKey: string, nowIso: string): Promise<SandboxGameRecord> {
    await this.db
      .prepare(`UPDATE sandbox_games SET logo_key = ?, updated_at = ? WHERE id = ?`)
      .bind(logoKey, nowIso, id)
      .run();
    const updated = await this.findById(id);
    if (!updated) throw new Error(`sandbox_games row ${id} not found after logo update`);
    return updated;
  }

  async setLiveVersion(id: number, versionId: number, nowIso: string): Promise<SandboxGameRecord> {
    await this.db
      .prepare(`UPDATE sandbox_games SET live_version_id = ?, updated_at = ? WHERE id = ?`)
      .bind(versionId, nowIso, id)
      .run();
    const updated = await this.findById(id);
    if (!updated) throw new Error(`sandbox_games row ${id} not found after live-version update`);
    return updated;
  }

  async clearLiveVersionIfMatches(
    id: number,
    versionId: number,
    nowIso: string,
  ): Promise<SandboxGameRecord> {
    // `AND live_version_id = ?` makes this conditional at the SQL level, not a read-then-write:
    // if the game's live version has already moved on (0 rows affected), the row is left
    // untouched rather than this racing a concurrent setLiveVersion call. visibility -> PRIVATE in
    // the same statement satisfies the CHECK (visibility = 'PRIVATE' OR live_version_id IS NOT
    // NULL) constraint — same reasoning as softDelete.
    await this.db
      .prepare(
        `UPDATE sandbox_games
         SET live_version_id = NULL, visibility = 'PRIVATE', updated_at = ?
         WHERE id = ? AND live_version_id = ?`,
      )
      .bind(nowIso, id, versionId)
      .run();
    const updated = await this.findById(id);
    if (!updated) throw new Error(`sandbox_games row ${id} not found after live-version clear`);
    return updated;
  }

  async createVersion(input: {
    gameId: number;
    objectKey: string;
    contentHash: string;
    bundleBytes: number;
    nowIso: string;
  }): Promise<SandboxGameVersionRecord> {
    // `RETURNING *` rather than a separate `SELECT ... WHERE rowid = last_insert_rowid()`:
    // `last_insert_rowid()` is connection-global, not scoped to this call, so under concurrent
    // uploads another request's INSERT landing between this one and its own read-back could make
    // this method return a *different* upload's version data to the caller (found exactly this
    // way while hardening SandboxGameRepository.create for the review-slot quota — see its
    // comment). `RETURNING` makes the insert and the read one atomic statement with no window for
    // that to happen. Requires SQLite 3.35+ / a D1 version with RETURNING support (both do).
    const row = await this.db
      .prepare(
        `INSERT INTO sandbox_game_versions (game_id, object_key, content_hash, bundle_bytes, uploaded_at)
         VALUES (?, ?, ?, ?, ?)
         RETURNING *`,
      )
      .bind(input.gameId, input.objectKey, input.contentHash, input.bundleBytes, input.nowIso)
      .first<Record<string, unknown>>();
    if (!row) throw new Error("sandbox_game_versions row vanished immediately after insert");
    return mapVersionRow(row);
  }

  async findVersionById(id: number): Promise<SandboxGameVersionRecord | null> {
    const row = await this.db
      .prepare(`SELECT * FROM sandbox_game_versions WHERE id = ?`)
      .bind(id)
      .first<Record<string, unknown>>();
    return row ? mapVersionRow(row) : null;
  }

  async setVersionPublishState(
    id: number,
    state: {
      publishStatus: SandboxGamePublishStatus;
      publishError: string | null;
      publishedAt: string | null;
      manifestKey: string | null;
      publishedSizeBytes: number | null;
      fileCount: number | null;
    },
  ): Promise<SandboxGameVersionRecord> {
    await this.db
      .prepare(
        `UPDATE sandbox_game_versions
         SET publish_status = ?, publish_error = ?, published_at = ?, manifest_key = ?,
             published_size_bytes = ?, file_count = ?
         WHERE id = ?`,
      )
      .bind(
        state.publishStatus,
        state.publishError,
        state.publishedAt,
        state.manifestKey,
        state.publishedSizeBytes,
        state.fileCount,
        id,
      )
      .run();
    const updated = await this.findVersionById(id);
    if (!updated) throw new Error(`sandbox_game_versions row ${id} not found after publish update`);
    return updated;
  }

  async listVersionsByGame(gameId: number): Promise<SandboxGameVersionRecord[]> {
    const res = await this.db
      .prepare(`SELECT * FROM sandbox_game_versions WHERE game_id = ? ORDER BY uploaded_at DESC`)
      .bind(gameId)
      .all<Record<string, unknown>>();
    return (res.results || []).map(mapVersionRow);
  }

  async listPendingVersions(
    limit: number,
    offset: number,
  ): Promise<SandboxGamePendingVersionsPage> {
    const countRow = await this.db
      .prepare(`SELECT COUNT(*) as c FROM sandbox_game_versions WHERE status = 'PENDING_REVIEW'`)
      .first<{ c: number }>();
    const res = await this.db
      .prepare(
        `SELECT * FROM sandbox_game_versions WHERE status = 'PENDING_REVIEW'
         ORDER BY uploaded_at ASC LIMIT ? OFFSET ?`,
      )
      .bind(limit, offset)
      .all<Record<string, unknown>>();

    return {
      total: Number(countRow?.c ?? 0),
      versions: (res.results || []).map(mapVersionRow),
    };
  }

  async decideVersion(
    id: number,
    status: "APPROVED" | "REJECTED",
    adminId: number,
    reason: string | null,
    nowIso: string,
  ): Promise<SandboxGameVersionRecord> {
    await this.db
      .prepare(
        `UPDATE sandbox_game_versions
         SET status = ?, reviewed_by_admin_id = ?, reviewed_at = ?, reject_reason = ?
         WHERE id = ?`,
      )
      .bind(status, adminId, nowIso, reason, id)
      .run();
    const updated = await this.findVersionById(id);
    if (!updated) throw new Error(`sandbox_game_versions row ${id} not found after decision`);
    return updated;
  }

  async revokeVersionApproval(id: number): Promise<SandboxGameVersionRecord> {
    await this.db
      .prepare(
        `UPDATE sandbox_game_versions
         SET status = 'PENDING_REVIEW', reviewed_by_admin_id = NULL, reviewed_at = NULL, reject_reason = NULL
         WHERE id = ?`,
      )
      .bind(id)
      .run();
    const updated = await this.findVersionById(id);
    if (!updated) throw new Error(`sandbox_game_versions row ${id} not found after revoke`);
    return updated;
  }

  async withdrawVersion(id: number): Promise<SandboxGameVersionRecord> {
    await this.db
      .prepare(
        `UPDATE sandbox_game_versions SET status = 'WITHDRAWN'
         WHERE id = ? AND status = 'PENDING_REVIEW'`,
      )
      .bind(id)
      .run();
    const updated = await this.findVersionById(id);
    if (!updated) throw new Error(`sandbox_game_versions row ${id} not found after withdrawal`);
    return updated;
  }

  async appendReviewAudit(entry: {
    gameId: number;
    versionId: number | null;
    actorAdminId: number;
    action: string;
    reason: string | null;
    metadata: Record<string, unknown> | null;
    nowIso: string;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO sandbox_game_review_audit_log
           (game_id, version_id, actor_admin_id, action, reason, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        entry.gameId,
        entry.versionId,
        entry.actorAdminId,
        entry.action,
        entry.reason,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.nowIso,
      )
      .run();
  }

  async listReviewAudit(gameId: number, limit = 50): Promise<SandboxGameReviewAuditEntry[]> {
    const res = await this.db
      .prepare(
        `SELECT * FROM sandbox_game_review_audit_log WHERE game_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
      )
      .bind(gameId, limit)
      .all<Record<string, unknown>>();
    return (res.results || []).map(mapAuditRow);
  }
}
