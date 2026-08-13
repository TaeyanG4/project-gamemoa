import { parseArgs } from "node:util";

const API_BASE = "https://api.owogg.com";
const TIMEOUT_MS = 10000;

async function checkAuthReadiness() {
  const { values } = parseArgs({
    options: {
      url: { type: "string", default: API_BASE },
      strict: { type: "boolean", default: false },
    },
  });

  const targetUrl = `${values.url}/api/auth/providers`;
  console.log(`🔍 Checking Auth Provider Readiness at ${targetUrl}...`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`❌ GET /api/auth/providers failed with status ${res.status}`);
      process.exit(1);
    }

    const data = (await res.json()) as {
      google: { configured: boolean; clientId?: string };
      discord: { configured: boolean };
    };

    console.log("----------------------------------------");
    console.log(`Google Configured : ${data.google?.configured ? "✅ TRUE" : "⚠️ FALSE"}`);
    if (data.google?.clientId) {
      console.log(`Google Client ID  : ${data.google.clientId}`);
    }
    console.log(`Discord Configured: ${data.discord?.configured ? "✅ TRUE" : "⚠️ FALSE"}`);
    console.log("----------------------------------------");

    const allConfigured = Boolean(data.google?.configured && data.discord?.configured);

    if (allConfigured) {
      console.log("🎉 All Auth Providers are configured and ready in production!");
      process.exit(0);
    } else {
      console.warn("⚠️ One or more social auth providers are not configured in production.");
      if (values.strict) {
        process.exit(1);
      }
      process.exit(0);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`❌ Auth readiness check failed:`, err);
    process.exit(1);
  }
}

void checkAuthReadiness();
