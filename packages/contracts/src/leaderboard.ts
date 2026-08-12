import { z } from "zod";

export const LeaderRecordSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((val) => String(val)),
  playerName: z.string(),
  gameId: z.string().optional(),
  gameTitle: z.string().optional(),
  score: z.number(),
  formattedScore: z.string(),
  grade: z.string().optional(),
  createdAt: z.string(),
  avatarUrl: z.string().nullable().optional(),
});
export type LeaderRecord = z.infer<typeof LeaderRecordSchema>;

export const LeaderboardResponseSchema = z.object({
  game_id: z.string().optional(),
  gameId: z.string().optional(),
  leaderboard: z.array(LeaderRecordSchema),
});
export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;
