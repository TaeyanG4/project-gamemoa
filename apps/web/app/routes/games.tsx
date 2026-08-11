import { useState, useMemo } from "react";
import { useSearchParams } from "react-router";
import { Gamepad2, Search } from "lucide-react";
import { gameManifests } from "../features/catalog/registry";
import { GameCard } from "../components/ui/GameCard";
import { CategoryChips } from "../components/ui/CategoryChips";

export function meta() {
  return [
    { title: "전체 미니게임 목록 | gamemoa" },
    { name: "description", content: "설치 없는 모든 웹 미니게임을 한 곳에서 탐색하고 즐기세요." },
  ];
}

export default function Games() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialCategory = searchParams.get("category") || "all";

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  const filteredGames = useMemo(() => {
    return gameManifests.filter((game) => {
      const matchesSearch =
        !searchQuery ||
        game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" ||
        selectedCategory === "popular" ||
        (selectedCategory === "reaction" && game.slug.includes("reaction")) ||
        (selectedCategory === "brain" && game.modes.includes("single"));

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="flex flex-col w-full px-4 md:px-8 py-8 gap-8 max-w-7xl mx-auto flex-1">
      {/* Top Title & Search Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider mb-1">
            <Gamepad2 className="w-4 h-4" />
            <span>Game Collection</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-text-primary">전체 미니게임</h1>
          <p className="text-sm text-text-secondary mt-1">
            총 {filteredGames.length}개의 가벼운 미니게임이 준비되어 있습니다.
          </p>
        </div>

        {/* Live Filter Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="게임 검색..."
            className="w-full bg-surface-raised text-text-primary placeholder:text-text-muted text-sm rounded-xl pl-10 pr-4 py-2.5 border border-border/80 focus:outline-none focus:border-brand transition-all"
          />
        </div>
      </div>

      {/* Category Chips Bar */}
      <CategoryChips
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredGames.map((game) => (
          <GameCard key={game.slug} {...game} />
        ))}

        {filteredGames.length === 0 && (
          <div className="col-span-full py-20 text-center text-text-muted bg-surface-raised rounded-3xl border border-border border-dashed">
            검색 결과와 일치하는 게임이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
