import type { GameManifest } from "@owogg/game-sdk";
import { GameCard } from "./GameCard";
import type { MobileColumns, DesktopColumns } from "../../features/personalization/useGridColumns";

/** Static class strings per (mobile, desktop) column pair — Tailwind can't see dynamically-built
 * class names, so every combination has to be spelled out literally. Below `lg` uses the mobile
 * setting, `lg` and up uses the desktop setting — collapses the tablet range into whichever of
 * the two reads more naturally at that width rather than adding a third independently
 * configurable tier. */
const GRID_CLASSES: Record<MobileColumns, Record<DesktopColumns, string>> = {
  2: {
    4: "grid grid-cols-2 lg:grid-cols-4 gap-4",
    5: "grid grid-cols-2 lg:grid-cols-5 gap-4",
    6: "grid grid-cols-2 lg:grid-cols-6 gap-3",
  },
  3: {
    4: "grid grid-cols-3 lg:grid-cols-4 gap-4",
    5: "grid grid-cols-3 lg:grid-cols-5 gap-4",
    6: "grid grid-cols-3 lg:grid-cols-6 gap-3",
  },
  4: {
    4: "grid grid-cols-4 lg:grid-cols-4 gap-3",
    5: "grid grid-cols-4 lg:grid-cols-5 gap-3",
    6: "grid grid-cols-4 lg:grid-cols-6 gap-3",
  },
};

interface GameGridProps {
  games: readonly GameManifest[];
  mobileColumns: MobileColumns;
  desktopColumns: DesktopColumns;
  emptyMessage?: React.ReactNode;
}

/** Shared grid used by every page that lists game cards (home sections, /games catalog). Keeping
 * this in one place is what lets the column-count switchers and future layout tweaks apply
 * everywhere at once as the game catalog grows, instead of drifting per-page. */
export function GameGrid({ games, mobileColumns, desktopColumns, emptyMessage }: GameGridProps) {
  return (
    <div className={GRID_CLASSES[mobileColumns][desktopColumns]}>
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
