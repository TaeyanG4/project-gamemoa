import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import {
  latestMigrationFilename,
  validateDocumentationIndex,
  validateMigrationMetadata,
  validateRelativeMarkdownLinks,
} from "./check-docs.js";

const temporaryDirectories: string[] = [];

function createRepository(): string {
  const root = mkdtempSync(path.join(tmpdir(), "owogg-docs-check-"));
  temporaryDirectories.push(root);
  return root;
}

function write(root: string, relativePath: string, contents: string): void {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents, "utf8");
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("relative Markdown links must resolve", () => {
  const root = createRepository();
  write(root, "docs/README.md", "[exists](ARCHITECTURE.md)\n[missing](MISSING.md)\n");
  write(root, "docs/ARCHITECTURE.md", "# Architecture\n");

  assert.deepEqual(validateRelativeMarkdownLinks(root), [
    {
      code: "BROKEN_LINK",
      file: "docs/README.md",
      message: "Relative link does not resolve: MISSING.md",
    },
  ]);
});

test("the documentation index must link existing required documents", () => {
  const root = createRepository();
  write(root, "docs/README.md", "[Architecture](ARCHITECTURE.md)\n");
  write(root, "docs/ARCHITECTURE.md", "# Architecture\n");

  assert.deepEqual(validateDocumentationIndex(root, ["docs/ARCHITECTURE.md", "docs/DATABASE.md"]), [
    {
      code: "MISSING_INDEXED_DOCUMENT",
      file: "docs/README.md",
      message: "Indexed document does not exist: docs/DATABASE.md",
    },
    {
      code: "MISSING_INDEX_ENTRY",
      file: "docs/README.md",
      message: "Required document is not linked from the index: docs/DATABASE.md",
    },
  ]);
});

test("database metadata follows the latest migration filename", () => {
  const root = createRepository();
  write(root, "packages/db/migrations/0001_first.sql", "-- first\n");
  write(root, "packages/db/migrations/0010_latest.sql", "-- latest\n");
  write(root, "docs/DATABASE.md", "Latest migration: `0001_first.sql`\n");

  assert.equal(
    latestMigrationFilename(path.join(root, "packages/db/migrations")),
    "0010_latest.sql",
  );
  assert.deepEqual(validateMigrationMetadata(root), [
    {
      code: "MIGRATION_METADATA_MISMATCH",
      file: "docs/DATABASE.md",
      message: "Latest migration metadata is 0001_first.sql; expected 0010_latest.sql",
    },
  ]);
});
