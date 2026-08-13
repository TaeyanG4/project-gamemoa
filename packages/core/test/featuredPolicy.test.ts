import test from "node:test";
import assert from "node:assert/strict";
import {
  FEATURED_POLICY,
  channelAgeDays,
  evaluateFeaturedInitial,
  evaluateFeaturedRevalidation,
  evaluateFeaturedRecheck,
} from "../src/index.js";

const NOW_MS = new Date("2026-06-01T00:00:00.000Z").getTime();

function isoDaysAgo(days: number): string {
  return new Date(NOW_MS - days * 86_400_000).toISOString();
}

test("channelAgeDays — computes calendar-day age of the channel", () => {
  assert.equal(channelAgeDays(isoDaysAgo(0), NOW_MS), 0);
  assert.equal(channelAgeDays(isoDaysAgo(30), NOW_MS), 30);
  assert.equal(channelAgeDays(isoDaysAgo(120), NOW_MS), 120);
});

test("evaluateFeaturedInitial — ownership not verified → NOT_ELIGIBLE", () => {
  const d = evaluateFeaturedInitial({
    ownershipVerified: false,
    audienceCount: 50000,
    channelCreatedAt: isoDaysAgo(500),
    nowMs: NOW_MS,
  });
  assert.equal(d.status, "NOT_ELIGIBLE");
  assert.match(d.reason, /소유권/);
});

// NOTE: ACQUISITION_AUDIENCE_MIN / ACQUISITION_CHANNEL_AGE_MIN_DAYS are TEMPORARILY 0
// (see featuredPolicy.ts comment, 운영자 지시 2026-08-14) so a small/new test channel can
// never be silently NOT_ELIGIBLE — it always lands in MANUAL_REVIEW instead, where an admin
// can act on it. The tests below document that behavior; the ACQUISITION_AUDIENCE_AUTO /
// ACQUISITION_CHANNEL_AGE_AUTO_DAYS thresholds (unchanged) still gate automatic promotion.
test("evaluateFeaturedInitial — tiny audience & brand-new channel → MANUAL_REVIEW, never NOT_ELIGIBLE (temporary no-minimum policy)", () => {
  const d = evaluateFeaturedInitial({
    ownershipVerified: true,
    audienceCount: 5,
    channelCreatedAt: isoDaysAgo(1),
    nowMs: NOW_MS,
  });
  assert.equal(d.status, "MANUAL_REVIEW");
  assert.match(d.reason, /추가 확인/);
});

test("evaluateFeaturedInitial — channel younger than 90 days but large audience → MANUAL_REVIEW (auto-age threshold unchanged)", () => {
  const d = evaluateFeaturedInitial({
    ownershipVerified: true,
    audienceCount: 50000,
    channelCreatedAt: isoDaysAgo(89),
    nowMs: NOW_MS,
  });
  assert.equal(d.status, "MANUAL_REVIEW");
});

test("evaluateFeaturedInitial — 10,000+ audience & 90d+ but below auto threshold → MANUAL_REVIEW", () => {
  const d = evaluateFeaturedInitial({
    ownershipVerified: true,
    audienceCount: 11500,
    channelCreatedAt: isoDaysAgo(180),
    nowMs: NOW_MS,
  });
  assert.equal(d.status, "MANUAL_REVIEW");
  assert.match(d.reason, /추가 확인/);
});

test("evaluateFeaturedInitial — audience ≥ 12,000 but channel age 119d → MANUAL_REVIEW", () => {
  const d = evaluateFeaturedInitial({
    ownershipVerified: true,
    audienceCount: 12000,
    channelCreatedAt: isoDaysAgo(119),
    nowMs: NOW_MS,
  });
  assert.equal(d.status, "MANUAL_REVIEW");
});

test("evaluateFeaturedInitial — missing audience or creation date → MANUAL_REVIEW (never guessed)", () => {
  const noAudience = evaluateFeaturedInitial({
    ownershipVerified: true,
    audienceCount: null,
    channelCreatedAt: isoDaysAgo(500),
    nowMs: NOW_MS,
  });
  assert.equal(noAudience.status, "MANUAL_REVIEW");

  const noDate = evaluateFeaturedInitial({
    ownershipVerified: true,
    audienceCount: 50000,
    channelCreatedAt: null,
    nowMs: NOW_MS,
  });
  assert.equal(noDate.status, "MANUAL_REVIEW");
});

test("evaluateFeaturedInitial — fully qualified → AUTO_REVIEW_PENDING (never FEATURED directly)", () => {
  const d = evaluateFeaturedInitial({
    ownershipVerified: true,
    audienceCount: 12000,
    channelCreatedAt: isoDaysAgo(120),
    nowMs: NOW_MS,
  });
  assert.equal(d.status, "AUTO_REVIEW_PENDING");
  assert.match(d.reason, /자동 심사/);
});

test("evaluateFeaturedRecheck — qualified metrics → FEATURED", () => {
  const d = evaluateFeaturedRecheck({
    audienceCount: 12000,
    channelCreatedAt: isoDaysAgo(120),
    nowMs: NOW_MS,
  });
  assert.equal(d.status, "FEATURED");
});

test("evaluateFeaturedRecheck — audience below acquisition-auto threshold → MANUAL_REVIEW, never NOT_ELIGIBLE (temporary no-minimum policy)", () => {
  const d = evaluateFeaturedRecheck({
    audienceCount: 9999,
    channelCreatedAt: isoDaysAgo(500),
    nowMs: NOW_MS,
  });
  assert.equal(d.status, "MANUAL_REVIEW");
});

test("evaluateFeaturedRecheck — 9,000 (below acquisition-auto threshold) → MANUAL_REVIEW", () => {
  const d = evaluateFeaturedRecheck({
    audienceCount: 9000,
    channelCreatedAt: isoDaysAgo(500),
    nowMs: NOW_MS,
  });
  assert.equal(d.status, "MANUAL_REVIEW");
});

test("evaluateFeaturedRecheck — missing metrics → MANUAL_REVIEW", () => {
  const d = evaluateFeaturedRecheck({
    audienceCount: null,
    channelCreatedAt: isoDaysAgo(500),
    nowMs: NOW_MS,
  });
  assert.equal(d.status, "MANUAL_REVIEW");
});

test("FEATURED_POLICY — thresholds are explicit and documented", () => {
  // ACQUISITION_AUDIENCE_MIN / ACQUISITION_CHANNEL_AGE_MIN_DAYS / RETENTION_AUDIENCE_FLOOR are
  // TEMPORARILY 0 (운영자 지시, 2026-08-14) — normal values are 10000 / 90 / 8000, see the
  // comment in featuredPolicy.ts for the restore plan.
  assert.equal(FEATURED_POLICY.ACQUISITION_AUDIENCE_MIN, 0);
  assert.equal(FEATURED_POLICY.ACQUISITION_AUDIENCE_AUTO, 12000);
  assert.equal(FEATURED_POLICY.ACQUISITION_CHANNEL_AGE_MIN_DAYS, 0);
  assert.equal(FEATURED_POLICY.ACQUISITION_CHANNEL_AGE_AUTO_DAYS, 120);
  assert.equal(FEATURED_POLICY.RETENTION_AUDIENCE_FLOOR, 0);
  assert.equal(FEATURED_POLICY.REVIEW_INTERVAL_MS, 6 * 60 * 60 * 1000);
  assert.equal(FEATURED_POLICY.RETRY_INTERVAL_MS, 6 * 60 * 60 * 1000);
  assert.equal(FEATURED_POLICY.MAX_ATTEMPTS, 5);
  assert.equal(FEATURED_POLICY.MAX_BATCH_SIZE, 50);
  assert.equal(FEATURED_POLICY.DEFAULT_BATCH_SIZE, 20);
  assert.equal(FEATURED_POLICY.REVALIDATION_INTERVAL_MS, 14 * 24 * 60 * 60 * 1000);
  assert.equal(FEATURED_POLICY.REVALIDATION_RETRY_INTERVAL_MS, 6 * 60 * 60 * 1000);
});

test("evaluateFeaturedRevalidation — any known non-negative audience retains Featured (RETENTION_AUDIENCE_FLOOR temporarily 0)", () => {
  assert.equal(evaluateFeaturedRevalidation({ audienceCount: 0 }).status, "RETAIN_FEATURED");
  assert.equal(evaluateFeaturedRevalidation({ audienceCount: 8000 }).status, "RETAIN_FEATURED");
  assert.equal(evaluateFeaturedRevalidation({ audienceCount: 12000 }).status, "RETAIN_FEATURED");
});

test("evaluateFeaturedRevalidation — temporary or unavailable metrics preserve badge via manual review", () => {
  assert.equal(evaluateFeaturedRevalidation({ audienceCount: null }).status, "MANUAL_REVIEW");
  assert.equal(
    evaluateFeaturedRevalidation({ audienceCount: 20000, channelState: "NOT_FOUND" }).status,
    "REVOKE_FEATURED",
  );
});
