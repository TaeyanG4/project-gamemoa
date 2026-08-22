import fs from "node:fs";
import process from "node:process";
import { materializeStagingWranglerConfig, verifyStagingD1Target } from "./staging-contract.js";

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const listPath = argument("--d1-list");
const outputPath = argument("--write-config");
const expectedId = process.env.STAGING_D1_DATABASE_ID?.trim() ?? "";
const d1List = JSON.parse(fs.readFileSync(listPath, "utf8")) as unknown;

verifyStagingD1Target(d1List, expectedId);

const sourcePath = "apps/api/wrangler.jsonc";
const source = fs.readFileSync(sourcePath, "utf8");
const materialized = materializeStagingWranglerConfig(source, expectedId);
fs.writeFileSync(outputPath, materialized, { encoding: "utf8", flag: "wx" });

console.log(
  "Verified remote owogg-d1-staging name/UUID and materialized the CI-only Wrangler config.",
);
