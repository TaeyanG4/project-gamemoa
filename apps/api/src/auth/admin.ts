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
