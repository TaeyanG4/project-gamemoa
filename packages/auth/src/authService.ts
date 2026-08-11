export type AuthProvider = "google" | "discord";

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly image?: string;
  readonly provider: AuthProvider;
  readonly createdAt: string;
}

const STORAGE_KEY = "gamemoa_auth_session";

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (!user) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
}

export const MOCK_GOOGLE_USER: AuthUser = {
  id: "usr_google_1001",
  email: "taeyang.dev@gmail.com",
  name: "김태양 (Google)",
  image: "https://lh3.googleusercontent.com/a/ACg8ocIq=s96-c",
  provider: "google",
  createdAt: "2026-08-12",
};

export const MOCK_DISCORD_USER: AuthUser = {
  id: "usr_discord_2002",
  email: "taeyang#1234@discord.gg",
  name: "Taeyang (Discord)",
  image: "https://cdn.discordapp.com/embed/avatars/0.png",
  provider: "discord",
  createdAt: "2026-08-12",
};

export function loginWithProvider(provider: AuthProvider): AuthUser {
  const user = provider === "google" ? MOCK_GOOGLE_USER : MOCK_DISCORD_USER;
  setStoredUser(user);
  return user;
}

export function logoutUser(): void {
  setStoredUser(null);
}
