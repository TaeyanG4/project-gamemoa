import test from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { rateLimit } from "../src/middleware/rateLimit.js";

function appWithLimiter(limiter?: unknown) {
  const app = new Hono();
  app.post("/submit", rateLimit({ name: "test" }), (c) => c.json({ ok: true }));
  return (headers: Record<string, string> = {}) =>
    app.request("/submit", { method: "POST", headers }, { RATE_LIMITER: limiter } as never);
}

test("requests pass through when no RATE_LIMITER binding is configured", async () => {
  const request = appWithLimiter(undefined);
  const res = await request();
  assert.equal(res.status, 200, "an unconfigured environment must stay usable, not closed");
});

test("a request is rejected with 429 once the limiter reports failure", async () => {
  const request = appWithLimiter({ limit: async () => ({ success: false }) });
  const res = await request();

  assert.equal(res.status, 429);
  const body = (await res.json()) as { error: { code: string } };
  assert.equal(body.error.code, "RATE_LIMITED");
});

test("a request is allowed when the limiter reports success", async () => {
  const request = appWithLimiter({ limit: async () => ({ success: true }) });
  assert.equal((await request()).status, 200);
});

test("the limiter failing open keeps writes available during a limiter outage", async () => {
  const request = appWithLimiter({
    limit: async () => {
      throw new Error("rate limiter unavailable");
    },
  });
  const res = await request();
  assert.equal(res.status, 200, "a limiter outage must degrade capacity protection, not writes");
});

test("the key is derived from the session cookie, not the client IP, when authenticated", async () => {
  const keys: string[] = [];
  const request = appWithLimiter({
    limit: async ({ key }: { key: string }) => {
      keys.push(key);
      return { success: true };
    },
  });

  // Same account arriving from two different IPs must share one bucket, so rotating IPs does
  // not multiply an abuser's allowance.
  await request({ Cookie: "owogg_session=abcdef0123456789rest", "CF-Connecting-IP": "1.1.1.1" });
  await request({ Cookie: "owogg_session=abcdef0123456789rest", "CF-Connecting-IP": "2.2.2.2" });

  assert.equal(keys[0], keys[1], "one account must not get a fresh quota per IP");
  assert.ok(keys[0]?.startsWith("test:s:"), "authenticated callers key on the session");
});

test("the raw session token is never used in full as the rate limit key", async () => {
  const keys: string[] = [];
  const rawToken = "0123456789abcdef_SECRET_TAIL_MUST_NOT_APPEAR";
  const request = appWithLimiter({
    limit: async ({ key }: { key: string }) => {
      keys.push(key);
      return { success: true };
    },
  });

  await request({ Cookie: `owogg_session=${rawToken}` });

  assert.ok(keys[0]);
  assert.ok(
    !keys[0].includes("SECRET_TAIL_MUST_NOT_APPEAR"),
    "rate limit keys can surface in logs/metrics — the full bearer token must never be one",
  );
});

test("unauthenticated callers fall back to keying on client IP", async () => {
  const keys: string[] = [];
  const request = appWithLimiter({
    limit: async ({ key }: { key: string }) => {
      keys.push(key);
      return { success: true };
    },
  });

  await request({ "CF-Connecting-IP": "203.0.113.7" });

  assert.equal(keys[0], "test:ip:203.0.113.7");
});
