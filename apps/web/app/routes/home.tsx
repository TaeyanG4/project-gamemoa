import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { Gamepad2, Sparkles, Clock, Bookmark } from "lucide-react";
import { gameManifests } from "../features/catalog/registry";
import { GameCard } from "../components/ui/GameCard";
import { HeroSpotlight } from "../components/ui/HeroSpotlight";
import { CategoryChips } from "../components/ui/CategoryChips";
import { usePersonalization } from "../features/personalization";
import { useAuth } from "../features/auth";
import { useI18n } from "../features/i18n/I18nContext";

export function meta() {
  return [
    { title: "OwOGG — 심심할 틈 없이, 게임을 한곳에" },
    { name: "description", content: "설치 없이 바로 즐기는 가벼운 웹 미니게임 모음 플랫폼" },
  ];
}

const FEATURED_SLUG = "reaction-time";

export default function Home() {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  const { favoriteGameIds, recentPlays } = usePersonalization();
  const { dict } = useI18n();
  const { isAuthenticated, openLoginModal } = useAuth();

  const featuredGame = useMemo(() => {
    return gameManifests.find((g) => g.slug === FEATURED_SLUG) ?? gameManifests[0];
  }, []);

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
      {/* MiniGame.com Style Hero Spotlight Banner */}
      {featuredGame && (
        <section className="w-full">
          <HeroSpotlight game={featuredGame} />
        </section>
      )}

      {/* Personalized Section: Recent Plays */}
      {recentGames.length > 0 && (
        <section className="flex flex-col gap-4 w-full">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand" />
              <h3 className="text-xl font-black text-text-primary tracking-tight">최근 플레이</h3>
            </div>
            <span className="text-xs font-bold text-text-muted">{recentGames.length}개</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recentGames.map((game) => (
              <GameCard key={game.slug} {...game} />
            ))}
          </div>
        </section>
      )}

      {/* Personalized Section: Favorites */}
      {isAuthenticated && favoriteGames.length > 0 && (
        <section className="flex flex-col gap-4 w-full">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-amber-400 fill-amber-400" />
              <h3 className="text-xl font-black text-text-primary tracking-tight">내 즐겨찾기</h3>
            </div>
            <span className="text-xs font-bold text-text-muted">{favoriteGames.length}개</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {favoriteGames.map((game) => (
              <GameCard key={game.slug} {...game} />
            ))}
          </div>
        </section>
      )}

      {/* Category Chips Bar & Catalog Grid Section (CrazyGames High-Density Style) */}
      <section className="flex flex-col gap-6 w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <Gamepad2 className="w-6 h-6 text-brand" />
            <h2 className="text-2xl font-black text-text-primary tracking-tight">
              {dict.home.lineupTitle}
            </h2>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
              {filteredGames.length}개
            </span>
          </div>

          {/* Category Pills Bar */}
          <div className="w-full sm:w-auto">
            <CategoryChips
              selectedCategory={selectedCategory}
              onSelectCategory={handleSelectCategory}
            />
          </div>
        </div>

        {/* High Density Game Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredGames.map((game) => (
            <GameCard key={game.slug} {...game} />
          ))}

          {filteredGames.length === 0 && (
            <div className="col-span-full py-16 text-center text-text-muted bg-surface-raised rounded-3xl border border-border border-dashed">
              {selectedCategory === "favorites"
                ? "아직 즐겨찾기한 게임이 없습니다."
                : "해당 카테고리에 준비된 게임이 없습니다."}
            </div>
          )}
        </div>
      </section>

      {/* Multiplayer Teaser Banner */}
      <section className="w-full rounded-3xl bg-gradient-to-r from-surface-raised via-surface-overlay to-surface border border-border p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col gap-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/30 text-accent-blue font-extrabold text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>COMMUNITY & MULTIPLAYER</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black text-text-primary">
            실시간 랭킹 & 멀티플레이어 업데이트 예정
          </h3>
          <p className="text-sm text-text-secondary">
            친구와 링크 하나로 접속해 함께 실시간 대결을 펼칠 수 있는 멀티 모드가 곧 출시됩니다.
          </p>
        </div>

        <Link
          to="/games"
          className="z-10 shrink-0 px-6 py-3 bg-surface-raised border border-border hover:border-brand/40 text-text-primary font-bold text-sm rounded-xl transition-all cursor-pointer"
        >
          게임 미리보기
        </Link>
      </section>
    </div>
  );
}
