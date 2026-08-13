import process from "node:process";

const API_URL = "https://gamemoa-api.gamemoa.workers.dev";
const WEB_URL = "https://gamemoa-web.gamemoa.workers.dev";

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
      success = await verifyApi(options.expectedSha);
    } else if (options.webOnly) {
      success = await verifyWeb(options.expectedSha);
    } else {
      const apiOk = await verifyApi(options.expectedSha);
      const webOk = await verifyWeb(options.expectedSha);
      success = apiOk && webOk;
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
