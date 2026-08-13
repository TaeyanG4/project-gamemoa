/**
 * 관리자 권한은 서버 설정의 명시적 GAMEMOA 사용자 ID만으로 판단합니다.
 * 이메일, 닉네임, OAuth provider, Creator 상태는 권한 근거로 사용하지 않습니다.
 */
export function isAdminUserId(userId: number, configuredIds?: string): boolean {
  if (!configuredIds || !Number.isSafeInteger(userId) || userId <= 0) return false;
  return configuredIds.split(",").some((value) => {
    const parsed = Number(value.trim());
    return Number.isSafeInteger(parsed) && parsed > 0 && parsed === userId;
  });
}

const DEFAULT_FRONTEND_URL = "https://gamemoa-web.gamemoa.workers.dev";

/**
 * Admin mutations require an explicit browser Origin. This is stricter than the general
 * API guard because an authenticated session cookie alone must never authorize a write.
 */
export function isTrustedAdminOrigin(origin: string | undefined, frontendUrl?: string): boolean {
  if (!origin) return false;
  const allowed = frontendUrl || DEFAULT_FRONTEND_URL;
  if (origin === allowed || origin === DEFAULT_FRONTEND_URL) return true;
  return origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
}
