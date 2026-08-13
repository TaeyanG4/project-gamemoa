import {
  PersonalizationStateSchema,
  MutationResultSchema,
  type PersonalizationState,
} from "@owogg/contracts";
import { apiFetch } from "../../lib/api";

export async function fetchPersonalizationStateApi(): Promise<PersonalizationState> {
  return apiFetch("/api/personalization", PersonalizationStateSchema);
}

export async function addFavoriteApi(gameId: string): Promise<void> {
  await apiFetch(`/api/personalization/favorites/${gameId}`, MutationResultSchema, {
    method: "POST",
  });
}

export async function removeFavoriteApi(gameId: string): Promise<void> {
  await apiFetch(`/api/personalization/favorites/${gameId}`, MutationResultSchema, {
    method: "DELETE",
  });
}

export async function recordRecentPlayApi(gameId: string): Promise<void> {
  await apiFetch(`/api/personalization/recent/${gameId}`, MutationResultSchema, {
    method: "POST",
  });
}

export async function importGuestPersonalizationApi(payload: {
  guestRecentPlays: { gameId: string; lastPlayedAt: string }[];
}): Promise<PersonalizationState> {
  return apiFetch("/api/personalization/import", PersonalizationStateSchema, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
