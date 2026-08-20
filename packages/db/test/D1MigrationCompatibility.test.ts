import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("pending A-3/A-4 production migrations avoid Cloudflare-incompatible TEMP table DDL", () => {
  for (const filename of [
    "0030_user_identity_write_convergence.sql",
    "0031_game_version_write_convergence.sql",
  ]) {
    const sql = fs.readFileSync(new URL(`../migrations/${filename}`, import.meta.url), "utf8");
    assert.doesNotMatch(sql, /\bCREATE\s+TEMP(?:ORARY)?\s+TABLE\b/i, filename);
  }
});
