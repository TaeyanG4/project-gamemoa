import { useParams } from "react-router";
import { GameHost } from "../features/game/GameHost";

/**
 * `/games/:slug` — param extraction only. Every actual gameplay concern (loading, difficulty,
 * score submission, result/leaderboard/share, retry) lives in GameHost; this file is deliberately
 * left with nothing else to grow, so route-level additions (meta tags, loaders, layout) don't end
 * up tangled with gameplay logic the way this file used to be.
 */
export default function GamePlayRoute() {
  const { slug = "" } = useParams();
  return <GameHost slug={slug} />;
}
