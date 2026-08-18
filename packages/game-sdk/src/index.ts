/**
 * `@owogg/game-sdk` package root — the full SDK: framework-independent contracts plus the React
 * runtime binding. This is what `apps/web` and every package under `games/` import, and its
 * surface is unchanged.
 *
 * Consumers that must not depend on React import `@owogg/game-sdk/contracts` instead — see that
 * entry's doc comment for why the split exists.
 */

export * from "./contracts/index.js";
export * from "./react/module.js";
