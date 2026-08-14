import type { GameManifest } from "@owogg/game-sdk";
import { GameCard } from "./GameCard";
import type { GridColumns } from "../../features/personalization/useGridColumns";

/** Static class strings per column count — Tailwind can't see dynamically-built class names, so
 * these must stay literal. Only the largest breakpoint changes; smaller screens stay at 1-2
 * columns regardless of the user's preference since there isn't room to honor it there anyway. */
const GRID_CLASSES: Record<GridColumns, string> = {
  4: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5",
  5: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4",
  6: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3",
};

interface GameGridProps {
  games: readonly GameManifest[];
  columns: GridColumns;
  emptyMessage?: React.ReactNode;
}

/** Shared grid used by every page that lists game cards (home sections, /games catalog). Keeping
 * this in one place is what lets the column-count switcher and future layout tweaks apply
 * everywhere at once as the game catalog grows, instead of drifting per-page. */
export function GameGrid({ games, columns, emptyMessage }: GameGridProps) {
  return (
    <div className={GRID_CLASSES[columns]}>
      {games.map((game) => (
        <GameCard key={game.slug} {...game} />
      ))}

      {games.length === 0 && emptyMessage && (
        <div className="col-span-full py-16 text-center text-text-muted bg-surface-raised rounded-3xl border border-border border-dashed">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
