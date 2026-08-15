import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import type { ApiEnv } from "../routes/auth.js";

/**
 * Cloudflare Workers native rate limiting for write endpoints.
 *
 * Why: D1 serializes queries, and a single score submission costs ~10-15 of them
 * (see docs/DATABASE.md §4). A script submitting in a tight loop therefore consumes far more of
 * the database's fixed throughput than its request count suggests, degrading the site for
 * everyone — this is a capacity-protection control first and an anti-cheat measure second.
 * (Score *validity* is enforced separately and authoritatively by scoreValidation.ts.)
 *
 * The binding is OPTIONAL by design: when `RATE_LIMITER` is not bound, this middleware
 * no-ops and requests pass through. That mirrors how creator OAuth providers degrade when
 * unconfigured, and means adding the binding to wrangler.jsonc can never hard-fail a deploy on
 * an account/plan where the namespace has not been provisioned. The tradeoff is explicit: an
 * unconfigured environment is UNPROTECTED rather than closed — acceptable because the failure
 * mode of the alternative (rejecting all writes when a binding is missing) is a total outage.
 */

/** The shape Cloudflare's rate limit binding exposes. Not in @cloudflare/workers-types yet. */
export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * Rate limits per authenticated session, falling back to client IP for unauthenticated callers.
 *
 * Keying on the session cookie rather than IP alone matters in both directions: it stops one
 * account from flooding regardless of how many IPs it rotates through, and it avoids collectively
 * throttling everyone behind a shared NAT/campus/mobile-carrier egress IP — which keying on IP
 * alone would do.
 */
export function rateLimit(options: { name: string }): MiddlewareHandler<ApiEnv> {
  const { name } = options;

  return async (c, next) => {
    const limiter = (c.env as unknown as { RATE_LIMITER?: RateLimitBinding })?.RATE_LIMITER;
    if (!limiter) {
      await next();
      return;
    }

    const session = getCookie(c, "owogg_session");
    // The raw session token is never used as the key material itself — it is a bearer credential,
    // and rate limit keys can surface in logs/metrics. A coarse prefix is enough to distinguish
    // callers without carrying anything replayable.
    const identity = session
      ? `s:${session.slice(0, 16)}`
      : `ip:${c.req.header("CF-Connecting-IP") ?? "unknown"}`;

    let allowed = true;
    try {
      const result = await limiter.limit({ key: `${name}:${identity}` });
      allowed = result.success;
    } catch {
      // Fail open. A rate limiter outage must not take write traffic down with it — the
      // underlying capacity risk is a degradation, whereas closing here is an immediate outage.
      allowed = true;
    }

    if (!allowed) {
      return c.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.",
          },
        },
        429,
      );
    }

    await next();
  };
}
