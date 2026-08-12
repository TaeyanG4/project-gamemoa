import {
  AuthMeResponseSchema,
  type AuthMeResponse,
  type AuthUser,
  type SocialProvider,
} from "@gamemoa/contracts";
import { API_URL, apiFetch } from "../../lib/api";

export type { AuthUser, AuthMeResponse, SocialProvider };
export type AuthProviderName = SocialProvider;

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const data: AuthMeResponse = await apiFetch("/api/auth/me", AuthMeResponseSchema);
    if (data.authenticated && data.user) {
      return data.user;
    }
    return null;
  } catch {
    return null;
  }
}

export async function loginGoogle(credential: string): Promise<AuthUser> {
  const data: AuthMeResponse = await apiFetch("/api/auth/google", AuthMeResponseSchema, {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
  if (data.authenticated && data.user) {
    return data.user;
  }
  throw new Error("Google 로그인에 실패했습니다.");
}

export function getDiscordLoginUrl(): string {
  return `${API_URL}/api/auth/discord`;
}

export async function logoutFromServer(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignore network errors on logout
  }
}
