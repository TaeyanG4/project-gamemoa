import { useParams } from "react-router";
import { GameHost } from "../features/game/GameHost";
import { CreatorGameHost } from "../features/game/CreatorGameHost";
import { useGameSourceResolution } from "../features/game/transitionalCreatorGameResolver";

/**
 * `/games/:slug` — param extraction, plus (transitionally — see transitionalCreatorGameResolver's
 * doc comment) the one decision of which host actually owns the slug. GameHost itself carries no
 * knowledge of Creator games or any slug-specific branching; every actual gameplay concern for the
 * four built-in games (loading, difficulty, score submission, result/leaderboard/share, retry)
 * still lives entirely there, untouched.
 */
export default function GamePlayRoute() {
  const { slug = "" } = useParams();
  const resolution = useGameSourceResolution(slug);

  if (resolution.status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  if (resolution.kind === "creator") {
    return <CreatorGameHost slug={slug} game={resolution.game} />;
  }

  // "system" and "not_found" both fall through to GameHost unchanged — it already renders its
  // own errorGameNotFound state for an unresolvable slug via loadGame() returning null, so
  // "not_found" needs no separate handling here.
  return <GameHost slug={slug} />;
}
