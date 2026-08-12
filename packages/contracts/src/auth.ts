import { z } from "zod";

export const SocialProviderSchema = z.enum(["google", "discord"]);
export type SocialProvider = z.infer<typeof SocialProviderSchema>;

export const AuthUserSchema = z.object({
  id: z.number(),
  nickname: z.string(),
  email: z.string().nullable(),
  avatar_url: z.string().nullable(),
  providers: z.array(SocialProviderSchema),
  created_at: z.string(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthMeResponseSchema = z.object({
  authenticated: z.boolean(),
  user: AuthUserSchema.optional(),
});
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;

export const GoogleLoginRequestSchema = z.object({
  credential: z.string().min(1, "Credential is required"),
});
export type GoogleLoginRequest = z.infer<typeof GoogleLoginRequestSchema>;

export const AuthProvidersResponseSchema = z.object({
  google: z.object({
    configured: z.boolean(),
    clientId: z.string().optional(),
  }),
  discord: z.object({
    configured: z.boolean(),
  }),
});
export type AuthProvidersResponse = z.infer<typeof AuthProvidersResponseSchema>;
