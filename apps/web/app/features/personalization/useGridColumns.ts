import { useEffect, useState } from "react";

export const GRID_COLUMN_OPTIONS = [4, 5, 6] as const;
export type GridColumns = (typeof GRID_COLUMN_OPTIONS)[number];

const STORAGE_KEY = "owogg_grid_columns";
const DEFAULT_COLUMNS: GridColumns = 4;

function isGridColumns(value: number): value is GridColumns {
  return (GRID_COLUMN_OPTIONS as readonly number[]).includes(value);
}

function readStoredColumns(): GridColumns {
  if (typeof window === "undefined") return DEFAULT_COLUMNS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return isGridColumns(parsed) ? parsed : DEFAULT_COLUMNS;
}

/** Persists the game grid's column-count preference (4/5/6) to localStorage. Client-only
 * preference — deliberately not synced to the account, same as locale-before-login. Shared by
 * every page that renders <GameGrid> so the choice feels consistent across the site, and scales
 * cleanly as more games are added since it only ever changes layout density, not pagination. */
export function useGridColumns(): [GridColumns, (columns: GridColumns) => void] {
  const [columns, setColumns] = useState<GridColumns>(DEFAULT_COLUMNS);

  useEffect(() => {
    setColumns(readStoredColumns());
  }, []);

  const update = (next: GridColumns) => {
    setColumns(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    }
  };

  return [columns, update];
}
