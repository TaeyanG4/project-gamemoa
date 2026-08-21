/**
 * Layer-boundary rules and the AST-based import scanner behind `pnpm architecture:check`.
 *
 * Split out from verify-architecture.ts (which stays the IO + reporting half) so the matching
 * logic is directly testable on synthetic source text — see scripts/architecture-rules.test.ts.
 * A guard nobody tests is a guard that silently stops working, which is exactly what happened to
 * the previous line-prefix implementation described below.
 */

import ts from "typescript";

/**
 * How a forbidden specifier is matched.
 *
 * - `package` — the bare specifier *and* every subpath under it (`react`, `react/jsx-runtime`).
 *   The right default: a package is forbidden as a whole.
 * - `entry` — only the bare specifier, leaving subpaths legal. Exists for one real case:
 *   `@owogg/core` may not import `@owogg/game-sdk` (whose root entry re-exports the React-bound
 *   `GameModule`/`GameProps`) but *may* import `@owogg/game-sdk/contracts`, the framework-free
 *   half. Expressing that as a rule is what keeps `packages/core` free of React types without
 *   having to resolve and walk the dependency's own imports from here.
 */
export type SpecifierMatch = "package" | "entry";

export interface ForbiddenSpecifier {
  spec: string;
  match?: SpecifierMatch;
  /** Shown alongside the violation — say what to do instead, not just what is banned. */
  hint?: string;
}

export interface ImportRule {
  /** Path prefix (posix, repo-relative) whose files this rule applies to. */
  scope: string;
  rule: string;
  forbidden: ForbiddenSpecifier[];
  /**
   * When true, a type-only import (`import type { X } from "y"`, or a `type`-marked named
   * binding) does not violate the rule — only imports that can produce a runtime value do.
   *
   * Used for `apps/api/src/routes` → `@owogg/db`: the rule there is "a route may not construct a
   * concrete repository, that is the composition root's job", and a type-only import cannot
   * construct anything. It is deliberately NOT used for `packages/core` → `react`, where the
   * point is that core must not be coupled to a UI framework's *types* either.
   */
  typeOnlyAllowed?: boolean;
}

export interface Violation {
  file: string;
  rule: string;
  specifier: string;
  hint?: string | undefined;
}

/** One module specifier as it appears in a file, with enough context to apply the rules above. */
export interface ModuleReference {
  specifier: string;
  /** True when nothing this reference brings in can exist at runtime. */
  typeOnly: boolean;
  line: number;
}

/**
 * Every module specifier a file references, via the TypeScript AST rather than line matching.
 *
 * The previous implementation kept the lines that `.trim().startsWith("import")` and then looked
 * for the quoted specifier *on that same line*. That misses the dominant style in this codebase —
 *
 *     import {
 *       Hono,
 *     } from "hono";
 *
 * — because the line carrying `"hono"` does not itself start with `import`. Multi-line imports are
 * how nearly every file in packages/core, apps/api and apps/web is written, so in practice the
 * guard was passing on shape rather than on absence of violations. It also saw nothing at all in
 * `export ... from`, `import()` and `require()`, each of which creates exactly the same coupling.
 *
 * Parsing is enough here — no type-checker, no program construction, no module resolution — so
 * this stays a fast whole-repo scan with no new dependency (TypeScript is already the toolchain).
 */
export function collectModuleReferences(sourceText: string, fileName: string): ModuleReference[] {
  const source = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const refs: ModuleReference[] = [];

  const push = (node: ts.Node, specifier: ts.Expression | undefined, typeOnly: boolean) => {
    if (!specifier || !ts.isStringLiteralLike(specifier)) return;
    refs.push({
      specifier: specifier.text,
      typeOnly,
      line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
    });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      // `import "./side-effect.js"` has no clause at all; it is a runtime import, never type-only.
      push(node, node.moduleSpecifier, isImportClauseTypeOnly(node.importClause));
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      // `export * from "x"` / `export { a } from "x"` re-export at runtime just like an import.
      push(node, node.moduleSpecifier, isExportDeclarationTypeOnly(node));
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      push(node, node.moduleReference.expression, node.isTypeOnly);
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
      if (isDynamicImport || isRequire) {
        push(node, node.arguments[0], false);
      }
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(source, visit);
  return refs;
}

/** `import type { X } from "y"`, or `import { type X } from "y"` where *every* binding is typed. */
function isImportClauseTypeOnly(clause: ts.ImportClause | undefined): boolean {
  if (!clause) return false;
  if (clause.isTypeOnly) return true;
  // A default binding (`import X from "y"`) is a value unless the whole clause is type-only.
  if (clause.name) return false;
  const bindings = clause.namedBindings;
  if (!bindings) return false;
  // `import * as ns from "y"` binds a runtime namespace object.
  if (ts.isNamespaceImport(bindings)) return false;
  return bindings.elements.length > 0 && bindings.elements.every((element) => element.isTypeOnly);
}

function isExportDeclarationTypeOnly(node: ts.ExportDeclaration): boolean {
  if (node.isTypeOnly) return true;
  const clause = node.exportClause;
  if (!clause || !ts.isNamedExports(clause)) return false;
  return clause.elements.length > 0 && clause.elements.every((element) => element.isTypeOnly);
}

/** `react` matches `react` and `react/jsx-runtime`; `@owogg/game-sdk` as `entry` matches only itself. */
export function matchesForbidden(specifier: string, forbidden: ForbiddenSpecifier): boolean {
  if (specifier === forbidden.spec) return true;
  if ((forbidden.match ?? "package") === "entry") return false;
  return specifier.startsWith(`${forbidden.spec}/`);
}

export function checkFileAgainstRule(
  relativePath: string,
  sourceText: string,
  rule: ImportRule,
): Violation[] {
  const violations: Violation[] = [];
  for (const ref of collectModuleReferences(sourceText, relativePath)) {
    if (rule.typeOnlyAllowed && ref.typeOnly) continue;
    for (const forbidden of rule.forbidden) {
      if (matchesForbidden(ref.specifier, forbidden)) {
        violations.push({
          file: relativePath,
          rule: rule.rule,
          specifier: ref.specifier,
          hint: forbidden.hint,
        });
      }
    }
  }
  return violations;
}

/**
 * The rules themselves. Each one states a dependency direction this project has decided on; the
 * `hint` says where the thing you actually wanted lives.
 */
export const IMPORT_RULES: ImportRule[] = [
  {
    scope: "packages/core/src",
    rule: "packages/core must stay free of UI frameworks, HTTP frameworks, and concrete infrastructure",
    forbidden: [
      { spec: "react", hint: "core is domain/application logic; it has no rendering concern" },
      { spec: "react-dom" },
      { spec: "hono", hint: "HTTP lives in apps/api routes, not in use cases" },
      {
        spec: "@cloudflare/workers-types",
        hint: "express the dependency as a port (packages/core/src/ports) and adapt it in packages/db",
      },
      {
        spec: "@owogg/db",
        hint: "core defines ports; packages/db implements them (dependency points inward)",
      },
      {
        spec: "@owogg/game-sdk",
        match: "entry",
        hint: 'import "@owogg/game-sdk/contracts" instead — the root entry re-exports GameModule/GameProps, which are bound to React\'s ComponentType',
      },
    ],
  },
  {
    scope: "packages/contracts/src",
    rule: "packages/contracts must only contain pure TypeScript types and Zod schemas",
    forbidden: [
      { spec: "react" },
      { spec: "react-dom" },
      { spec: "hono" },
      { spec: "@owogg/db" },
      { spec: "@cloudflare/workers-types" },
      {
        spec: "@owogg/core",
        hint: "contracts sits below core — see toSandboxGameRecordResponse's doc comment on why it is structurally typed rather than importing core's record",
      },
    ],
  },
  {
    scope: "packages/game-sdk/src/contracts",
    rule: "the game-sdk contracts entry must stay framework-independent — packages/core depends on it",
    forbidden: [
      {
        spec: "react",
        hint: "React-bound contracts belong in packages/game-sdk/src/react, which only apps/web and games/* import",
      },
      { spec: "react-dom" },
    ],
  },
  {
    scope: "apps/web/app",
    rule: "apps/web must not import database adapters or the legacy auth package directly",
    forbidden: [
      { spec: "@owogg/db", hint: "the browser talks to apps/api over HTTP, never to D1" },
      { spec: "@owogg/auth" },
    ],
  },
  {
    scope: "games",
    rule: "games/* must not depend on the database or the backend HTTP framework",
    forbidden: [
      { spec: "@owogg/db" },
      { spec: "hono" },
      {
        spec: "@owogg/core",
        hint: "a game only ever knows the SDK contract; platform policy is resolved host-side",
      },
    ],
  },
  {
    scope: "apps/api/src/routes",
    rule: "apps/api routes must resolve dependencies through the composition root, never construct concrete repositories",
    // Type-only is allowed here on purpose: `import type { BackblazeB2Config } from "@owogg/db"`
    // (routes/devGames.ts) names a config shape and cannot instantiate anything. What this rule
    // is actually for is a route reaching for `new D1UserRepository(...)` instead of the container.
    typeOnlyAllowed: true,
    forbidden: [
      {
        spec: "@owogg/db",
        hint: "use createContainer() from apps/api/src/container.ts (type-only imports are fine)",
      },
    ],
  },
];

/** Package-manifest rules — a dependency that isn't imported anywhere yet is still a boundary breach. */
export interface PackageJsonRule {
  manifest: string;
  rule: string;
  forbidden: string[];
}

export const PACKAGE_JSON_RULES: PackageJsonRule[] = [
  {
    manifest: "apps/web/package.json",
    rule: "apps/web package.json must not list the database or legacy auth as dependencies",
    forbidden: ["@owogg/db", "@owogg/auth"],
  },
  {
    manifest: "packages/core/package.json",
    rule: "packages/core package.json must not list a UI or HTTP framework as a dependency",
    forbidden: ["react", "react-dom", "hono", "@owogg/db"],
  },
];

/** Content-token rules — things that aren't imports but still break a layer's contract. */
export interface TokenRule {
  scope: string;
  rule: string;
  tokens: string[];
  extensions: string[];
  /** Optional repo-relative files within scope; omit to scan the whole scope recursively. */
  files?: string[];
}

export interface RequiredTokenRule {
  file: string;
  rule: string;
  tokens: string[];
}

export const REQUIRED_TOKEN_RULES: RequiredTokenRule[] = [
  {
    file: "packages/core/src/application/sandboxGameUseCases.ts",
    rule: "USER publication must delegate to the provider-neutral publication core",
    tokens: ["GamePublicationService"],
  },
  {
    file: "packages/core/src/application/officialGameBootstrap.ts",
    rule: "OWOGG publication must delegate to the provider-neutral publication core",
    tokens: ["GamePublicationService"],
  },
];

export const TOKEN_RULES: TokenRule[] = [
  {
    scope: "packages/core/src",
    rule: "packages/core must not contain browser APIs, HTTP fetch calls, or environment URLs",
    tokens: ["window.", "localStorage.", "fetch(", "import.meta.env", "owogg.workers.dev"],
    extensions: [".ts"],
  },
  {
    scope: "packages/core/src/application",
    rule: "USER control-plane use cases must depend only on the generic canonical repository",
    tokens: ["CreatorGameDefinitionRepository", "creator-games/", "GameBundlePublisher"],
    extensions: [".ts"],
  },
  {
    scope: "packages/core/src/application",
    files: ["officialGameBootstrap.ts"],
    rule: "official bootstrap must not implement generic object or manifest publication itself",
    tokens: ["publishedObjectKey", "publishedManifestObjectKey", "buildBundleManifest"],
    extensions: [".ts"],
  },
  {
    scope: "packages/core/src/application",
    files: ["gamePublicationService.ts"],
    rule: "generic publication core must not depend on publisher-specific review records",
    tokens: [
      "SandboxGameRepository",
      "SandboxGameRecord",
      "SandboxGameVersionRecord",
      "sandbox_game_versions",
      "PENDING_REVIEW",
    ],
    extensions: [".ts"],
  },
  {
    scope: "packages/db/src",
    rule: "packages/db must remain decoupled from the game catalog registry",
    tokens: ["GAME_MANIFEST_MAP", "GAME_MANIFESTS", "GAME_DEFINITIONS"],
    extensions: [".ts"],
  },
  {
    scope: "apps/api/src",
    rule: "the API must serve games only through generic runtime identity and version routes",
    tokens: [
      "officialGameAssetsRouter",
      '"/official-games',
      "'/official-games",
      "StaticGameRegistry",
      "CreatorGameRegistry",
      "D1CreatorScoreAcceptanceRepository",
      "D1GameAttemptConsumptionRepository",
      "B2CreatorGameDefinitionRepository",
      "CreatorGameDefinitionRepository",
      "creator-games/",
    ],
    extensions: [".ts"],
  },
  {
    scope: "apps/web/app",
    rule: "the web runtime must not restore transitional Creator/System runtime selection",
    tokens: [
      "LegacyReactRuntime",
      "CreatorGameHost",
      "transitionalCreatorGameResolver",
      "SYSTEM_GAME_RELEASES",
      "officialGameEntryUrl",
      '"/official-games',
      "'/official-games",
    ],
    extensions: [".ts", ".tsx"],
  },
  {
    scope: "apps/web/app/features/game",
    rule: "GameHost score submission must use the signed generic acceptance endpoint",
    tokens: ["submitScoreApi", '"/api/scores', "'/api/scores"],
    extensions: [".ts", ".tsx"],
  },
  {
    scope: ".github/workflows",
    rule: "deployment must bootstrap only generic official bundles, never legacy release paths",
    tokens: ["publish:official-games", "systemGameReleaseMap", "official-games/"],
    extensions: [".yml", ".yaml"],
  },
];
