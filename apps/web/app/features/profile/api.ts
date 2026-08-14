import {
  UpdateNicknameRequestSchema,
  UpdateNicknameResponseSchema,
  UpdateCountryRequestSchema,
  UpdateCountryResponseSchema,
  PublicProfileResponseSchema,
  type UpdateNicknameResponse,
  type UpdateCountryResponse,
  type PublicProfileResponse,
} from "@owogg/contracts";
import { apiFetch } from "../../lib/api";

export async function updateNicknameApi(nickname: string): Promise<UpdateNicknameResponse> {
  const body = UpdateNicknameRequestSchema.parse({ nickname });
  return await apiFetch("/api/profile/nickname", UpdateNicknameResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** `country: null` means "설정 안 함(unset)". */
export async function updateCountryApi(country: string | null): Promise<UpdateCountryResponse> {
  const body = UpdateCountryRequestSchema.parse({ country });
  return await apiFetch("/api/profile/country", UpdateCountryResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Public profile page data (no auth). Throws ApiClientError with status 404 if unknown userId. */
export async function fetchPublicProfileApi(
  userId: number | string,
): Promise<PublicProfileResponse> {
  return await apiFetch(
    `/api/profile/public/${encodeURIComponent(String(userId))}`,
    PublicProfileResponseSchema,
  );
}
