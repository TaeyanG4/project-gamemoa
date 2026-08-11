export type GameClientEvent =
  | { readonly type: "game_started"; readonly at: number }
  | { readonly type: "checkpoint"; readonly name: string; readonly at: number }
  | { readonly type: "game_completed"; readonly at: number }
  | { readonly type: "game_abandoned"; readonly at: number };
