/**
 * Projects a Creator game's `GameDefinition["status"]` from D1 runtime/lifecycle state — never
 * from B2 canonical (the canonical document has no concept of review/publish state at all, by
 * design — see domain/creatorGameCanonicalDocument.ts's own doc comment on why review/publish
 * status, visibility, and liveVersionId are excluded from it).
 *
 * `GameStatus` (@owogg/game-sdk/contracts) is `"draft" | "beta" | "published" | "hidden"` — SYSTEM
 * games are the only ones that ever use `"beta"` (a build-time editorial choice, declared in
 * game-registry/games/<slug>/info.json); nothing about a Creator game's D1 lifecycle maps to it,
 * so {@link CreatorGameRuntimeStatus} deliberately excludes it at the type level rather than just
 * by convention.
 *
 * Rules (D1 runtime axes only — see sandbox_games' own migration comment for what each column
 * means):
 *   - `liveVersionId === null` → `"draft"` — no approved version has ever gone live yet.
 *   - `liveVersionId !== null && visibility === "PRIVATE"` → `"hidden"` — an approved version
 *     exists, but an admin/developer has it turned off.
 *   - `liveVersionId !== null && visibility === "PUBLIC"` → `"published"`.
 */

import type { SandboxGameRecord } from "../../../ports/sandboxGames.js";

export const CREATOR_GAME_RUNTIME_STATUSES = ["draft", "hidden", "published"] as const;
export type CreatorGameRuntimeStatus = (typeof CREATOR_GAME_RUNTIME_STATUSES)[number];

/** The subset of `SandboxGameRecord` this projection actually reads. */
export type CreatorGameStatusSource = Pick<
  SandboxGameRecord,
  "liveVersionId" | "visibility" | "deletedAt"
>;

/**
 * `row.deletedAt !== null` is a fail-closed assertion, not a case this returns a status for — a
 * soft-deleted Creator game must never reach status projection at all. Both real call sites
 * (`CreatorGameRegistry.findBySlug`, via `SandboxGameRepository.findBySlug`'s own deleted-row
 * exclusion, and `CreatorGameRegistry.listAll`, which filters `deletedAt !== null` rows out before
 * projecting anything) already guarantee this never happens — reaching this throw would mean one
 * of those guarantees broke, which is exactly the kind of DB-invariant violation that must fail
 * loudly rather than silently produce a status for a game that no longer exists.
 */
export function projectCreatorGameStatus(row: CreatorGameStatusSource): CreatorGameRuntimeStatus {
  if (row.deletedAt !== null) {
    throw new Error(
      "projectCreatorGameStatus called with a soft-deleted row — deleted Creator games must " +
        "never reach status projection (CreatorGameRegistry's own findBySlug/listAll both " +
        "exclude deleted_at rows before this is ever called)",
    );
  }

  if (row.liveVersionId === null) {
    return "draft";
  }

  switch (row.visibility) {
    case "PRIVATE":
      return "hidden";
    case "PUBLIC":
      return "published";
    default: {
      // Exhaustiveness guard — SandboxGameVisibility is "PRIVATE" | "PUBLIC" today
      // (domain/sandboxGames.ts). A future third value must fail loudly here, not silently fall
      // through to "published".
      const unreachable: never = row.visibility;
      throw new Error(
        `projectCreatorGameStatus: unknown sandbox game visibility "${String(unreachable)}"`,
      );
    }
  }
}
