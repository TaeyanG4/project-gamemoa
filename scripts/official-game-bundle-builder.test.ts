import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("deploy workflows do not rebuild official bundles from the repository", () => {
  const workflows = [
    fs.readFileSync(".github/workflows/deploy.yml", "utf8"),
    fs.readFileSync(".github/workflows/deploy-staging.yml", "utf8"),
  ].join("\n");
  assert.doesNotMatch(workflows, /bootstrap:official-games|official-game-bundle-builder/);
});
