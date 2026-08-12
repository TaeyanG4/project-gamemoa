export interface GoogleUserProfile {
  sub: string;
  email: string | null;
  name: string;
  picture: string | null;
}

export async function verifyGoogleToken(
  credential: string,
  expectedClientId?: string,
): Promise<{ valid: boolean; profile?: GoogleUserProfile; reason?: string }> {
  try {
    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    );

    if (!tokenInfoRes.ok) {
      return { valid: false, reason: "Invalid Google token" };
    }

    const payload = (await tokenInfoRes.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
      aud?: string;
    };

    if (!payload.sub) {
      return { valid: false, reason: "Invalid token payload" };
    }

    if (expectedClientId && payload.aud !== expectedClientId) {
      return { valid: false, reason: "Audience mismatch" };
    }

    return {
      valid: true,
      profile: {
        sub: payload.sub,
        email: payload.email ?? null,
        name: payload.name || "Google User",
        picture: payload.picture ?? null,
      },
    };
  } catch (err) {
    return {
      valid: false,
      reason: err instanceof Error ? err.message : "Google token verification failed",
    };
  }
}
