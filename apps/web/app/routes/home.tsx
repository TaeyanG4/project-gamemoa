import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { Gamepad2, Sparkles, Clock, Bookmark, TrendingUp } from "lucide-react";
import { useEnabledGameManifests } from "../features/catalog/gameAvailability";
import { GameGrid } from "../components/ui/GameGrid";
import { GridColumnSwitcher } from "../components/ui/GridColumnSwitcher";
import { CategoryChips } from "../components/ui/CategoryChips";
import { usePersonalization, useGridColumns } from "../features/personalization";
import { useAuth } from "../features/auth";
import { useI18n } from "../features/i18n/I18nContext";

export function meta() {
  return [
    { title: "OwOGG — 심심할 틈 없이, 게임을 한곳에" },
    { name: "description", content: "설치 없이 바로 즐기는 가벼운 웹 미니게임 모음 플랫폼" },
  ];
}

export default function Home() {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const { mobileColumns, setMobileColumns, desktopColumns, setDesktopColumns } = useGridColumns();
  const gameManifests = useEnabledGameManifests();

  const { favoriteGameIds, recentPlays } = usePersonalization();
  const { dict } = useI18n();
  const { isAuthenticated, openLoginModal } = useAuth();

  const handleSelectCategory = (categoryId: string) => {
    if (categoryId === "favorites" && !isAuthenticated) {
      openLoginModal();
      return;
    }
    setSelectedCategory(categoryId);
  };

  const filteredGames = useMemo(() => {
    if (selectedCategory === "all") return gameManifests;
    if (selectedCategory === "favorites") {
      return gameManifests.filter(
        (game) => favoriteGameIds.includes(game.slug) || favoriteGameIds.includes(game.id),
      );
    }
    return gameManifests.filter((game) => game.categories.includes(selectedCategory));
  }, [selectedCategory, favoriteGameIds]);

  const popularGames = useMemo(() => {
    return gameManifests.filter((game) => game.categories.includes("popular"));
  }, []);

  const recentGames = useMemo(() => {
    return recentPlays
      .map((r) => gameManifests.find((g) => g.slug === r.gameId || g.id === r.gameId))
      .filter((g): g is (typeof gameManifests)[0] => Boolean(g))
      .slice(0, 4);
  }, [recentPlays]);

  const favoriteGames = useMemo(() => {
    return favoriteGameIds
      .map((id) => gameManifests.find((g) => g.slug === id || g.id === id))
      .filter((g): g is (typeof gameManifests)[0] => Boolean(g))
      .slice(0, 4);
  }, [favoriteGameIds]);

  return (
    <div className="flex flex-col w-full px-4 md:px-8 py-6 gap-10 max-w-7xl mx-auto flex-1">
      {/* Popular Games — leads the page instead of a single per-day featured banner, so it scales
          naturally as more games get the "popular" tag rather than needing curation of one pick. */}
      {popularGames.length > 0 && (
        <section className="flex flex-col gap-4 w-full">
          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
            <TrendingUp className="w-5 h-5 text-brand" />
            <h3 className="text-xl font-black text-text-primary tracking-tight">
              {dict.home.popularTitle}
            </h3>
          </div>
          <GameGrid
            games={popularGames}
            mobileColumns={mobileColumns}
            desktopColumns={desktopColumns}
          />
        </section>
      )}

      {/* Personalized Section: Recent Plays */}
      {recentGames.length > 0 && (
        <section className="flex flex-col gap-4 w-full">
          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
            <Clock className="w-5 h-5 text-brand" />
            <h3 className="text-xl font-black text-text-primary tracking-tight">
              {dict.home.recentPlaysTitle}
            </h3>
          </div>
          <GameGrid
            games={recentGames}
            mobileColumns={mobileColumns}
            desktopColumns={desktopColumns}
          />
        </section>
      )}

      {/* Personalized Section: Favorites */}
      {isAuthenticated && favoriteGames.length > 0 && (
        <section className="flex flex-col gap-4 w-full">
          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
            <Bookmark className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h3 className="text-xl font-black text-text-primary tracking-tight">
              {dict.home.favoritesTitle}
            </h3>
          </div>
          <GameGrid
            games={favoriteGames}
            mobileColumns={mobileColumns}
            desktopColumns={desktopColumns}
          />
        </section>
      )}

      {/* Category Chips Bar & Catalog Grid Section (CrazyGames High-Density Style) */}
      <section className="flex flex-col gap-6 w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4 min-w-0">
          <div className="flex items-center gap-2.5">
            <Gamepad2 className="w-6 h-6 text-brand" />
            <h2 className="text-2xl font-black text-text-primary tracking-tight">
              {dict.home.lineupTitle}
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 w-full sm:w-auto min-w-0">
            {/* Category Pills Bar — min-w-0 above and here keeps its own overflow-x-auto as the
                scroll boundary instead of the un-wrapped chip row pushing the whole page wide. */}
            <CategoryChips
              selectedCategory={selectedCategory}
              onSelectCategory={handleSelectCategory}
            />
            <GridColumnSwitcher
              mobileColumns={mobileColumns}
              onMobileChange={setMobileColumns}
              desktopColumns={desktopColumns}
              onDesktopChange={setDesktopColumns}
            />
          </div>
        </div>

        {/* High Density Game Grid */}
        <GameGrid
          games={filteredGames}
          mobileColumns={mobileColumns}
          desktopColumns={desktopColumns}
          emptyMessage={
            selectedCategory === "favorites" ? dict.games.emptyFavorites : dict.home.emptyCategory
          }
        />
      </section>

      {/* Multiplayer Teaser Banner */}
      <section className="w-full rounded-3xl bg-gradient-to-r from-surface-raised via-surface-overlay to-surface border border-border p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col gap-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/30 text-accent-blue font-extrabold text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>COMMUNITY & MULTIPLAYER</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black text-text-primary">
            {dict.home.teaserTitle}
          </h3>
          <p className="text-sm text-text-secondary">{dict.home.teaserBody}</p>
        </div>

        <Link
          to="/games"
          className="z-10 shrink-0 px-6 py-3 bg-surface-raised border border-border hover:border-brand/40 text-text-primary font-bold text-sm rounded-xl transition-all cursor-pointer"
        >
          {dict.home.teaserCta}
        </Link>
      </section>
    </div>
  );
}
