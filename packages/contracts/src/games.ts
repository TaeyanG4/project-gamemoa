import { z } from "zod";

const ScoreConfigSchema = z.object({
  unit: z.string(),
  direction: z.enum(["asc", "desc"]),
  min: z.number(),
  max: z.number(),
  displayPrefix: z.string().optional(),
  displaySuffix: z.string().optional(),
});

const DifficultyConfigSchema = z.object({
  levels: z.array(z.object({ id: z.string(), label: z.string() })),
  defaultLevelId: z.string(),
});

const GamePolicySchema = z.object({
  score: ScoreConfigSchema.nullable(),
  leaderboard: z.boolean(),
  xpPerCompletion: z.number().int().nonnegative(),
  requiresAuth: z.boolean(),
});

const GamePresentationSchema = z.object({
  viewport: z.discriminatedUnion("mode", [
    z.object({
      mode: z.literal("responsive"),
      preferredWidth: z.number().positive().optional(),
      preferredHeight: z.number().positive().optional(),
      minWidth: z.number().positive().optional(),
      minHeight: z.number().positive().optional(),
      maxWidth: z.number().positive().optional(),
      maxHeight: z.number().positive().optional(),
    }),
    z.object({
      mode: z.literal("fixed"),
      preferredWidth: z.number().positive(),
      preferredHeight: z.number().positive(),
      minWidth: z.number().positive().optional(),
      minHeight: z.number().positive().optional(),
      maxWidth: z.number().positive().optional(),
      maxHeight: z.number().positive().optional(),
    }),
  ]),
  fullscreen: z.object({
    supported: z.boolean(),
    recommended: z.boolean().optional(),
  }),
  mobile: z.object({
    support: z.enum(["supported", "experimental", "unsupported"]),
    orientation: z.enum(["any", "portrait", "landscape"]).optional(),
  }),
});

const TaxonomyCatalogSchema = z.object({
  type: z.literal("TAXONOMY"),
  categories: z.array(z.string()),
  tags: z.array(z.string()),
  modes: z.array(z.enum(["single", "local-multi", "online-multi"])),
  inputMethods: z.array(z.enum(["mouse", "keyboard", "touch"])),
  minPlayers: z.number().int().positive(),
  maxPlayers: z.number().int().positive(),
  thumbnail: z.string(),
  accent: z.string().optional(),
  estimatedRoundSeconds: z.number().positive().optional(),
});

const GenreModeCatalogSchema = z.object({
  type: z.literal("GENRE_MODE"),
  genre: z.string(),
  mode: z.enum(["single", "multi"]),
});

const PublicGameSchemaBase = {
  slug: z.string(),
  title: z.string(),
  shortDescription: z.string(),
  description: z.string(),
  catalog: z.union([TaxonomyCatalogSchema, GenreModeCatalogSchema]),
  policy: GamePolicySchema,
  presentation: GamePresentationSchema.optional(),
  difficulty: DifficultyConfigSchema.optional(),
  supportsReplay: z.boolean(),
  mediaUrl: z.union([z.string().url(), z.string().startsWith("/")]).nullable(),
};

/** Provider authority is an explicit wire discriminant. No publisher user id or review fields
 * are part of either branch; the canonical catalog shape remains the only metadata union. */
export const PublicGameSchema = z.discriminatedUnion("publisherType", [
  z.object({ ...PublicGameSchemaBase, publisherType: z.literal("OWOGG") }),
  z.object({ ...PublicGameSchemaBase, publisherType: z.literal("USER") }),
]);
export type PublicGame = z.infer<typeof PublicGameSchema>;

export const PublicGameListResponseSchema = z.object({
  games: z.array(PublicGameSchema),
});
export type PublicGameListResponse = z.infer<typeof PublicGameListResponseSchema>;

/** POST /api/games/:slug/session — short-lived parent-side Game Session token. */
export const GameSessionResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
});
export type GameSessionResponse = z.infer<typeof GameSessionResponseSchema>;

export const GameScoreAcceptRequestSchema = z.object({
  token: z.string(),
  score: z.number(),
  difficulty: z.string().optional(),
  playToken: z.string().optional(),
});
export type GameScoreAcceptRequest = z.infer<typeof GameScoreAcceptRequestSchema>;

export const GameScoreAcceptResponseSchema = z.object({
  success: z.literal(true),
  score_id: z.number().int().positive().optional(),
  game_id: z.string().optional(),
  score: z.number().optional(),
  nickname: z.string().optional(),
  xpAwarded: z.number().int().min(0).optional(),
  guildXpAwarded: z.number().int().min(0).optional(),
  guildId: z.string().optional(),
  newlyUnlockedAchievements: z.array(z.string()).optional(),
});
export type GameScoreAcceptResponse = z.infer<typeof GameScoreAcceptResponseSchema>;

/** Transitional endpoint aliases retained for the C-2 client adapter; the wire shape is generic. */
export const CreatorScoreAcceptRequestSchema = GameScoreAcceptRequestSchema;
export type CreatorScoreAcceptRequest = GameScoreAcceptRequest;
export const CreatorScoreAcceptResponseSchema = GameScoreAcceptResponseSchema;
export type CreatorScoreAcceptResponse = GameScoreAcceptResponse;
