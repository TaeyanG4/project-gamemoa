/**
 * Discord Guild domain policy rules for Phase G & H.
 * Pure domain logic: no D1, Hono, HTTP, or browser dependencies.
 */

export const MANAGE_GUILD_BIT = 32n; // 1n << 5n (0x20)
export const ADMINISTRATOR_BIT = 8n; // 1n << 3n (0x8)

export const RESERVED_GUILD_SLUGS = new Set<string>([
  "register",
  "search",
  "manage",
  "admin",
  "api",
  "link",
  "new",
  "edit",
  "settings",
  "servers",
  "bot",
  "help",
  "gamemoa",
  "null",
  "undefined",
  "system",
  "leaderboard",
  "ranking",
  "rank",
  "profile",
  "user",
  "users",
  "guild",
  "guilds",
  "auth",
  "home",
  "games",
]);

export function hasGuildManagementPermission(
  permissions?: string | null,
  isOwner?: boolean,
): boolean {
  if (isOwner) return true;
  if (!permissions) return false;
  try {
    const bitfield = BigInt(permissions);
    return (bitfield & ADMINISTRATOR_BIT) !== 0n || (bitfield & MANAGE_GUILD_BIT) !== 0n;
  } catch {
    return false;
  }
}

export function validateVanitySlug(slug: string): { valid: boolean; reason?: string } {
  if (typeof slug !== "string") {
    return { valid: false, reason: "Slug must be a string" };
  }
  const trimmed = slug.trim();
  if (trimmed.length < 3) {
    return { valid: false, reason: "Slug must be at least 3 characters long" };
  }
  if (trimmed.length > 32) {
    return { valid: false, reason: "Slug must be at most 32 characters long" };
  }

  // Lowercase, alphanumeric + hyphen, no leading/trailing hyphen, no consecutive hyphens
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(trimmed)) {
    return {
      valid: false,
      reason:
        "Slug must consist of lowercase letters, numbers, and hyphens without leading, trailing, or consecutive hyphens",
    };
  }

  if (RESERVED_GUILD_SLUGS.has(trimmed.toLowerCase())) {
    return { valid: false, reason: `Slug '${trimmed}' is reserved` };
  }

  return { valid: true };
}

export function slugifyGuildName(name: string): string {
  if (!name) return "server-hub";
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumeric to hyphens
    .replace(/^-+|-+$/g, "") // trim hyphens
    .replace(/-{2,}/g, "-"); // merge multiple hyphens

  if (normalized.length < 3) {
    const fallback = `guild-${normalized}`.replace(/^-+|-+$/g, "");
    return fallback.length >= 3 ? fallback : "server-hub";
  }

  const bounded = normalized.slice(0, 30).replace(/-+$/, "");
  if (RESERVED_GUILD_SLUGS.has(bounded)) {
    return `${bounded}-hub`;
  }
  return bounded;
}

/**
 * Calculates the start of the current week (Monday 00:00:00 Asia/Seoul KST)
 * and returns it as an ISO 8601 UTC string (e.g. "2026-08-09T15:00:00.000Z").
 * Asia/Seoul is UTC+9. Monday 00:00 KST equals Sunday 15:00 UTC of the previous day.
 */
export function getStartOfWeekKst(now: Date = new Date()): string {
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  const kstDate = new Date(kstMs);

  const day = kstDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  const kstMidnightMs = Date.UTC(
    kstDate.getUTCFullYear(),
    kstDate.getUTCMonth(),
    kstDate.getUTCDate() - daysSinceMonday,
    0,
    0,
    0,
    0,
  );

  const startOfWeekUtcMs = kstMidnightMs - 9 * 60 * 60 * 1000;
  return new Date(startOfWeekUtcMs).toISOString();
}
