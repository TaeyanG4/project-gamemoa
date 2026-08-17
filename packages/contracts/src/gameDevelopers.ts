import { z } from "zod";

/** Upload permission record for one user — see packages/db/migrations/0024_sandbox_games.sql. */
export const GameDeveloperStatusSchema = z.enum(["ACTIVE", "REVOKED"]);

export const GameDeveloperRecordSchema = z.object({
  userId: z.number().int().positive(),
  grantedByAdminId: z.number().int().positive(),
  status: GameDeveloperStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type GameDeveloperRecord = z.infer<typeof GameDeveloperRecordSchema>;

export const GameDeveloperAuditEntrySchema = z.object({
  id: z.number().int(),
  targetUserId: z.number().int(),
  actorAdminId: z.number().int(),
  action: z.enum(["GRANTED", "REVOKED", "REINSTATED"]),
  createdAt: z.string(),
});
export type GameDeveloperAuditEntry = z.infer<typeof GameDeveloperAuditEntrySchema>;

export const GameDeveloperGrantRequestSchema = z.object({
  userId: z.number().int().positive(),
});
export type GameDeveloperGrantRequest = z.infer<typeof GameDeveloperGrantRequestSchema>;

export const GameDeveloperListResponseSchema = z.object({
  developers: z.array(GameDeveloperRecordSchema),
});
export type GameDeveloperListResponse = z.infer<typeof GameDeveloperListResponseSchema>;

/** GET /api/dev/me — whether the current session may use the settings "개발" tab at all
 * (admin OR active game developer), and whether it's specifically as a developer (upload access)
 * vs. only as an admin (review/appoint access, no upload of their own). */
export const DevMeResponseSchema = z.object({
  isGameDeveloper: z.boolean(),
  isAdmin: z.boolean(),
});
export type DevMeResponse = z.infer<typeof DevMeResponseSchema>;
