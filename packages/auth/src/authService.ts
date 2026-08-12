const API_URL = typeof window !== "undefined"
  ? ((import.meta as any).env?.VITE_API_URL ?? "http://localhost:8787")
  : "http://localhost:8787";


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

/**
 * Fetch the currently logged-in user from the backend session cookie.
 * Returns null if not authenticated.
 */
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

/**
 * Send the Google ID token (credential) to the backend for verification.
 * The backend verifies the token, creates/finds the user, and sets
 * an HttpOnly session cookie.
 */
export async function loginGoogle(credential: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/api/auth/google`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail ?? "Google 로그인에 실패했습니다.");
  }
  const data = await res.json();
  return data.user as AuthUser;
}

/**
 * Returns the backend URL that initiates the Discord OAuth flow.
 * The backend will redirect to Discord, then back to the callback,
 * then finally redirect to the frontend.
 */
export function getDiscordLoginUrl(): string {
  return `${API_URL}/api/auth/discord`;
}

/**
 * Log out the current user by calling the backend logout endpoint.
 * This deletes the session on the server and clears the cookie.
 */
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
