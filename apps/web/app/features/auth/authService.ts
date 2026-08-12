function getApiUrl(): string {
  if (typeof window !== "undefined") {
    const envUrl = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL;
    if (envUrl) return envUrl;
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:8787";
    }
  }
  return "https://gamemoa-api.gamemoa.workers.dev";
}

const API_URL = getApiUrl();

export type SocialProvider = "google" | "discord";
export type AuthProviderName = SocialProvider;

export interface AuthUser {
  readonly id: number;
  readonly nickname: string;
  readonly email: string | null;
  readonly avatar_url: string | null;
  readonly providers: SocialProvider[];
  readonly created_at: string;
}

export interface AuthMeResponse {
  authenticated: boolean;
  user?: AuthUser;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data: AuthMeResponse = await res.json();
    if (data.authenticated && data.user) {
      return data.user;
    }
    return null;
  } catch {
    return null;
  }
}

export async function loginGoogle(credential: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/api/auth/google`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail ?? "Google 로그인에 실패했습니다.");
  }
  const data = await res.json();
  return data.user as AuthUser;
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
