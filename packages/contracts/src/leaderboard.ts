import { z } from "zod";

export const LeaderRecordSchema = z.object({
  id: z.string(),
  playerName: z.string(),
  gameId: z.string(),
  gameTitle: z.string(),
  score: z.number(),
  formattedScore: z.string(),
  grade: z.string().optional(),
  createdAt: z.string(),
  avatarUrl: z.string().nullable().optional(),
});
export type LeaderRecord = z.infer<typeof LeaderRecordSchema>;

export const LeaderboardResponseSchema = z.object({
  gameId: z.string(),
  leaderboard: z.array(LeaderRecordSchema),
});
export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;
