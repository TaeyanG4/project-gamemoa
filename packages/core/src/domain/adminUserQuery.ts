// Pure UTC-calendar date math for the admin user list's period filter + sort order. No D1/Hono
// here — same "pure predicate, I/O lives in the D1 adapter" split as domain/streak.ts.

export const ADMIN_USER_SEARCH_PERIODS = ["all", "today", "week", "month"] as const;
export type AdminUserSearchPeriod = (typeof ADMIN_USER_SEARCH_PERIODS)[number];

export const ADMIN_USER_SEARCH_SORTS = ["createdAt_desc", "createdAt_asc"] as const;
export type AdminUserSearchSort = (typeof ADMIN_USER_SEARCH_SORTS)[number];

/**
 * Returns the inclusive UTC-calendar lower bound (ISO string) a user's `created_at` must fall on
 * or after to match `period`, or `null` for "all" (no lower bound).
 *  - "today" = current UTC calendar day (00:00 UTC)
 *  - "week"  = current UTC calendar week, Monday 00:00 UTC
 *  - "month" = current UTC calendar month, 1st 00:00 UTC
 * Calendar-based (not a rolling N-day window) — matches what "오늘/이번주/이번달 가입" means to an
 * operator reading the admin panel, not a DAU/WAU-style rolling metric.
 */
export function resolveAdminUserPeriodStart(
  period: AdminUserSearchPeriod,
  now: Date = new Date(),
): string | null {
  if (period === "all") return null;

  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const date = now.getUTCDate();

  if (period === "today") {
    return new Date(Date.UTC(year, month, date)).toISOString();
  }
  if (period === "month") {
    return new Date(Date.UTC(year, month, 1)).toISOString();
  }

  // "week": back up to the most recent Monday. getUTCDay() is 0=Sunday..6=Saturday.
  const dayOfWeek = now.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  return new Date(Date.UTC(year, month, date - daysSinceMonday)).toISOString();
}
