/**
 * Reaction-time tier ladder (아이언 → 챌린저), purely a presentation aid derived from the
 * average reaction time (ms) of a completed attempt. Deliberately has zero effect on score
 * comparison, leaderboard ordering, or ranking integrity — this only decides which badge to show
 * on the result screen. Shared between uploaded game bundles (which compute the tier) and `apps/web`
 * (renders the badge) so the thresholds/labels/colors never drift between the two.
 */

export type ReactionTierId =
  | "iron"
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "master"
  | "grandmaster"
  | "challenger";

export interface ReactionTier {
  id: ReactionTierId;
  label: string;
  /** Inclusive upper bound (ms) of the average reaction time for this tier. */
  maxMs: number;
  /** Tailwind arbitrary-value gradient stops for the badge background. */
  colorFrom: string;
  colorTo: string;
}

// Ordered best (lowest ms) → worst (highest ms). Thresholds are rough, non-scientific bands over
// typical human visual reaction time (~200-300ms average) — tune freely, this never touches
// score/leaderboard data.
export const REACTION_TIERS: readonly ReactionTier[] = [
  { id: "challenger", label: "챌린저", maxMs: 180, colorFrom: "#fef08a", colorTo: "#f59e0b" },
  {
    id: "grandmaster",
    label: "그랜드마스터",
    maxMs: 200,
    colorFrom: "#f9a8d4",
    colorTo: "#db2777",
  },
  { id: "master", label: "마스터", maxMs: 220, colorFrom: "#d8b4fe", colorTo: "#9333ea" },
  { id: "diamond", label: "다이아", maxMs: 250, colorFrom: "#a5f3fc", colorTo: "#0ea5e9" },
  { id: "platinum", label: "플래티넘", maxMs: 280, colorFrom: "#99f6e4", colorTo: "#0d9488" },
  { id: "gold", label: "골드", maxMs: 320, colorFrom: "#fde68a", colorTo: "#d97706" },
  { id: "silver", label: "실버", maxMs: 380, colorFrom: "#e2e8f0", colorTo: "#94a3b8" },
  { id: "bronze", label: "브론즈", maxMs: 450, colorFrom: "#fdba74", colorTo: "#c2410c" },
  { id: "iron", label: "아이언", maxMs: Infinity, colorFrom: "#d6d3d1", colorTo: "#57534e" },
];

// Guaranteed non-undefined: the lowest tier (iron) always has maxMs === Infinity, so the loop in
// getReactionTier() below can never fall through without matching — this constant only exists to
// give that final fallback a type-safe, non-optional value.
const LOWEST_TIER: ReactionTier = REACTION_TIERS[REACTION_TIERS.length - 1] ?? {
  id: "iron",
  label: "아이언",
  maxMs: Infinity,
  colorFrom: "#d6d3d1",
  colorTo: "#57534e",
};

/** Returns the tier for a given average reaction time (ms), lower is better. */
export function getReactionTier(avgMs: number): ReactionTier {
  for (const tier of REACTION_TIERS) {
    if (avgMs <= tier.maxMs) return tier;
  }
  // Unreachable in practice (iron's maxMs is Infinity) — kept for exhaustiveness/type safety.
  return LOWEST_TIER;
}

export function getReactionTierById(id: string): ReactionTier | undefined {
  return REACTION_TIERS.find((tier) => tier.id === id);
}
