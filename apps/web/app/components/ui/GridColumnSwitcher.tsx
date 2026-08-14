import { LayoutGrid } from "lucide-react";
import {
  GRID_COLUMN_OPTIONS,
  type GridColumns,
} from "../../features/personalization/useGridColumns";
import { useI18n } from "../../features/i18n/I18nContext";

interface GridColumnSwitcherProps {
  columns: GridColumns;
  onChange: (columns: GridColumns) => void;
}

/** Lets the user pick how dense the game grid renders (4/5/6 columns). Only meaningful on wide
 * screens — smaller breakpoints in GameGrid ignore this and stay at 1-2 columns regardless. */
export function GridColumnSwitcher({ columns, onChange }: GridColumnSwitcherProps) {
  const { dict } = useI18n();

  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-surface-raised p-1">
      <LayoutGrid className="ml-1.5 h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
      {GRID_COLUMN_OPTIONS.map((option) => {
        const isSelected = option === columns;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-label={`${dict.home.gridColumnsAriaPrefix}${option}${dict.home.gridColumnsAriaSuffix}`}
            aria-pressed={isSelected}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isSelected
                ? "bg-brand text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-overlay"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
