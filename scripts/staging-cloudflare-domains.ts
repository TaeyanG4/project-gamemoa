import process from "node:process";
import {
  PRODUCTION,
  STAGING,
  assertNoContractErrors,
  validateCloudflareDomainAssignments,
  type WorkerDomain,
} from "./staging-contract.js";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
if (!accountId || !apiToken) throw new Error("Cloudflare account ID and API token are required");

const hostnames = [
  new URL(STAGING.frontendUrl).hostname,
  new URL(STAGING.apiUrl).hostname,
  new URL(STAGING.gameOrigin).hostname,
  new URL(PRODUCTION.frontendUrl).hostname,
  new URL(PRODUCTION.apiUrl).hostname,
  new URL(PRODUCTION.gameOrigin).hostname,
];

const domains = (
  await Promise.all(
    hostnames.map(async (hostname): Promise<WorkerDomain[]> => {
      const endpoint = new URL(
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/workers/domains`,
      );
      endpoint.searchParams.set("hostname", hostname);
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      if (!response.ok) throw new Error(`Cloudflare Worker domain lookup failed for ${hostname}`);
      const body = (await response.json()) as {
        success?: boolean;
        result?: WorkerDomain[];
      };
      if (!body.success || !Array.isArray(body.result)) {
        throw new Error(`Cloudflare returned an invalid Worker domain response for ${hostname}`);
      }
      return body.result;
    }),
  )
).flat();

assertNoContractErrors(
  validateCloudflareDomainAssignments(domains),
  "Cloudflare custom-domain isolation preflight",
);
console.log("Cloudflare custom-domain preflight passed without modifying DNS or Worker routes.");
