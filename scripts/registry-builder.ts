import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import prettier from "prettier";
import type { GameManifest } from "../packages/game-sdk/src/contracts/manifest.js";
import type { SystemGameDefinition } from "../packages/core/src/modules/game/domain/gameDefinition.js";
import { parseGameDefinition } from "./game-registry-schema.js";

/** This module only ever builds/holds SYSTEM definitions (`game-registry/` describes SYSTEM games
 * exclusively — see loadGameDefinitions' own doc comment) — `GameDefinition` in every signature
 * below is deliberately the narrower `SystemGameDefinition`, not the full SYSTEM|CREATOR union. */
type GameDefinition = SystemGameDefinition;

export interface GameEntry {
  dirName: string;
  packageName: string;
  manifest: GameManifest;
}

export interface RegistryBuildResult {
  coreRegistryCode: string;
  webLoaderCode: string;
  /** `GAME_DEFINITIONS`, built from game-registry/. Generated and checked in as official generic
   * bootstrap/source metadata — see loadGameDefinitions. */
  gameDefinitionsCode: string;
  gameEntries: GameEntry[];
  definitions: GameDefinition[];
}

/**
 * Reads `game-registry/games/<slug>/{info,policy}.json` into validated GameDefinitions.
 *
 * This directory is the build/source description of SYSTEM-owned games. Production runtime
 * authority is generic D1/B2; `GAME_DEFINITIONS` feeds official bootstrap and `GAME_MANIFESTS`
 * (built from `games/*​/src/manifest.ts`, below) feeds source tooling. Both are generated here so
 * that
 * assertDefinitionsMatchManifests can hold them to agreement on every build; that agreement is
 * what makes switching the remaining consumers over later a small change instead of a leap of
 * faith.
 *
 * Creator-owned games are deliberately absent: where their canonical description will live is an
 * open decision, and nothing here presumes an answer.
 */
export function loadGameDefinitions(rootDir = process.cwd()): GameDefinition[] {
  const registryDir = path.join(rootDir, "game-registry", "games");
  if (!fs.existsSync(registryDir)) {
    throw new Error("❌ game-registry/games directory not found");
  }

  const slugs = fs
    .readdirSync(registryDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name);

  const definitions = slugs.map((slug) => {
    const infoFile = `game-registry/games/${slug}/info.json`;
    const policyFile = `game-registry/games/${slug}/policy.json`;

    return parseGameDefinition({
      slug,
      infoFile,
      policyFile,
      info: readJsonFile(path.join(registryDir, slug, "info.json"), infoFile),
      policy: readJsonFile(path.join(registryDir, slug, "policy.json"), policyFile),
      // Never read from the data: this directory holds SYSTEM games by definition, and a file
      // declaring its own owner is exactly what a creator-supplied one must not be able to do.
      owner: { type: "SYSTEM" },
    });
  });

  assertUniqueSlugs(definitions);

  // Deterministic order, matching how gameEntries below is sorted — a generated file whose
  // contents depend on filesystem enumeration order would churn between machines.
  return definitions.sort((a, b) => a.slug.localeCompare(b.slug));
}

function readJsonFile(absolutePath: string, displayPath: string): unknown {
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`❌ Missing ${displayPath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf-8"));
  } catch (err) {
    throw new Error(`❌ ${displayPath} is not valid JSON: ${(err as Error).message}`);
  }
}

/**
 * Global slug uniqueness — the guarantee that does not exist anywhere today.
 * `sandbox_games.slug` carries a UNIQUE constraint only among sandbox rows, so nothing currently
 * stops an uploaded game from claiming `reaction-time`. With SYSTEM games alone there is nothing
 * to collide with yet; this is the check creator registration will be routed through once its
 * definitions are resolved here too.
 */
export function assertUniqueSlugs(definitions: readonly GameDefinition[]): void {
  const seen = new Set<string>();
  for (const definition of definitions) {
    if (seen.has(definition.slug)) {
      throw new Error(`❌ Duplicate game slug "${definition.slug}" in the game registry`);
    }
    seen.add(definition.slug);
  }
}

/**
 * Holds the two sources to agreement while both exist.
 *
 * `game-registry/` (new, canonical-in-waiting) and `games/*​/src/manifest.ts` (still what the
 * runtime reads) describe the same four games. Until the consumers are switched over, any
 * disagreement between them is a bug that would otherwise surface as a catalog that renders one
 * thing and scores another — so it fails the build here, at the point where both are already in
 * memory, rather than being left for a reviewer to notice.
 *
 * `xpPerCompletion` is exempt: it is a registry-only concept with no manifest counterpart.
 */
export function assertDefinitionsMatchManifests(
  definitions: readonly GameDefinition[],
  manifests: readonly GameManifest[],
): void {
  const definitionSlugs = definitions.map((d) => d.slug).sort();
  const manifestSlugs = manifests.map((m) => m.slug).sort();
  if (JSON.stringify(definitionSlugs) !== JSON.stringify(manifestSlugs)) {
    throw new Error(
      `❌ game-registry/ and games/ describe different games.\n` +
        `   game-registry: ${definitionSlugs.join(", ") || "(none)"}\n` +
        `   games/:        ${manifestSlugs.join(", ") || "(none)"}`,
    );
  }

  const manifestBySlug = new Map(manifests.map((m) => [m.slug, m]));
  for (const definition of definitions) {
    const manifest = manifestBySlug.get(definition.slug);
    if (!manifest) continue; // unreachable given the set comparison above

    const mismatches = diffDefinitionAgainstManifest(definition, manifest);
    if (mismatches.length > 0) {
      throw new Error(
        `❌ game-registry/games/${definition.slug} disagrees with games/*/src/manifest.ts:\n` +
          mismatches.map((line) => `   ${line}`).join("\n"),
      );
    }
  }
}

function diffDefinitionAgainstManifest(
  definition: GameDefinition,
  manifest: GameManifest,
): string[] {
  const mismatches: string[] = [];
  const compare = (field: string, fromRegistry: unknown, fromManifest: unknown): void => {
    if (JSON.stringify(fromRegistry ?? null) !== JSON.stringify(fromManifest ?? null)) {
      mismatches.push(
        `${field}: registry ${JSON.stringify(fromRegistry)} vs manifest ${JSON.stringify(fromManifest)}`,
      );
    }
  };

  compare("title", definition.title, manifest.title);
  compare("shortDescription", definition.shortDescription, manifest.shortDescription);
  compare("description", definition.description, manifest.description);
  compare("status", definition.status, manifest.status);
  compare("categories", definition.categories, manifest.categories);
  compare("tags", definition.tags, manifest.tags);
  compare("modes", definition.modes, manifest.modes);
  compare("inputMethods", definition.inputMethods, manifest.inputMethods);
  compare("minPlayers", definition.minPlayers, manifest.minPlayers);
  compare("maxPlayers", definition.maxPlayers, manifest.maxPlayers);
  compare("thumbnail", definition.thumbnail, manifest.thumbnail);
  compare("accent", definition.accent, manifest.accent);
  compare(
    "estimatedRoundSeconds",
    definition.estimatedRoundSeconds,
    manifest.estimatedRoundSeconds,
  );
  compare("supportsReplay", definition.supportsReplay, manifest.supportsReplay);
  compare("difficulty", definition.difficulty, manifest.difficulty);
  compare("presentation", definition.presentation, manifest.presentation);
  compare("policy.score", definition.policy.score, manifest.scoreConfig ?? null);
  compare("policy.leaderboard", definition.policy.leaderboard, manifest.supportsLeaderboard);
  compare("policy.requiresAuth", definition.policy.requiresAuth, manifest.requiresAuth);

  return mismatches;
}

/**
 * Pure string-rendering half of the core manifest registry — separated from `buildRegistrySources`
 * (which reads `games/*` off disk, writes the result to `packages/core/src/registry/
 * gameDefinitions.generated.ts`, and applies Prettier) can be called directly with any manifest
 * list, with no filesystem involved.
 *
 * That's what lets e2e/prepareLocalGameOrigin.ts reuse the exact real codegen — not a hand-copied
 * second template that could drift — to build a *temporary* registry module containing the real
 * manifests plus a couple of synthetic, E2E-only ones, restored via `git checkout` once the whole
 * `pnpm e2e` run finishes (see that file's own doc comment).
 */
export function renderCoreRegistryModule(manifests: readonly GameManifest[]): string {
  return `// AUTO-GENERATED FILE BY scripts/generate-game-registry.ts - DO NOT EDIT MANUALLY
import type { GameManifest } from "@owogg/game-sdk/contracts";

export const GAME_MANIFESTS: GameManifest[] = ${JSON.stringify(manifests, null, 2)};

export const GAME_MANIFEST_MAP: Record<string, GameManifest> = ${JSON.stringify(
    Object.fromEntries(manifests.map((m) => [m.id || m.slug, m])),
    null,
    2,
  )};

export function validateScoreByManifest(gameId: string, score: number): { valid: boolean; reason?: string } {
  if (typeof score !== "number" || Number.isNaN(score) || !Number.isInteger(score) || score < 0) {
    return { valid: false, reason: "점수는 0 이상의 정수이어야 합니다." };
  }

  const manifest = GAME_MANIFEST_MAP[gameId];
  if (!manifest) {
    // Deliberately not an "accept anything under a million" fallback (2026-08-17 beta hardening)
    // - that let ANY unrecognized game id, sandbox games included, submit an arbitrary score with
    // almost no bounds check, since sandbox games are never in this static registry. Sandbox game
    // score submission is explicitly unsupported until a dedicated DB-backed validation path is
    // built for it - this is that decision enforced, not a gap.
    return { valid: false, reason: "지원하지 않는 게임입니다." };
  }
  if (!manifest.scoreConfig) {
    return { valid: true };
  }

  const { min, max } = manifest.scoreConfig;
  if (score < min || score > max) {
    return { valid: false, reason: \`유효하지 않은 점수입니다 (\${min}~\${max}).\` };
  }

  return { valid: true };
}
`;
}

export async function buildRegistrySources(rootDir = process.cwd()): Promise<RegistryBuildResult> {
  const gamesDir = path.join(rootDir, "games");

  if (!fs.existsSync(gamesDir)) {
    throw new Error("❌ games directory not found");
  }

  const entries = fs.readdirSync(gamesDir, { withFileTypes: true });
  const gameDirs = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name);

  const gameEntries: GameEntry[] = [];
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const seenPackages = new Set<string>();

  for (const gameName of gameDirs) {
    const pkgPath = path.join(gamesDir, gameName, "package.json");
    if (!fs.existsSync(pkgPath)) {
      throw new Error(`❌ Missing package.json in games/${gameName}`);
    }

    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as { name?: string };
    if (!pkgJson.name) {
      throw new Error(`❌ package.json in games/${gameName} is missing "name" field`);
    }
    const packageName = pkgJson.name;

    const manifestPath = path.join(gamesDir, gameName, "src", "manifest.ts");
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`❌ Missing src/manifest.ts in games/${gameName}`);
    }

    try {
      const moduleUrl = pathToFileURL(manifestPath).href;
      const mod = (await import(moduleUrl)) as { manifest?: GameManifest };
      const manifest = mod.manifest;

      if (!manifest || typeof manifest !== "object") {
        throw new Error(`❌ games/${gameName}/src/manifest.ts must export 'const manifest'`);
      }

      if (!manifest.id || !manifest.slug || !manifest.title) {
        throw new Error(
          `❌ Invalid manifest in games/${gameName}: id, slug, and title are required`,
        );
      }

      if (seenIds.has(manifest.id)) {
        throw new Error(`❌ Duplicate manifest id "${manifest.id}" found in games/${gameName}`);
      }
      if (seenSlugs.has(manifest.slug)) {
        throw new Error(`❌ Duplicate manifest slug "${manifest.slug}" found in games/${gameName}`);
      }
      if (seenPackages.has(packageName)) {
        throw new Error(`❌ Duplicate package name "${packageName}" found in games/${gameName}`);
      }

      seenIds.add(manifest.id);
      seenSlugs.add(manifest.slug);
      seenPackages.add(packageName);

      gameEntries.push({
        dirName: gameName,
        packageName,
        manifest,
      });
    } catch (err) {
      if (err instanceof Error) throw err;
      throw new Error(`❌ Failed to import manifest for games/${gameName}: ${String(err)}`);
    }
  }

  // Sort game entries deterministically by slug
  gameEntries.sort((a, b) => a.manifest.slug.localeCompare(b.manifest.slug));

  const manifests = gameEntries.map((e) => e.manifest);

  // The registry is loaded and reconciled before any code is emitted, so a disagreement between
  // the two sources fails the build rather than producing a pair of generated files that quietly
  // contradict each other.
  const definitions = loadGameDefinitions(rootDir);
  assertDefinitionsMatchManifests(definitions, manifests);

  // 1. Core Manifest Registry Raw Code — see renderCoreRegistryModule's own doc comment for why
  // this is a separately exported, pure function rather than inlined here.
  const rawCoreRegistryCode = renderCoreRegistryModule(manifests);

  // 2. Web Loader Registry Raw Code
  const loaderEntries = gameEntries
    .map((e) => `  "${e.manifest.slug}": () => import("${e.packageName}"),`)
    .join("\n");

  const rawWebLoaderCode = `// AUTO-GENERATED FILE BY scripts/generate-game-registry.ts - DO NOT EDIT MANUALLY
import type { GameModule } from "@owogg/game-sdk";

export type GameLoader = () => Promise<{ default: GameModule } | GameModule>;

export const GAME_LOADERS: Record<string, GameLoader> = {
${loaderEntries}
};
`;

  // 3. Game Definitions Raw Code — the file-based registry's compiled form.
  const rawGameDefinitionsCode = `// AUTO-GENERATED FILE BY scripts/generate-game-registry.ts - DO NOT EDIT MANUALLY
//
// Compiled from game-registry/games/<slug>/{info,policy}.json. Edit those files, then run
// \`pnpm generate:registry\`; \`pnpm registry:check\` fails the build if this drifts from them.
//
// SYSTEM-owned source definitions only. Production runtime authority is generic D1/B2; this
// generated file feeds deterministic OWOGG bootstrap and build-time parity checks.
import type { GameDefinition } from "../modules/game/domain/gameDefinition.js";

export const GAME_DEFINITIONS: GameDefinition[] = ${JSON.stringify(definitions, null, 2)};

export const GAME_DEFINITION_MAP: Record<string, GameDefinition> = ${JSON.stringify(
    Object.fromEntries(definitions.map((d) => [d.slug, d])),
    null,
    2,
  )};
`;

  const coreOutputPath = path.join(
    rootDir,
    "packages",
    "core",
    "src",
    "registry",
    "gameRegistry.generated.ts",
  );
  const webOutputPath = path.join(
    rootDir,
    "apps",
    "web",
    "app",
    "features",
    "catalog",
    "gameLoaders.generated.ts",
  );
  const definitionsOutputPath = path.join(
    rootDir,
    "packages",
    "core",
    "src",
    "registry",
    "gameDefinitions.generated.ts",
  );

  const coreConfig = (await prettier.resolveConfig(coreOutputPath)) || {};
  const webConfig = (await prettier.resolveConfig(webOutputPath)) || {};
  const definitionsConfig = (await prettier.resolveConfig(definitionsOutputPath)) || {};

  // Format canonically using Prettier with resolved config and filepath
  const coreRegistryCode = await prettier.format(rawCoreRegistryCode, {
    ...coreConfig,
    filepath: coreOutputPath,
    parser: "typescript",
  });

  const webLoaderCode = await prettier.format(rawWebLoaderCode, {
    ...webConfig,
    filepath: webOutputPath,
    parser: "typescript",
  });

  const gameDefinitionsCode = await prettier.format(rawGameDefinitionsCode, {
    ...definitionsConfig,
    filepath: definitionsOutputPath,
    parser: "typescript",
  });

  return {
    coreRegistryCode,
    webLoaderCode,
    gameDefinitionsCode,
    gameEntries,
    definitions,
  };
}
