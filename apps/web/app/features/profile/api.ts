import {
  UpdateNicknameRequestSchema,
  UpdateNicknameResponseSchema,
  UpdateCountryRequestSchema,
  UpdateCountryResponseSchema,
  type UpdateNicknameResponse,
  type UpdateCountryResponse,
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
