export interface AdminStepUpChallenge {
  id: number;
  userId: number;
  googleSub: string;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
}

export interface AdminSessionRecord {
  id: number;
  userId: number;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

/**
 * Persistence port for the admin step-up authentication layer. Every raw opaque token this
 * repository issues (challenge tokens, admin session tokens) is stored as a SHA-256 hash only —
 * callers never persist a raw token. Every challenge/session is additionally bound to the raw
 * underlying `gamemoa_session` token (also stored hashed) so that an expired/rotated/revoked
 * normal session immediately invalidates the elevated admin layer bound to it.
 */
export interface AdminAuthRepository {
  /** Creates a new single-use step-up challenge and returns the raw (unhashed) token to set as a cookie. */
  createStepUpChallenge(input: {
    userId: number;
    googleSub: string;
    rawSessionToken: string;
    nowIso: string;
    expiresAtIso: string;
  }): Promise<{ rawToken: string }>;

  /**
   * Atomically consumes a step-up challenge: it must exist, be unexpired, unconsumed, and bound
   * to the same underlying session token as the caller's current session. Returns the bound
   * userId/googleSub on success, or null if any of those checks fail (never reveals which).
   */
  consumeStepUpChallenge(input: {
    rawToken: string;
    rawSessionToken: string;
    nowIso: string;
  }): Promise<{ userId: number; googleSub: string } | null>;

  createAdminSession(input: {
    userId: number;
    rawSessionToken: string;
    nowIso: string;
    expiresAtIso: string;
  }): Promise<{ rawToken: string; session: AdminSessionRecord }>;

  /** Validates an admin session token: must exist, be unexpired, unrevoked, and still bound to
   * the caller's current underlying session token. */
  findValidAdminSession(input: {
    rawToken: string;
    rawSessionToken: string;
    nowIso: string;
  }): Promise<AdminSessionRecord | null>;

  revokeAdminSession(rawToken: string): Promise<void>;

  /** Revokes every admin session bound to a given underlying session token — used when the
   * normal GAMEMOA session itself is logged out, so no admin session can outlive it. */
  revokeAdminSessionsForSessionToken(rawSessionToken: string): Promise<void>;

  /** Revokes every admin session for a given GAMEMOA user — used by managed admin account
   * password change/reset/disable so no stale elevated session survives those actions. */
  revokeAllAdminSessionsForUserId(userId: number): Promise<void>;

  recordLoginAttempt(input: { userId: number; success: boolean; nowIso: string }): Promise<void>;

  /** Epoch-ms timestamps (oldest first) of failed attempts still inside the rate-limit period. */
  listRecentFailedAttempts(userId: number, sinceIso: string): Promise<number[]>;

  /** Bounded, opportunistic cleanup of expired challenges/sessions/old login-attempt rows. */
  cleanupExpired(nowIso: string): Promise<void>;
}
