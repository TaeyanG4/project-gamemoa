import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/index.js";

function createAdminDb(options: { userId: number; verified?: boolean } = { userId: 1 }) {
  const verified = options.verified ?? true;
  const state = {
    jobStatus: "MANUAL_REVIEW",
    auditCount: 0,
    batchCount: 0,
  };

  const accountRow = {
    id: 11,
    creator_id: 1,
    platform: "YOUTUBE",
    platform_user_id: "UC123",
    channel_name: "Test Channel",
    channel_handle: "@test",
    channel_url: "https://youtube.com/@test",
    avatar_url: null,
    verification_status: verified ? "VERIFIED" : "PENDING",
    verified_at: verified ? "2026-01-01T00:00:00.000Z" : null,
    audience_count: 11500,
    channel_created_at: "2024-01-01T00:00:00.000Z",
    metrics_synced_at: "2026-08-01T00:00:00.000Z",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
  };

  const profileRow = {
    id: 1,
    user_id: 7,
    status: verified ? "VERIFIED" : "UNVERIFIED",
    featured_status: "NONE",
    featured_reason: "추가 확인 필요",
    featured_since: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
  };

  const jobRow = {
    id: 21,
    creator_platform_account_id: 11,
    review_type: "ACQUISITION",
    status: state.jobStatus,
    initial_audience: 11500,
    initial_channel_created_at: "2024-01-01T00:00:00.000Z",
    next_check_at: "2026-08-01T00:00:00.000Z",
    attempt_count: 0,
    last_error: "internal error must not be exposed",
    review_reason: "공식 지표 기준의 추가 확인이 필요합니다.",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    completed_at: null,
  };

  const manualRow = {
    ...jobRow,
    review_user_id: 7,
    review_nickname: "CreatorUser",
    review_creator_id: 1,
    review_creator_status: profileRow.status,
    review_featured_status: profileRow.featured_status,
    review_account_id: accountRow.id,
    review_account_creator_id: accountRow.creator_id,
    review_platform: accountRow.platform,
    review_platform_user_id: accountRow.platform_user_id,
    review_channel_name: accountRow.channel_name,
    review_channel_handle: accountRow.channel_handle,
    review_channel_url: accountRow.channel_url,
    review_avatar_url: accountRow.avatar_url,
    review_verification_status: accountRow.verification_status,
    review_verified_at: accountRow.verified_at,
    review_audience_count: accountRow.audience_count,
    review_channel_created_at: accountRow.channel_created_at,
    review_metrics_synced_at: accountRow.metrics_synced_at,
    review_account_created_at: accountRow.created_at,
    review_account_updated_at: accountRow.updated_at,
  };

  function statement(query: string) {
    let values: unknown[] = [];
    return {
      query,
      bind(...bound: unknown[]) {
        values = bound;
        return this;
      },
      async first<T>() {
        if (query.includes("JOIN users u ON s.user_id = u.id")) {
          return {
            session_id: "valid_session",
            user_id: options.userId,
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            session_created_at: new Date().toISOString(),
            nickname: "admin",
            email: "admin@example.com",
            avatar_url: null,
            user_created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as T;
        }
        if (query.includes("SELECT COUNT(*) AS total FROM creator_review_jobs")) {
          return { total: state.jobStatus === "MANUAL_REVIEW" ? 1 : 0 } as T;
        }
        if (query.includes("SELECT COUNT(*) AS total FROM creator_review_audit_log")) {
          return { total: state.auditCount } as T;
        }
        if (query.includes("FROM creator_review_audit_log") && query.includes("LIMIT 1")) {
          return null;
        }
        if (query.includes("FROM creator_review_jobs rj")) {
          return { ...manualRow, status: state.jobStatus } as T;
        }
        return null;
      },
      async all<T>() {
        if (query.includes("FROM creator_review_jobs rj")) {
          return {
            results:
              state.jobStatus === "MANUAL_REVIEW"
                ? [{ ...manualRow, status: state.jobStatus }]
                : [],
          } as { results: T[] };
        }
        if (query.includes("creator_review_audit_log audit")) {
          return { results: [] } as { results: T[] };
        }
        return { results: [] } as { results: T[] };
      },
      async run() {
        return { success: true, meta: { changes: 0 } };
      },
      getValues() {
        return values;
      },
    };
  }

  return {
    state,
    db: {
      prepare(query: string) {
        return statement(query);
      },
      async batch(statements: Array<ReturnType<typeof statement>>) {
        state.batchCount += 1;
        const results = statements.map((item, index) => {
          if (index === 0) {
            state.jobStatus = String(item.getValues()[0]);
            return { success: true, meta: { changes: 1 } };
          }
          if (item.query.includes("INSERT INTO creator_review_audit_log")) {
            state.auditCount += 1;
          }
          return { success: true, meta: { changes: 1 } };
        });
        return results;
      },
    },
  };
}

test("admin creator queue — non-admin is denied even with admin-like email and nickname", async () => {
  const mock = createAdminDb({ userId: 7 });
  const res = await app.request(
    "/api/admin/creators/reviews",
    { headers: { Cookie: "gamemoa_session=valid_session" } },
    { DB: mock.db, ADMIN_USER_IDS: "1" } as any,
  );
  assert.equal(res.status, 403);
  assert.equal(mock.state.batchCount, 0);
});

test("admin creator queue — missing ADMIN_USER_IDS denies by default", async () => {
  const mock = createAdminDb({ userId: 1 });
  const res = await app.request(
    "/api/admin/creators/reviews",
    { headers: { Cookie: "gamemoa_session=valid_session" } },
    { DB: mock.db } as any,
  );
  assert.equal(res.status, 403);
});

test("admin creator queue — configured user can read qualification-only data", async () => {
  const mock = createAdminDb({ userId: 1 });
  const res = await app.request(
    "/api/admin/creators/reviews",
    { headers: { Cookie: "gamemoa_session=valid_session" } },
    { DB: mock.db, ADMIN_USER_IDS: "1" } as any,
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;
  assert.equal(body.items[0].nickname, "CreatorUser");
  assert.equal(body.items[0].platformAccount.audienceCount, 11500);
  assert.equal("lastError" in body.items[0].job, false);
  assert.equal(JSON.stringify(body).includes("internal error"), false);
});

test("manual approval — requires verified ownership and explicit reason", async () => {
  const unverified = createAdminDb({ userId: 1, verified: false });
  const missingReason = await app.request(
    "/api/admin/creators/reviews/21/action",
    {
      method: "POST",
      headers: { Cookie: "gamemoa_session=valid_session", "Content-Type": "application/json" },
      body: JSON.stringify({ action: "APPROVE_FEATURED", reason: "" }),
    },
    { DB: unverified.db, ADMIN_USER_IDS: "1" } as any,
  );
  assert.equal(missingReason.status, 400);

  const rejectedApproval = await app.request(
    "/api/admin/creators/reviews/21/action",
    {
      method: "POST",
      headers: { Cookie: "gamemoa_session=valid_session", "Content-Type": "application/json" },
      body: JSON.stringify({ action: "APPROVE_FEATURED", reason: "소유권 확인 필요" }),
    },
    { DB: unverified.db, ADMIN_USER_IDS: "1" } as any,
  );
  assert.equal(rejectedApproval.status, 409);
  assert.equal(unverified.state.batchCount, 0);
});

test("manual approval — transitions once, creates audit row, and replay is safe", async () => {
  const mock = createAdminDb({ userId: 1 });
  const request = {
    method: "POST",
    headers: { Cookie: "gamemoa_session=valid_session", "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "APPROVE_FEATURED",
      reason: "공식 지표와 소유권을 확인했습니다.",
    }),
  };
  const first = await app.request("/api/admin/creators/reviews/21/action", request, {
    DB: mock.db,
    ADMIN_USER_IDS: "1",
  } as any);
  assert.equal(first.status, 200);
  assert.equal((await first.json()).applied, true);
  assert.equal(mock.state.auditCount, 1);

  const replay = await app.request("/api/admin/creators/reviews/21/action", request, {
    DB: mock.db,
    ADMIN_USER_IDS: "1",
  } as any);
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).applied, false);
  assert.equal(mock.state.auditCount, 1);
});

test("manual rejection — transitions manual review to NOT_ELIGIBLE", async () => {
  const mock = createAdminDb({ userId: 1 });
  const res = await app.request(
    "/api/admin/creators/reviews/21/action",
    {
      method: "POST",
      headers: { Cookie: "gamemoa_session=valid_session", "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "REJECT_FEATURED",
        reason: "최소 유지 기준을 충족하지 못했습니다.",
      }),
    },
    { DB: mock.db, ADMIN_USER_IDS: "1" } as any,
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as { applied: boolean; newStatus: string };
  assert.equal(body.applied, true);
  assert.equal(body.newStatus, "NOT_ELIGIBLE");
  assert.equal(mock.state.auditCount, 1);
});
