import { z } from "zod";

export const scoreSubmissionSchema = z.object({
  gameId: z.string().min(1, "Game ID is required"),
  score: z.number().min(0, "Score cannot be negative"),
  grade: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  playToken: z.string().optional(),
  timestamp: z.number().default(() => Date.now()),
  /** Omitted = the game's default difficulty (or "normal" for games without difficulty tiers).
   * Validated server-side against the game's manifest — see scoreValidation.ts. */
  difficulty: z.string().optional(),
});
export type ScoreSubmission = z.infer<typeof scoreSubmissionSchema>;

export const SubmitScoreRequestSchema = z.object({
  game_id: z.string().min(1, "Game ID is required"),
  score: z.number().finite("Score must be a finite number"),
  nickname: z.string().optional(),
  play_token: z.string().optional(),
  playToken: z.string().optional(),
});
export type SubmitScoreRequest = z.infer<typeof SubmitScoreRequestSchema>;

export const SubmitScoreResponseSchema = z.object({
  success: z.boolean(),
  score_id: z.number().optional(),
  game_id: z.string().optional(),
  score: z.number().optional(),
  nickname: z.string().optional(),
  // Progression side-effects of this accepted completion. XP never affects the score
  // above — these fields are purely informational for client UX (e.g. a small XP toast).
  xpAwarded: z.number().int().min(0).optional(),
  guildXpAwarded: z.number().int().min(0).optional(),
  guildId: z.string().optional(),
  newlyUnlockedAchievements: z.array(z.string()).optional(),
});
export type SubmitScoreResponse = z.infer<typeof SubmitScoreResponseSchema>;

export const PersonalBestResponseSchema = z.object({
  authenticated: z.boolean().default(false),
  user_id: z.number().optional(),
  bests: z.record(z.string(), z.number()),
});
export type PersonalBestResponse = z.infer<typeof PersonalBestResponseSchema>;

export const LeaderboardQuerySchema = z.object({
  gameId: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  timeframe: z.enum(["all", "weekly", "daily"]).default("all"),
});
export type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;
