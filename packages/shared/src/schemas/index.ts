import { z } from "zod";

export const scoreSubmissionSchema = z.object({
  gameId: z.string().min(1, "Game ID is required"),
  score: z.number().min(0, "Score cannot be negative"),
  grade: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.number().default(() => Date.now()),
});

export type ScoreSubmission = z.infer<typeof scoreSubmissionSchema>;

export const leaderboardQuerySchema = z.object({
  gameId: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  timeframe: z.enum(["all", "weekly", "daily"]).default("all"),
});

export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;

export const leaderRecordSchema = z.object({
  id: z.string(),
  playerName: z.string(),
  avatarUrl: z.string().optional(),
  gameId: z.string(),
  gameTitle: z.string(),
  score: z.number(),
  formattedScore: z.string(),
  grade: z.string().optional(),
  createdAt: z.string(),
});

export type LeaderRecord = z.infer<typeof leaderRecordSchema>;
