import { Hono } from "hono";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import {
  CreatorManualReviewActionRequestSchema,
  type CreatorManualReviewAction,
} from "@gamemoa/contracts";
import type { CreatorManualReviewItem, CreatorReviewAuditLog } from "@gamemoa/core";
import { createContainer } from "../container.js";
import { isAdminUserId } from "../auth/admin.js";
import type { ApiEnv } from "./auth.js";

export const adminCreatorsRouter = new Hono<ApiEnv>();

async function getSessionUser(c: Context<ApiEnv>): Promise<{ id: number } | null> {
  const sessionId = getCookie(c, "gamemoa_session");
  if (!sessionId) return null;
  const { sessionRepo } = createContainer(c.env.DB);
  const result = await sessionRepo.findSession(sessionId);
  return result ? { id: result.user.id } : null;
}

function mapReviewItem(item: CreatorManualReviewItem) {
  return {
    job: {
      id: item.job.id,
      creatorPlatformAccountId: item.job.creatorPlatformAccountId,
      reviewType: item.job.reviewType,
      status: item.job.status,
      initialAudience: item.job.initialAudience,
      initialChannelCreatedAt: item.job.initialChannelCreatedAt,
      nextCheckAt: item.job.nextCheckAt,
      attemptCount: item.job.attemptCount,
      reviewReason: item.job.reviewReason,
      createdAt: item.job.createdAt,
      updatedAt: item.job.updatedAt,
      completedAt: item.job.completedAt,
    },
    userId: item.userId,
    nickname: item.nickname,
    creatorId: item.creatorId,
    creatorStatus: item.creatorStatus,
    featuredStatus: item.featuredStatus,
    platformAccount: item.platformAccount,
  };
}

function mapAudit(audit: CreatorReviewAuditLog) {
  return {
    ...audit,
    platform: audit.platform ?? null,
    channelName: audit.channelName ?? null,
  };
}

async function requireAdmin(c: Context<ApiEnv>): Promise<Response | { id: number }> {
  const user = await getSessionUser(c);
  if (!user) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
  }
  if (!isAdminUserId(user.id, c.env.ADMIN_USER_IDS)) {
    return c.json({ error: { code: "FORBIDDEN", message: "관리자 권한이 필요합니다." } }, 403);
  }
  return user;
}

function isResponse(value: Response | { id: number }): value is Response {
  return value instanceof Response;
}

function parsePage(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, 0), max);
}

adminCreatorsRouter.get("/reviews", async (c) => {
  const admin = await requireAdmin(c);
  if (isResponse(admin)) return admin;

  const limit = Math.min(Math.max(parsePage(c.req.query("limit"), 20, 50), 1), 50);
  const offset = parsePage(c.req.query("offset"), 0, Number.MAX_SAFE_INTEGER);
  const { creatorUseCases } = createContainer(c.env.DB);
  const result = await creatorUseCases.listManualCreatorReviews({ limit, offset });

  return c.json({
    items: result.items.map(mapReviewItem),
    total: result.total,
    audits: {
      entries: result.audits.entries.map(mapAudit),
      total: result.audits.total,
    },
  });
});

adminCreatorsRouter.post("/reviews/:jobId/action", async (c) => {
  const admin = await requireAdmin(c);
  if (isResponse(admin)) return admin;

  const jobId = Number(c.req.param("jobId"));
  if (!Number.isSafeInteger(jobId) || jobId <= 0) {
    return c.json(
      { error: { code: "INVALID_JOB_ID", message: "심사 ID가 올바르지 않습니다." } },
      400,
    );
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { error: { code: "INVALID_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      400,
    );
  }
  const parsed = CreatorManualReviewActionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: "INVALID_REQUEST", message: "명시적인 심사 사유가 필요합니다." } },
      400,
    );
  }

  const { creatorUseCases } = createContainer(c.env.DB);
  const result = await creatorUseCases.applyManualCreatorReview({
    jobId,
    reviewerUserId: admin.id,
    action: parsed.data.action as CreatorManualReviewAction,
    reason: parsed.data.reason,
  });

  if (!result.applied && result.code === "NOT_FOUND") {
    return c.json({ error: { code: result.code, message: "심사 항목을 찾을 수 없습니다." } }, 404);
  }
  if (!result.applied && result.code === "OWNERSHIP_NOT_VERIFIED") {
    return c.json(
      {
        error: {
          code: result.code,
          message: "소유권이 검증된 Creator만 Featured로 승인할 수 있습니다.",
        },
      },
      409,
    );
  }
  if (!result.applied && result.code === "INVALID_REASON") {
    return c.json(
      { error: { code: result.code, message: "심사 사유는 3자 이상 입력해야 합니다." } },
      400,
    );
  }

  return c.json({
    applied: result.applied,
    action: parsed.data.action,
    previousStatus: result.previousStatus,
    newStatus: result.newStatus,
  });
});
