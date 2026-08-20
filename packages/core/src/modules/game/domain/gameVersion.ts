/**
 * Unified Game Platform, Stage A-4 — provider-neutral immutable bundle/version identity and
 * publish state. USER review lifecycle deliberately remains in sandbox_game_versions.
 */

export const GAME_VERSION_PUBLISH_STATUSES = ["UPLOADED", "PUBLISHING", "READY", "FAILED"] as const;

export type GameVersionPublishStatus = (typeof GAME_VERSION_PUBLISH_STATUSES)[number];

export interface GameVersion {
  readonly id: number;
  readonly gameId: number;
  readonly objectKey: string;
  readonly contentHash: string;
  readonly bundleBytes: number;
  readonly publishStatus: GameVersionPublishStatus;
  readonly publishError: string | null;
  readonly publishedAt: string | null;
  readonly manifestKey: string | null;
  readonly publishedSizeBytes: number | null;
  readonly fileCount: number | null;
  readonly uploadedAt: string;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isNullableNonEmptyString(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.length > 0);
}

/** Structural validation only. Publish workflows own state-transition rules; this model guarantees
 * that a runtime read never silently accepts malformed identifiers, sizes, statuses, or timestamps. */
export function isValidGameVersion(value: unknown): value is GameVersion {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GameVersion>;

  if (!isPositiveInteger(candidate.id) || !isPositiveInteger(candidate.gameId)) return false;
  if (typeof candidate.objectKey !== "string" || candidate.objectKey.length === 0) return false;
  if (typeof candidate.contentHash !== "string" || candidate.contentHash.length === 0) return false;
  if (!isNonNegativeInteger(candidate.bundleBytes)) return false;
  if (!GAME_VERSION_PUBLISH_STATUSES.includes(candidate.publishStatus as never)) return false;
  if (!isNullableNonEmptyString(candidate.publishError)) return false;
  if (!isNullableNonEmptyString(candidate.publishedAt)) return false;
  if (!isNullableNonEmptyString(candidate.manifestKey)) return false;
  if (
    candidate.publishedSizeBytes !== null &&
    !isNonNegativeInteger(candidate.publishedSizeBytes)
  ) {
    return false;
  }
  if (candidate.fileCount !== null && !isNonNegativeInteger(candidate.fileCount)) return false;
  if (typeof candidate.uploadedAt !== "string" || candidate.uploadedAt.length === 0) return false;

  return true;
}
