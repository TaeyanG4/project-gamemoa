import { z } from "zod";

export const SubmitScoreRequestSchema = z.object({
  game_id: z.string().min(1, "Game ID is required"),
  score: z.number().finite("Score must be a finite number"),
  nickname: z.string().optional(),
});
export type SubmitScoreRequest = z.infer<typeof SubmitScoreRequestSchema>;

export const SubmitScoreResponseSchema = z.object({
  success: z.boolean(),
  score_id: z.number().optional(),
});
export type SubmitScoreResponse = z.infer<typeof SubmitScoreResponseSchema>;

export const PersonalBestResponseSchema = z.object({
  bests: z.record(z.string(), z.number()),
});
export type PersonalBestResponse = z.infer<typeof PersonalBestResponseSchema>;
