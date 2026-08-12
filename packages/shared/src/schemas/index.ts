import { z } from "zod";
import { LeaderRecordSchema } from "@gamemoa/contracts";

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

export const leaderRecordSchema = LeaderRecordSchema;
export type { LeaderRecord } from "@gamemoa/contracts";
