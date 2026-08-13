import process from "node:process";

const API_URL = "https://api.owogg.com";
const WEB_URL = "https://owogg.com";

const FETCH_TIMEOUT_MS = 5000;
const RETRY_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 20;
const HARD_TIMEOUT_MS = 90_000;

const ROUTES_TO_CHECK = [
  "/",
  "/games",
  "/ranking",
  "/profile",
  "/admin",
  "/admin/creators",
  "/discord",
  "/discord/servers",
  "/discord/guide",
  "/discord/link",
  "/wiki",
  // Registered in the Discord Developer Portal as this app's official Terms of Service /
  // Privacy Policy URLs — if either 404s, Discord app verification silently breaks, so they
  // are deployment-blocking here rather than something we'd notice weeks later.
  "/terms",
  "/privacy",
  "/games/reaction-time",
  "/games/memory-test",
  "/games/aim-test",
  "/games/typing-test",
  "/games/reaction-time/thumbnail.svg",
  "/games/memory-test/thumbnail.svg",
  "/games/aim-test/thumbnail.svg",
  "/games/typing-test/thumbnail.svg",
  "/favicon.svg",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/favicon-192x192.png",
  "/site.webmanifest",
];

interface VerifyOptions {
  apiOnly: boolean;
  webOnly: boolean;
  expectedSha?: string;
}

function parseArgs(): VerifyOptions {
  const args = process.argv.slice(2);
  let apiOnly = false;
  let webOnly = false;
  let expectedSha = process.env.EXPECTED_SHA || "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--api-only") apiOnly = true;
    if (arg === "--web-only") webOnly = true;
    if (arg === "--sha" && i + 1 < args.length) {
      expectedSha = args[i + 1] ?? "";
      i++;
    }
  }

  return { apiOnly, webOnly, expectedSha: expectedSha.trim() };
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function verifyApi(expectedSha?: string): Promise<boolean> {
  console.log("🔍 Starting API Health & Provenance Check...");
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const url = `${API_URL}/api/health?v=${Date.now()}`;
      const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
      if (!res.ok) {
        throw new Error(`HTTP status ${res.status}`);
      }
      const data = (await res.json()) as { status?: string; commit?: string };
      console.log(
        `[API Attempt ${attempt}/${MAX_ATTEMPTS}] Status: ${data.status}, Commit: ${data.commit}`,
      );

      if (data.status === "ok") {
        if (expectedSha && data.commit !== expectedSha) {
          console.log(
            `⚠️ API commit (${data.commit}) does not match expected (${expectedSha}) yet. Retrying...`,
          );
        } else {
          console.log("✅ API Health & Provenance Verified Successfully!");
          return true;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[API Attempt ${attempt}/${MAX_ATTEMPTS}] Failed: ${message}`);
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
    }
  }

  console.error("❌ API Health & Provenance Verification Failed after maximum retries.");
  return false;
}

const CREATOR_PLATFORM_KEYS = ["YOUTUBE", "TWITCH", "CHZZK", "SOOP"] as const;
type CreatorPlatformKey = (typeof CREATOR_PLATFORM_KEYS)[number];

/**
 * Creator providers are optional integrations — OwOGG must deploy cleanly with some (or all)
 * unconfigured. `CREATOR_ENABLED_PROVIDERS` (comma-separated) is this deployment's explicit list
 * of providers operations expects to be live; only those are required to report configured=true.
 * An unconfigured provider that was never declared enabled is reported, not treated as failure.
 */
async function verifyCreatorProviders(): Promise<boolean> {
  console.log("🔍 Checking Creator provider readiness (GET /api/creators/providers)...");

  const enabledRaw = (process.env.CREATOR_ENABLED_PROVIDERS || "").trim();
  const enabled = new Set(
    enabledRaw
      .split(",")
      .map((p) => p.trim().toUpperCase())
      .filter((p): p is CreatorPlatformKey =>
        (CREATOR_PLATFORM_KEYS as readonly string[]).includes(p),
      ),
  );

  let data: Partial<Record<CreatorPlatformKey, { configured?: boolean }>>;
  try {
    const res = await fetchWithTimeout(
      `${API_URL}/api/creators/providers?v=${Date.now()}`,
      FETCH_TIMEOUT_MS,
    );
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    data = (await res.json()) as typeof data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ Failed to reach GET /api/creators/providers: ${message}`);
    return false;
  }

  let allRequiredConfigured = true;
  for (const platform of CREATOR_PLATFORM_KEYS) {
    const configured = Boolean(data[platform]?.configured);
    const isEnabled = enabled.has(platform);
    const statusLabel = configured ? "configured" : "외부 설정 대기";
    const requiredLabel = isEnabled ? " (required)" : "";
    console.log(`  · ${platform}: ${statusLabel}${requiredLabel}`);

    if (isEnabled && !configured) {
      console.error(
        `❌ ${platform} is declared in CREATOR_ENABLED_PROVIDERS but is not configured in production.`,
      );
      allRequiredConfigured = false;
    }
  }

  if (enabled.size === 0) {
    console.log(
      "ℹ️ CREATOR_ENABLED_PROVIDERS is unset — no Creator provider is required for this deployment.",
    );
  }

  if (allRequiredConfigured) {
    console.log("✅ Creator provider readiness OK.");
  }
  return allRequiredConfigured;
}

async function verifyWeb(expectedSha?: string): Promise<boolean> {
  console.log("🔍 Starting Web Version & Route Provenance Check...");
  let shaVerified = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const url = `${WEB_URL}/version.json?v=${Date.now()}`;
      const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
      if (!res.ok) {
        throw new Error(`HTTP status ${res.status}`);
      }
      const data = (await res.json()) as { commit?: string };
      console.log(`[Web Attempt ${attempt}/${MAX_ATTEMPTS}] Commit: ${data.commit}`);

      if (expectedSha && data.commit !== expectedSha) {
        console.log(
          `⚠️ Web commit (${data.commit}) does not match expected (${expectedSha}) yet. Retrying...`,
        );
      } else {
        console.log("✅ Web Version Provenance Verified!");
        shaVerified = true;
        break;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[Web Attempt ${attempt}/${MAX_ATTEMPTS}] Failed: ${message}`);
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
    }
  }

  if (!shaVerified && expectedSha) {
    console.error("❌ Web Version Provenance Verification Failed after maximum retries.");
    return false;
  }

  console.log("🔍 Checking Web Routes & Published Assets...");
  const routeResults = await Promise.allSettled(
    ROUTES_TO_CHECK.map(async (route) => {
      const routeUrl = `${WEB_URL}${route}?v=${Date.now()}`;
      const res = await fetchWithTimeout(routeUrl, FETCH_TIMEOUT_MS);
      if (!res.ok) {
        throw new Error(`Route ${route} returned HTTP ${res.status}`);
      }
      return route;
    }),
  );

  let allRoutesOk = true;
  for (let i = 0; i < ROUTES_TO_CHECK.length; i++) {
    const route = ROUTES_TO_CHECK[i];
    const result = routeResults[i];
    if (result.status === "fulfilled") {
      console.log(`  ✅ ${route} OK`);
    } else {
      console.error(`  ❌ ${route} FAILED: ${result.reason}`);
      allRoutesOk = false;
    }
  }

  if (!allRoutesOk) {
    console.error("❌ Web Route Verification Failed!");
    return false;
  }

  console.log("✅ Web Frontend & Published Assets Verified Successfully!");
  return true;
}

async function main() {
  const options = parseArgs();

  const hardTimeout = setTimeout(() => {
    console.error(
      `\n💥 HARD TIMEOUT EXCEEDED (${HARD_TIMEOUT_MS / 1000}s)! Aborting production check.`,
    );
    process.exit(1);
  }, HARD_TIMEOUT_MS);

  try {
    let success = true;
    if (options.apiOnly) {
      const apiOk = await verifyApi(options.expectedSha);
      const creatorProvidersOk = await verifyCreatorProviders();
      success = apiOk && creatorProvidersOk;
    } else if (options.webOnly) {
      success = await verifyWeb(options.expectedSha);
    } else {
      const apiOk = await verifyApi(options.expectedSha);
      const creatorProvidersOk = await verifyCreatorProviders();
      const webOk = await verifyWeb(options.expectedSha);
      success = apiOk && creatorProvidersOk && webOk;
    }

    clearTimeout(hardTimeout);
    if (!success) {
      process.exit(1);
    }
    console.log("\n🎉 All requested production verification checks passed cleanly!");
    process.exit(0);
  } catch (err) {
    clearTimeout(hardTimeout);
    console.error("❌ Unexpected error during production verification:", err);
    process.exit(1);
  }
}

void main();
