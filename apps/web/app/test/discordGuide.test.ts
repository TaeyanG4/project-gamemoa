import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

test("Discord guide route is registered and has the public usage heading", () => {
  const routes = readFileSync(fileURLToPath(new URL("../routes.ts", import.meta.url)), "utf8");
  const guide = readFileSync(
    fileURLToPath(new URL("../routes/discordGuide.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(routes, /route\("discord\/guide", "routes\/discordGuide\.tsx"\)/);
  assert.match(guide, /Discord에서 OwOGG 사용하기/);
});
