import {
  AuthMeResponseSchema,
  AuthProvidersResponseSchema,
  ConnectedProvidersResponseSchema,
  LinkProviderResponseSchema,
  UnlinkProviderResponseSchema,
  type AuthMeResponse,
  type AuthUser,
  type ConnectedProvidersResponse,
  type LinkProviderResponse,
  type SocialProvider,
  type UnlinkProviderResponse,
} from "@gamemoa/contracts";
import { API_URL, apiFetch } from "../../lib/api";

export type { AuthUser, AuthMeResponse, SocialProvider };
export type AuthProviderName = SocialProvider;

export interface ProviderStatus {
  google: {
    configured: boolean;
    clientId?: string;
  };
  discord: {
    configured: boolean;
  };
}

export async function fetchProviderStatus(): Promise<ProviderStatus> {
  try {
    const data = await apiFetch("/api/auth/providers", AuthProvidersResponseSchema);
    return {
      google: {
        configured: data.google.configured,
        ...(data.google.clientId !== undefined ? { clientId: data.google.clientId } : {}),
      },
      discord: {
        configured: data.discord.configured,
      },
    };
  } catch {
    return { google: { configured: false }, discord: { configured: false } };
  }
}

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

// ---------------------------------------------------------------------------
// Account identity: connected providers, linking and unlinking
// ---------------------------------------------------------------------------

export async function fetchConnectedProviders(): Promise<ConnectedProvidersResponse> {
  return apiFetch("/api/auth/accounts", ConnectedProvidersResponseSchema);
}

export async function linkGoogleProvider(credential: string): Promise<LinkProviderResponse> {
  return apiFetch("/api/auth/link/google", LinkProviderResponseSchema, {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
}

export function getDiscordLinkUrl(): string {
  return `${API_URL}/api/auth/link/discord`;
}

export async function unlinkProvider(provider: SocialProvider): Promise<UnlinkProviderResponse> {
  return apiFetch(`/api/auth/link/${provider}`, UnlinkProviderResponseSchema, {
    method: "DELETE",
  });
}
