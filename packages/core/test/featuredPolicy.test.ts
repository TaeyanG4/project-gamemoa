import test from "node:test";
import assert from "node:assert/strict";
import {
  FEATURED_POLICY,
  channelAgeDays,
  evaluateFeaturedInitial,
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

test("evaluateFeaturedInitial — audience below min → NOT_ELIGIBLE", () => {
  const d = evaluateFeaturedInitial({
    ownershipVerified: true,
    audienceCount: 9999,
    channelCreatedAt: isoDaysAgo(500),
    nowMs: NOW_MS,
  });
  assert.equal(d.status, "NOT_ELIGIBLE");
  assert.match(d.reason, /기준 미달/);
});

test("evaluateFeaturedInitial — channel younger than 90 days → NOT_ELIGIBLE", () => {
  const d = evaluateFeaturedInitial({
    ownershipVerified: true,
    audienceCount: 50000,
    channelCreatedAt: isoDaysAgo(89),
    nowMs: NOW_MS,
  });
  assert.equal(d.status, "NOT_ELIGIBLE");
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

test("evaluateFeaturedRecheck — audience drops below min → NOT_ELIGIBLE", () => {
  const d = evaluateFeaturedRecheck({
    audienceCount: 9999,
    channelCreatedAt: isoDaysAgo(500),
    nowMs: NOW_MS,
  });
  assert.equal(d.status, "NOT_ELIGIBLE");
});

test("evaluateFeaturedRecheck — 9,000 between retention floor and acquisition min → NOT_ELIGIBLE (E2B hysteresis not active in E2A)", () => {
  const d = evaluateFeaturedRecheck({
    audienceCount: 9000,
    channelCreatedAt: isoDaysAgo(500),
    nowMs: NOW_MS,
  });
  assert.equal(d.status, "NOT_ELIGIBLE");
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
  assert.equal(FEATURED_POLICY.ACQUISITION_AUDIENCE_MIN, 10000);
  assert.equal(FEATURED_POLICY.ACQUISITION_AUDIENCE_AUTO, 12000);
  assert.equal(FEATURED_POLICY.ACQUISITION_CHANNEL_AGE_MIN_DAYS, 90);
  assert.equal(FEATURED_POLICY.ACQUISITION_CHANNEL_AGE_AUTO_DAYS, 120);
  assert.equal(FEATURED_POLICY.RETENTION_AUDIENCE_FLOOR, 8000);
  assert.equal(FEATURED_POLICY.REVIEW_INTERVAL_MS, 6 * 60 * 60 * 1000);
  assert.equal(FEATURED_POLICY.RETRY_INTERVAL_MS, 6 * 60 * 60 * 1000);
  assert.equal(FEATURED_POLICY.MAX_ATTEMPTS, 5);
  assert.equal(FEATURED_POLICY.MAX_BATCH_SIZE, 50);
  assert.equal(FEATURED_POLICY.DEFAULT_BATCH_SIZE, 20);
});
