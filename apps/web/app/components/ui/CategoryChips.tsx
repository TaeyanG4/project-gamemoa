import { Flame, Sparkles, Zap, Brain, Target, Keyboard, Bookmark } from "lucide-react";

export interface CategoryOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CATEGORIES: CategoryOption[] = [
  { id: "all", label: "전체", icon: Flame },
  { id: "popular", label: "인기", icon: Sparkles },
  { id: "reaction", label: "순발력", icon: Zap },
  { id: "brain", label: "두뇌", icon: Brain },
  { id: "aim", label: "에임", icon: Target },
  { id: "typing", label: "타자", icon: Keyboard },
  { id: "favorites", label: "즐겨찾기", icon: Bookmark },
];

interface CategoryChipsProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export function CategoryChips({ selectedCategory, onSelectCategory }: CategoryChipsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 w-full select-none">
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const isSelected = selectedCategory === cat.id;

        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all cursor-pointer border ${
              isSelected
                ? "bg-brand text-white border-brand shadow-lg shadow-brand/25 scale-105"
                : "bg-surface-raised text-text-secondary border-border/80 hover:text-text-primary hover:bg-surface-overlay hover:border-border"
            }`}
          >
            <Icon className={`w-4 h-4 ${isSelected ? "text-white" : "text-brand-light"}`} />
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
