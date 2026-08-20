import { execFileSync } from "node:child_process";
import path from "node:path";
import {
  GAME_DEFINITIONS,
  isSystemGameDefinition,
  OfficialGameShadowBootstrap,
  type GameIdentity,
  type GameVersion,
  type OfficialGameShadowRepository,
} from "@owogg/core";
import {
  BackblazeB2GameBundleRepository,
  B2GameCanonicalRepository,
  mapGameIdentityRow,
  mapGameVersionRow,
  type BackblazeB2Config,
} from "@owogg/db";
import type { OfficialBundlePreparedObserver } from "./official-game-bundle-publisher.js";

type SqlValue = string | number | null;

export interface D1SqlExecutor {
  query<T extends Record<string, unknown>>(
    sql: string,
    values?: readonly SqlValue[],
  ): Promise<readonly T[]>;
}

/** Production-only D1 executor used by the deploy workflow. The runner never runs in local
 * development: it delegates to the repository's configured Wrangler binding with --remote and
 * receives Cloudflare credentials only from the deploy step's environment. */
export class WranglerRemoteD1Executor implements D1SqlExecutor {
  constructor(private readonly repoRoot: string) {}

  async query<T extends Record<string, unknown>>(
    sql: string,
    values: readonly SqlValue[] = [],
  ): Promise<readonly T[]> {
    const command = renderD1Sql(sql, values);
    const stdout = execFileSync(
      process.platform === "win32" ? "pnpm.cmd" : "pnpm",
      [
        "exec",
        "wrangler",
        "d1",
        "execute",
        "DB",
        "--remote",
        "--config",
        "apps/api/wrangler.jsonc",
        "--json",
        "--command",
        command,
      ],
      { cwd: this.repoRoot, encoding: "utf8", env: process.env },
    );
    const parsed = JSON.parse(stdout) as Array<{
      success?: boolean;
      results?: T[];
      error?: { text?: string };
    }>;
    const result = parsed[0];
    if (!result?.success) {
      throw new Error(`D1 official shadow query failed: ${result?.error?.text ?? "unknown error"}`);
    }
    return result.results ?? [];
  }
}

/** D1 implementation of B-1's narrow official-only persistence port. Every mutation is scoped to
 * publisher_type = OWOGG and relies on the A-4 D1 guards for slug and same-game live-version
 * authority; it has no code path that inserts a USER/sandbox/review row. */
export class D1OfficialGameShadowRepository implements OfficialGameShadowRepository {
  constructor(private readonly sql: D1SqlExecutor) {}

  async ensureOwoggIdentity(input: { slug: string; nowIso: string }): Promise<GameIdentity> {
    let existing = await this.findIdentityBySlug(input.slug);
    if (existing === null) {
      await this.sql.query(
        `INSERT INTO games
           (slug, publisher_type, publisher_user_id, visibility, live_version_id, created_at, updated_at)
         VALUES (?, 'OWOGG', NULL, 'PRIVATE', NULL, ?, ?)
         ON CONFLICT(slug) DO NOTHING`,
        [input.slug, input.nowIso, input.nowIso],
      );
      existing = await this.findIdentityBySlug(input.slug);
    }
    if (existing === null || existing.publisher.type !== "OWOGG" || existing.deletedAt !== null) {
      throw new Error(`Official identity authority conflict for slug ${input.slug}`);
    }
    return existing;
  }

  async findVersionByContentHash(gameId: number, contentHash: string): Promise<GameVersion | null> {
    const rows = await this.sql.query(
      `SELECT id, game_id, object_key, content_hash, bundle_bytes, publish_status, publish_error,
              published_at, manifest_key, published_size_bytes, file_count, uploaded_at
       FROM game_versions
       WHERE game_id = ? AND content_hash = ?
       ORDER BY CASE publish_status WHEN 'READY' THEN 0 ELSE 1 END, id DESC
       LIMIT 1`,
      [gameId, contentHash],
    );
    return rows[0] ? mapGameVersionRow(rows[0]) : null;
  }

  async createPublishingVersion(input: {
    gameId: number;
    objectKey: string;
    contentHash: string;
    bundleBytes: number;
    nowIso: string;
  }): Promise<GameVersion> {
    const rows = await this.sql.query(
      `INSERT INTO game_versions
         (game_id, object_key, content_hash, bundle_bytes, publish_status, publish_error,
          published_at, manifest_key, published_size_bytes, file_count, uploaded_at)
       VALUES (?, ?, ?, ?, 'PUBLISHING', NULL, NULL, NULL, NULL, NULL, ?)
       RETURNING id, game_id, object_key, content_hash, bundle_bytes, publish_status, publish_error,
                 published_at, manifest_key, published_size_bytes, file_count, uploaded_at`,
      [input.gameId, input.objectKey, input.contentHash, input.bundleBytes, input.nowIso],
    );
    if (!rows[0]) throw new Error("Official generic version allocation returned no row");
    return mapGameVersionRow(rows[0]);
  }

  async retryPublishingVersion(versionId: number): Promise<GameVersion> {
    const rows = await this.sql.query(
      `UPDATE game_versions
       SET publish_status = 'PUBLISHING', publish_error = NULL, published_at = NULL,
           manifest_key = NULL, published_size_bytes = NULL, file_count = NULL
       WHERE id = ? AND publish_status <> 'READY'
       RETURNING id, game_id, object_key, content_hash, bundle_bytes, publish_status, publish_error,
                 published_at, manifest_key, published_size_bytes, file_count, uploaded_at`,
      [versionId],
    );
    if (!rows[0]) throw new Error(`Official generic version ${versionId} cannot be retried`);
    return mapGameVersionRow(rows[0]);
  }

  async markVersionReady(input: {
    versionId: number;
    publishedAt: string;
    manifestKey: string;
    publishedSizeBytes: number;
    fileCount: number;
  }): Promise<GameVersion> {
    const rows = await this.sql.query(
      `UPDATE game_versions
       SET publish_status = 'READY', publish_error = NULL, published_at = ?, manifest_key = ?,
           published_size_bytes = ?, file_count = ?
       WHERE id = ? AND publish_status = 'PUBLISHING'
       RETURNING id, game_id, object_key, content_hash, bundle_bytes, publish_status, publish_error,
                 published_at, manifest_key, published_size_bytes, file_count, uploaded_at`,
      [
        input.publishedAt,
        input.manifestKey,
        input.publishedSizeBytes,
        input.fileCount,
        input.versionId,
      ],
    );
    if (!rows[0])
      throw new Error(`Official generic version ${input.versionId} cannot become READY`);
    return mapGameVersionRow(rows[0]);
  }

  async markVersionFailed(versionId: number, reason: string): Promise<void> {
    await this.sql.query(
      `UPDATE game_versions
       SET publish_status = 'FAILED', publish_error = ?, published_at = NULL, manifest_key = NULL,
           published_size_bytes = NULL, file_count = NULL
       WHERE id = ? AND publish_status <> 'READY'`,
      [reason, versionId],
    );
  }

  async ensureSlugReservation(input: {
    slug: string;
    gameId: number;
    nowIso: string;
  }): Promise<void> {
    await this.sql.query(
      `INSERT OR IGNORE INTO game_slug_reservations (slug, source_game_id, reserved_at)
       VALUES (?, ?, ?)`,
      [input.slug, input.gameId, input.nowIso],
    );
    const rows = await this.sql.query<{ source_game_id: unknown }>(
      `SELECT source_game_id FROM game_slug_reservations WHERE slug = ?`,
      [input.slug],
    );
    if (rows[0]?.source_game_id !== input.gameId) {
      throw new Error(`Official slug reservation conflict for ${input.slug}`);
    }
  }

  async activateOwoggVersion(input: {
    gameId: number;
    versionId: number;
    nowIso: string;
  }): Promise<void> {
    const rows = await this.sql.query(
      `UPDATE games
       SET visibility = 'PUBLIC', live_version_id = ?, updated_at = ?
       WHERE id = ? AND publisher_type = 'OWOGG' AND deleted_at IS NULL
       RETURNING id`,
      [input.versionId, input.nowIso, input.gameId],
    );
    if (!rows[0])
      throw new Error(`Official game ${input.gameId} cannot activate version ${input.versionId}`);
  }

  private async findIdentityBySlug(slug: string): Promise<GameIdentity | null> {
    const rows = await this.sql.query(
      `SELECT id, slug, publisher_type, publisher_user_id, visibility, live_version_id, deleted_at,
              created_at, updated_at
       FROM games WHERE slug = ?`,
      [slug],
    );
    return rows[0] ? mapGameIdentityRow(rows[0]) : null;
  }
}

/** Hooks B-1 into the existing official publisher without changing its legacy path or release map.
 * The same prepared ZIP that was deterministically hashed for official-games/ is shadow-published
 * to games/<gameId>/<versionId>/ immediately after the legacy publication succeeds. */
export function createOfficialShadowBundleObserver(input: {
  repoRoot: string;
  b2Config: BackblazeB2Config;
}): OfficialBundlePreparedObserver {
  const storage = new BackblazeB2GameBundleRepository(input.b2Config);
  const bootstrap = new OfficialGameShadowBootstrap(
    new D1OfficialGameShadowRepository(new WranglerRemoteD1Executor(input.repoRoot)),
    storage,
    new B2GameCanonicalRepository(storage),
  );
  const definitions = new Map(GAME_DEFINITIONS.map((definition) => [definition.slug, definition]));

  return {
    async onBundlePrepared(bundle) {
      const definition = definitions.get(bundle.slug);
      if (!definition || !isSystemGameDefinition(definition)) {
        throw new Error(`Official shadow bootstrap has no SYSTEM definition for ${bundle.slug}`);
      }
      await bootstrap.bootstrap({
        definition,
        archive: bundle.zipBytes,
        contentHash: bundle.contentHash,
        prepared: bundle.prepared,
        nowIso: bundle.publishedAt,
      });
    },
  };
}

export function renderD1Sql(sql: string, values: readonly SqlValue[]): string {
  let index = 0;
  const rendered = sql.replace(/\?/g, () => {
    const value = values[index++];
    if (value === undefined) throw new Error("D1 SQL placeholder has no bound value");
    if (value === null) return "NULL";
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new Error("D1 SQL number must be finite");
      return String(value);
    }
    return `'${value.replace(/'/g, "''")}'`;
  });
  if (index !== values.length) throw new Error("D1 SQL received unused bound values");
  return rendered.trimEnd().endsWith(";") ? rendered : `${rendered};`;
}

export function officialShadowScriptRepoRoot(fromScriptDirectory: string): string {
  return path.resolve(fromScriptDirectory, "..");
}
