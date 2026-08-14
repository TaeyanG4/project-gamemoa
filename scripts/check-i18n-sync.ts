// Detects Korean-source drift in the already-translated wiki content.
//
// Korean (ko-KR) is always the source of truth for every dict.wikiBody string — en-US/ja-JP/
// zh-CN are translations OF it. TypeScript's `Record<SupportedLocale, Dictionary>` already
// guarantees every locale has a value for every key (a missing translation is a typecheck
// failure), but it cannot catch the far more common real-world problem: someone edits the
// Korean wording later and forgets the other three locales still say the *old* thing. That
// silent drift is exactly what this script watches for.
//
// It compares the current ko-KR text against a checked-in snapshot
// (docs/i18n-content/ko-source-snapshot.json) taken the last time all four locales were
// confirmed in sync. Any path whose Korean text differs from the snapshot is flagged as
// needing re-translation review in the other three locales.
//
// Usage:
//   pnpm i18n:sync-check          # report drift, exit 1 if any found
//   pnpm i18n:sync-check --write  # after confirming en/ja/zh are in sync, refresh the snapshot
import { writeFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { DICTIONARIES } from "../apps/web/app/features/i18n/dictionary.js";

const SNAPSHOT_PATH = resolve(import.meta.dirname, "../docs/i18n-content/ko-source-snapshot.json");

/** Flattens a nested string-leaf object into dotted-path -> value pairs. wikiBody is currently
 * all string leaves (no arrays), but this walks generically so it keeps working if that
 * changes. */
function flatten(obj: unknown, prefix: string, out: Record<string, string>): void {
  if (typeof obj === "string") {
    out[prefix] = obj;
    return;
  }
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      flatten(value, prefix ? `${prefix}.${key}` : key, out);
    }
    return;
  }
  // Arrays or other primitives: stringify as a single leaf so drift is still detected even if
  // wikiBody grows an array field (e.g. a future commands table) — not ideal for translators to
  // review, but never silently skipped.
  out[prefix] = JSON.stringify(obj);
}

function loadSnapshot(): Record<string, string> {
  if (!existsSync(SNAPSHOT_PATH)) return {};
  return JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as Record<string, string>;
}

function main() {
  const write = process.argv.includes("--write");

  const current: Record<string, string> = {};
  flatten(
    (DICTIONARIES["ko-KR"] as unknown as { wikiBody: unknown }).wikiBody,
    "wikiBody",
    current,
  );

  if (write) {
    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, JSON.stringify(current, null, 2) + "\n");
    console.log(`✅ Snapshot written (${Object.keys(current).length} keys): ${SNAPSHOT_PATH}`);
    return;
  }

  const snapshot = loadSnapshot();
  if (Object.keys(snapshot).length === 0) {
    console.log(
      "ℹ️ No snapshot found yet. Run `pnpm i18n:sync-check --write` once to establish a baseline.",
    );
    return;
  }

  const drifted: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];

  for (const [path, text] of Object.entries(current)) {
    if (!(path in snapshot)) {
      added.push(path);
    } else if (snapshot[path] !== text) {
      drifted.push(path);
    }
  }
  for (const path of Object.keys(snapshot)) {
    if (!(path in current)) removed.push(path);
  }

  if (drifted.length === 0 && added.length === 0 && removed.length === 0) {
    console.log(`✅ All ${Object.keys(current).length} wikiBody strings match the snapshot.`);
    return;
  }

  if (drifted.length > 0) {
    console.log(
      `⚠️ ${drifted.length} Korean string(s) changed since the last confirmed sync — re-check en-US/ja-JP/zh-CN for these keys:`,
    );
    for (const path of drifted) {
      console.log(`  - ${path}`);
      console.log(`      snapshot: ${snapshot[path]}`);
      console.log(`      current:  ${current[path]}`);
    }
  }
  if (added.length > 0) {
    console.log(`\n🆕 ${added.length} new key(s) not yet in the snapshot:`);
    for (const path of added) console.log(`  - ${path}`);
  }
  if (removed.length > 0) {
    console.log(`\n🗑️  ${removed.length} key(s) in the snapshot no longer exist in code:`);
    for (const path of removed) console.log(`  - ${path}`);
  }

  console.log(
    "\nAfter confirming en-US/ja-JP/zh-CN match the current Korean wording for all of the above, run `pnpm i18n:sync-check --write` to refresh the snapshot.",
  );
  process.exitCode = 1;
}

main();
