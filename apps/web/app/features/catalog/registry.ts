import type { GameModule, GameManifest } from "@gamemoa/game-sdk";

type GameLoader = () => Promise<{ default: GameModule } | GameModule>;

export const gameRegistry: Record<string, GameLoader> = {
  "reaction-time": () => import("@gamemoa/game-reaction-time"),
};

// Static manifests for catalog listing
// These are small objects and safe to bundle with the catalog
const reactionTimeManifest: GameManifest = {
  id: "reaction-time",
  slug: "reaction-time",
  title: "반응속도 테스트",
  shortDescription: "화면이 바뀌면 최대한 빨리 클릭하세요!",
  description: "초록색 화면이 나타나는 순간 최대한 빨리 클릭하세요. 당신의 반응속도를 측정합니다.",
  modes: ["single"],
  status: "published",
  categories: ["반응", "측정"],
  tags: ["반응속도", "클릭", "타이밍"],
  minPlayers: 1,
  maxPlayers: 1,
  thumbnail: "/games/reaction-time/thumbnail.svg",
  accent: "#22c55e",
  estimatedRoundSeconds: 30,
  requiresAuth: false,
  supportsLeaderboard: true,
  version: "0.1.0",
};

export const gameManifests: GameManifest[] = [
  reactionTimeManifest,
].filter((m) => m.status === "published" || m.status === "beta");

export async function loadGame(slug: string): Promise<GameModule | null> {
  const loader = gameRegistry[slug];
  if (!loader) return null;
  const mod = await loader();
  return "default" in mod ? mod.default : (mod as unknown as GameModule);
}
