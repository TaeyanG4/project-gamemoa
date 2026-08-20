import { useParams } from "react-router";
import { GameHost } from "../features/game/GameHost";

/** Primary gameplay route for every publisher. GameHost resolves one provider-neutral PublicGame
 * detail and retains the C-2 parent-side session/Bridge security boundary. */
export default function GamePlayRoute() {
  const { slug = "" } = useParams();
  return <GameHost slug={slug} />;
}
