import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("the root package exposes no deploy-time official bootstrap command", () => {
  const manifest = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
    scripts?: Record<string, string>;
  };
  assert.equal(manifest.scripts?.["bootstrap:official-games"], undefined);
});
