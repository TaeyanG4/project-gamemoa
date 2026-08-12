import type {
  CreatorReviewRepository,
  CreatorReviewJob,
  CreatorReviewJobStatus,
} from "@gamemoa/core";
import type { D1Database } from "./D1UserRepository.js";

function mapReviewJobRow(r: Record<string, unknown>): CreatorReviewJob {
  return {
    id: Number(r.id),
    creatorPlatformAccountId: Number(r.creator_platform_account_id),
    status: String(r.status) as CreatorReviewJobStatus,
    initialAudience:
      r.initial_audience !== null && r.initial_audience !== undefined
        ? Number(r.initial_audience)
        : null,
    initialChannelCreatedAt: r.initial_channel_created_at
      ? String(r.initial_channel_created_at)
      : null,
    nextCheckAt: String(r.next_check_at),
    attemptCount: Number(r.attempt_count ?? 0),
    lastError: r.last_error ? String(r.last_error) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    completedAt: r.completed_at ? String(r.completed_at) : null,
  };
}

const ACTIVE_STATUSES = "'AUTO_REVIEW_PENDING', 'FAILED_RETRYABLE'";

export class D1CreatorReviewRepository implements CreatorReviewRepository {
  constructor(private db: D1Database) {}

  async findLatestJobByAccountIds(
    creatorPlatformAccountIds: number[],
  ): Promise<CreatorReviewJob | null> {
    if (creatorPlatformAccountIds.length === 0) return null;

    const placeholders = creatorPlatformAccountIds.map(() => "?").join(",");
    const row = await this.db
      .prepare(
        `SELECT * FROM creator_review_jobs
         WHERE creator_platform_account_id IN (${placeholders})
         ORDER BY updated_at DESC, id DESC LIMIT 1`,
      )
      .bind(...creatorPlatformAccountIds)
      .first<Record<string, unknown>>();

    return row ? mapReviewJobRow(row) : null;
  }

  async findActiveJobByAccountId(
    creatorPlatformAccountId: number,
  ): Promise<CreatorReviewJob | null> {
    const row = await this.db
      .prepare(
        `SELECT * FROM creator_review_jobs
         WHERE creator_platform_account_id = ? AND status IN (${ACTIVE_STATUSES})
         ORDER BY id DESC LIMIT 1`,
      )
      .bind(creatorPlatformAccountId)
      .first<Record<string, unknown>>();

    return row ? mapReviewJobRow(row) : null;
  }

  async createOrResetJob(input: {
    creatorPlatformAccountId: number;
    initialAudience: number | null;
    initialChannelCreatedAt: string | null;
    nextCheckAt: string;
  }): Promise<CreatorReviewJob> {
    const now = new Date().toISOString();
    const existing = await this.findActiveJobByAccountId(input.creatorPlatformAccountId);

    if (existing) {
      await this.db
        .prepare(
          `UPDATE creator_review_jobs
           SET status = 'AUTO_REVIEW_PENDING',
               initial_audience = ?, initial_channel_created_at = ?,
               next_check_at = ?, attempt_count = 0, last_error = NULL,
               completed_at = NULL, updated_at = ?
           WHERE id = ?`,
        )
        .bind(
          input.initialAudience,
          input.initialChannelCreatedAt,
          input.nextCheckAt,
          now,
          existing.id,
        )
        .run();

      const updated = await this.db
        .prepare(`SELECT * FROM creator_review_jobs WHERE id = ?`)
        .bind(existing.id)
        .first<Record<string, unknown>>();
      if (updated) return mapReviewJobRow(updated);
      return { ...existing, status: "AUTO_REVIEW_PENDING", updatedAt: now };
    }

    await this.db
      .prepare(
        `INSERT INTO creator_review_jobs
         (creator_platform_account_id, status, initial_audience, initial_channel_created_at,
          next_check_at, attempt_count, last_error, created_at, updated_at, completed_at)
         VALUES (?, 'AUTO_REVIEW_PENDING', ?, ?, ?, 0, NULL, ?, ?, NULL)`,
      )
      .bind(
        input.creatorPlatformAccountId,
        input.initialAudience,
        input.initialChannelCreatedAt,
        input.nextCheckAt,
        now,
        now,
      )
      .run();

    const row = await this.db
      .prepare(`SELECT * FROM creator_review_jobs WHERE rowid = last_insert_rowid()`)
      .first<Record<string, unknown>>();
    if (row) return mapReviewJobRow(row);

    const created = await this.db
      .prepare(
        `SELECT * FROM creator_review_jobs WHERE creator_platform_account_id = ? ORDER BY id DESC LIMIT 1`,
      )
      .bind(input.creatorPlatformAccountId)
      .first<Record<string, unknown>>();
    if (created) return mapReviewJobRow(created);

    throw new Error("Failed to create creator review job");
  }

  async listDuePendingJobs(limit: number, nowIso: string): Promise<CreatorReviewJob[]> {
    const bounded = Math.min(Math.max(limit, 1), 100);
    const res = await this.db
      .prepare(
        `SELECT * FROM creator_review_jobs
         WHERE status IN (${ACTIVE_STATUSES}) AND next_check_at <= ?
         ORDER BY next_check_at ASC, id ASC LIMIT ?`,
      )
      .bind(nowIso, bounded)
      .all<Record<string, unknown>>();

    return (res.results || []).map(mapReviewJobRow);
  }

  async markJobFailed(
    id: number,
    error: string,
    nextCheckAt: string,
    nowIso: string,
  ): Promise<void> {
    await this.db
      .prepare(
        `UPDATE creator_review_jobs
         SET status = 'FAILED_RETRYABLE', last_error = ?, next_check_at = ?,
             attempt_count = attempt_count + 1, updated_at = ?
         WHERE id = ? AND status IN (${ACTIVE_STATUSES})`,
      )
      .bind(error, nextCheckAt, nowIso, id)
      .run();
  }

  async completeJob(
    id: number,
    status: Exclude<CreatorReviewJobStatus, "AUTO_REVIEW_PENDING" | "FAILED_RETRYABLE">,
    completedAt: string,
  ): Promise<boolean> {
    const res = await this.db
      .prepare(
        `UPDATE creator_review_jobs
         SET status = ?, last_error = NULL, completed_at = ?, updated_at = ?
         WHERE id = ? AND status IN (${ACTIVE_STATUSES})`,
      )
      .bind(status, completedAt, completedAt, id)
      .run();

    return Boolean(res.meta?.changes && Number(res.meta.changes) > 0);
  }
}
