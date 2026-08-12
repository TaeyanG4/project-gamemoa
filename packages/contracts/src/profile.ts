import { z } from "zod";

export const ProfileErrorCodeSchema = z.enum([
  "INVALID_NICKNAME",
  "NICKNAME_COOLDOWN_ACTIVE",
  "INVALID_COUNTRY",
  "COUNTRY_COOLDOWN_ACTIVE",
  "USER_NOT_FOUND",
]);
export type ProfileErrorCode = z.infer<typeof ProfileErrorCodeSchema>;

export const UpdateNicknameRequestSchema = z.object({
  nickname: z.string().min(1, "닉네임을 입력해주세요."),
});
export type UpdateNicknameRequest = z.infer<typeof UpdateNicknameRequestSchema>;

export const UpdateNicknameResponseSchema = z.object({
  success: z.literal(true),
  nickname: z.string(),
  nicknameUpdatedAt: z.string(),
});
export type UpdateNicknameResponse = z.infer<typeof UpdateNicknameResponseSchema>;

// null = unset ("국가/지역" not provided). Server accepts "UNSET"/"" as the same intent.
export const UpdateCountryRequestSchema = z.object({
  country: z.string().nullable(),
});
export type UpdateCountryRequest = z.infer<typeof UpdateCountryRequestSchema>;

export const UpdateCountryResponseSchema = z.object({
  success: z.literal(true),
  country: z.string().nullable(),
  countryUpdatedAt: z.string(),
});
export type UpdateCountryResponse = z.infer<typeof UpdateCountryResponseSchema>;
