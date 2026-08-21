/**
 * `pnpm architecture:check` — walks the repo and applies the layer-boundary rules defined in
 * scripts/architecture-rules.ts. This half is IO and reporting only; the matching logic lives
 * next door so it can be tested directly (scripts/architecture-rules.test.ts).
 */

import fs from "node:fs";
import path from "node:path";
import {
  IMPORT_RULES,
  PACKAGE_JSON_RULES,
  REQUIRED_TOKEN_RULES,
  TOKEN_RULES,
  checkFileAgainstRule,
  type Violation,
} from "./architecture-rules.js";

const rootDir = process.cwd();
const violations: Violation[] = [];

const SKIPPED_DIRS = new Set(["node_modules", "dist", "build", ".react-router", ".turbo"]);
const SOURCE_EXTENSIONS = [".ts", ".tsx"];

function toPosix(absolutePath: string): string {
  return path.relative(rootDir, absolutePath).split(path.sep).join("/");
}

/** Every source file under `dirPath`, recursively, excluding build output and dependencies. */
function* sourceFiles(dirPath: string, extensions: string[]): Generator<string> {
  if (!fs.existsSync(dirPath)) return;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (SKIPPED_DIRS.has(entry.name)) continue;
      yield* sourceFiles(fullPath, extensions);
    } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      yield fullPath;
    }
  }
}

function checkImportRules(): void {
  for (const rule of IMPORT_RULES) {
    const scopeDir = path.join(rootDir, ...rule.scope.split("/"));
    for (const filePath of sourceFiles(scopeDir, SOURCE_EXTENSIONS)) {
      const relativePath = toPosix(filePath);
      const sourceText = fs.readFileSync(filePath, "utf-8");
      violations.push(...checkFileAgainstRule(relativePath, sourceText, rule));
    }
  }
}

function checkPackageJsonRules(): void {
  for (const rule of PACKAGE_JSON_RULES) {
    const manifestPath = path.join(rootDir, ...rule.manifest.split("/"));
    if (!fs.existsSync(manifestPath)) continue;

    const pkg = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

    for (const forbidden of rule.forbidden) {
      if (allDeps[forbidden]) {
        violations.push({ file: rule.manifest, rule: rule.rule, specifier: forbidden });
      }
    }
  }
}

function checkTokenRules(): void {
  for (const rule of TOKEN_RULES) {
    const scopeDir = path.join(rootDir, ...rule.scope.split("/"));
    const filePaths = rule.files
      ? rule.files.map((file) => path.join(scopeDir, file))
      : sourceFiles(scopeDir, rule.extensions);
    for (const filePath of filePaths) {
      const sourceText = fs.readFileSync(filePath, "utf-8");
      for (const token of rule.tokens) {
        if (sourceText.includes(token)) {
          violations.push({ file: toPosix(filePath), rule: rule.rule, specifier: token });
        }
      }
    }
  }
}

function checkRequiredTokenRules(): void {
  for (const rule of REQUIRED_TOKEN_RULES) {
    const filePath = path.join(rootDir, ...rule.file.split("/"));
    const sourceText = fs.readFileSync(filePath, "utf-8");
    for (const token of rule.tokens) {
      if (!sourceText.includes(token)) {
        violations.push({ file: rule.file, rule: rule.rule, specifier: `missing ${token}` });
      }
    }
  }
}

console.log("🔍 Checking Architecture Layer Boundaries...");

checkImportRules();
checkPackageJsonRules();
checkTokenRules();
checkRequiredTokenRules();

if (violations.length > 0) {
  console.error(`\n❌ ${violations.length} Architecture Layer Boundary Violation(s) Found:\n`);
  for (const violation of violations) {
    console.error(`  ${violation.file}`);
    console.error(`    depends on "${violation.specifier}"`);
    console.error(`    ✗ ${violation.rule}`);
    if (violation.hint) console.error(`    → ${violation.hint}`);
    console.error("");
  }
  process.exit(1);
} else {
  const scannedRules =
    IMPORT_RULES.length +
    PACKAGE_JSON_RULES.length +
    TOKEN_RULES.length +
    REQUIRED_TOKEN_RULES.length;
  console.log(`✅ Architecture Layer Boundaries Verified — ${scannedRules} rules, 0 violations.\n`);
}
