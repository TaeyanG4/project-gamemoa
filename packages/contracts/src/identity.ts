import { z } from "zod";
import { SocialProviderSchema } from "./auth.js";

export const AccountErrorCodeSchema = z.enum([
  "ACCOUNT_ALREADY_LINKED",
  "PROVIDER_ALREADY_LINKED",
  "LAST_AUTH_PROVIDER",
  "MERGE_CHALLENGE_EXPIRED",
  "MERGE_PROVIDER_CONFLICT",
]);
export type AccountErrorCode = z.infer<typeof AccountErrorCodeSchema>;

export const ConnectedProviderSchema = z.object({
  provider: SocialProviderSchema,
  providerUserId: z.string(),
  providerEmail: z.string().nullable(),
});
export type ConnectedProvider = z.infer<typeof ConnectedProviderSchema>;

export const ConnectedProvidersResponseSchema = z.object({
  providers: z.array(ConnectedProviderSchema),
});
export type ConnectedProvidersResponse = z.infer<typeof ConnectedProvidersResponseSchema>;

export const LinkProviderResponseSchema = z.object({
  linked: z.boolean(),
  provider: SocialProviderSchema,
  alreadyLinked: z.boolean().optional(),
});
export type LinkProviderResponse = z.infer<typeof LinkProviderResponseSchema>;

export const UnlinkProviderResponseSchema = z.object({
  unlinked: z.boolean(),
  provider: SocialProviderSchema,
});
export type UnlinkProviderResponse = z.infer<typeof UnlinkProviderResponseSchema>;

export const AccountLinkConflictSchema = z.object({
  error: z.object({
    code: AccountErrorCodeSchema,
    message: z.string(),
  }),
  conflictUserId: z.number().optional(),
});
export type AccountLinkConflict = z.infer<typeof AccountLinkConflictSchema>;

export const LinkProviderRequestSchema = z.object({
  credential: z.string().min(1, "Credential is required"),
});
export type LinkProviderRequest = z.infer<typeof LinkProviderRequestSchema>;
