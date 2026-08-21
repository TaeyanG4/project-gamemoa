/** The subset of a Creator D1 row {@link isCreatorScorePolicyConfigured} actually reads. */
export interface CreatorScorePolicySource {
  readonly scoreUnit: string | null;
  readonly scoreDirection: "asc" | "desc" | null;
  readonly scoreMin: number | null;
  readonly scoreMax: number | null;
}

/** What {@link isCreatorScorePolicyConfigured} narrows the four score_* columns to once it
 * returns `true` — intersected with the caller's own input type, so any other fields the caller
 * passed (e.g. `scoreDisplayPrefix`/`scoreDisplaySuffix`) stay exactly as they were. */
interface CreatorScorePolicyConfigured {
  readonly scoreUnit: string;
  readonly scoreDirection: "asc" | "desc";
  readonly scoreMin: number;
  readonly scoreMax: number;
}

/**
 * Whether a Creator control-plane row's score_* columns are complete enough for canonical
 * mapping and patch validation. Runtime score authority comes only from the generic canonical.
 *
 * Unlike a SYSTEM game's GamePolicy (fixed at build time, always fully specified), a Creator
 * game's score policy is admin-set metadata that starts entirely unconfigured — every score_*
 * column is NULL until an admin sets it via SandboxGameUseCases.updateMetadata. "Not yet
 * configured" and "deliberately unscored" (`score: null` in a canonical document) are NOT the
 * same thing: this predicate answers "has an admin finished configuring this?", not "is this game
 * unscored?" — only a real B2 canonical document's own `policy.score` field can say the latter.
 * `scoreMin`/`scoreMax` of `0` are valid, present bounds — only a strict `=== null` counts as
 * unconfigured (falsy-zero would wrongly treat a real zero-min bound as missing).
 *
 * A type predicate, not a plain boolean, so callers keep narrowing their own input's
 * score_* fields to non-null after this returns `true`, the same way their own inline checks used
 * to before being extracted here.
 */
export function isCreatorScorePolicyConfigured<T extends CreatorScorePolicySource>(
  row: T,
): row is T & CreatorScorePolicyConfigured {
  return (
    row.scoreUnit !== null &&
    row.scoreDirection !== null &&
    row.scoreMin !== null &&
    row.scoreMax !== null
  );
}
