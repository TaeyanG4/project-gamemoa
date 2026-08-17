#!/usr/bin/env node
// Runs the *real* production bundle-validation path (packages/core/src/domain/sandboxGameBundle.ts)
// against the actual generated ball-dodge.zip — not a re-implementation of the checks, the same
// functions the API route calls. Confirms the fixture will actually pass upload before anyone
// tries it against a running server. See docs/GAME_CREATION_GUIDE.md §3.2/§3.4.
//
// Usage: node apps/api/test/fixtures/verify-ball-dodge-zip.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";
import {
  validateBundleEntryMetadata,
  prepareBundleEntries,
  normalizeBundleEntryPath,
} from "../../../../packages/core/src/domain/sandboxGameBundle.ts";
import { SANDBOX_GAME_POLICY } from "../../../../packages/core/src/domain/sandboxGames.ts";

const here = dirname(fileURLToPath(import.meta.url));
const zipPath = join(here, "ball-dodge.zip");
const zipBytes = readFileSync(zipPath);

console.log(`Zip file: ${zipPath}`);
console.log(`Zip size: ${zipBytes.length} bytes (cap: ${SANDBOX_GAME_POLICY.MAX_BUNDLE_BYTES})`);
if (zipBytes.length > SANDBOX_GAME_POLICY.MAX_BUNDLE_BYTES) {
  throw new Error("FAIL: zip exceeds MAX_BUNDLE_BYTES");
}

// Metadata-only pass (mirrors FflateBundleArchiveReader.readMetadata): read every entry's
// declared/compressed size via the filter callback WITHOUT decompressing.
const metadata = [];
unzipSync(zipBytes, {
  filter(file) {
    metadata.push({ path: file.name, declaredSize: file.originalSize, compressedSize: file.size });
    return false; // never decompress in this pass
  },
});

console.log(`Entries (metadata pass): ${metadata.length}`);
for (const m of metadata) {
  console.log(`  ${m.path}  declared=${m.declaredSize}B  compressed=${m.compressedSize}B`);
}

validateBundleEntryMetadata(metadata);
console.log("PASS: validateBundleEntryMetadata (size cap, file count, compression ratio, paths)");

// Full decompression pass + the real prepare step (path unwrap, MIME resolution, entry-file check).
const decompressed = unzipSync(zipBytes);
const prepared = prepareBundleEntries(decompressed);
console.log(
  `PASS: prepareBundleEntries — entry=${prepared.entry}, totalSize=${prepared.totalSize}B`,
);
for (const f of prepared.files) {
  console.log(
    `  -> ${f.path} (${f.contentType}${f.contentEncoding ? `, ${f.contentEncoding}` : ""})`,
  );
}

// Forbidden-API static scan — this isn't part of the production validator (OwOGG doesn't execute
// or statically analyze game code), but it's a useful independent check that the fixture itself
// actually honors the constraints the spec called out (no localStorage/fetch/WebSocket/etc.).
// Comments are stripped first — the source's own header comments *name* these APIs to explain
// they're deliberately absent, which would otherwise false-positive a plain substring scan.
function stripComments(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
    .replace(/(^|[^:])\/\/.*$/gm, "$1"); // line comments (naive but fine for this fixture: no URLs)
}
function stripHtmlComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

const forbiddenPatterns = [
  [/\blocalStorage\s*[.[]/, "localStorage"],
  [/\bindexedDB\s*[.[]/, "indexedDB"],
  [/\bfetch\s*\(/, "fetch("],
  [/\bXMLHttpRequest\b/, "XMLHttpRequest"],
  [/\bnew\s+WebSocket\s*\(/, "new WebSocket("],
  [/\bnavigator\.serviceWorker\b/, "navigator.serviceWorker"],
  [/\bnew\s+Worker\s*\(/, "new Worker("],
  [/\bpostMessage\s*\(/, "postMessage("],
];
const sourceText = [
  stripHtmlComments(new TextDecoder().decode(decompressed["index.html"])),
  stripComments(new TextDecoder().decode(decompressed["game.js"])),
  new TextDecoder().decode(decompressed["style.css"]),
].join("\n");
const hits = forbiddenPatterns.filter(([re]) => re.test(sourceText)).map(([, label]) => label);
if (hits.length > 0) {
  throw new Error(`FAIL: forbidden API(s) found in source: ${hits.join(", ")}`);
}
console.log(
  "PASS: no forbidden APIs (localStorage/fetch/WebSocket/ServiceWorker/Worker/postMessage) in source",
);

// Path normalization sanity — every entry survives normalizeBundleEntryPath unchanged (no zip-slip,
// no absolute paths, no traversal) — already implied by validateBundleEntryMetadata not throwing,
// asserted again here explicitly for a clear PASS line.
for (const m of metadata) {
  if (normalizeBundleEntryPath(m.path) === null) {
    throw new Error(`FAIL: path rejected by normalizeBundleEntryPath: ${m.path}`);
  }
}
console.log("PASS: all entry paths normalize cleanly (no traversal/absolute/backslash tricks)");

console.log("\nAll checks passed — ball-dodge.zip is a valid sandbox game bundle.");
