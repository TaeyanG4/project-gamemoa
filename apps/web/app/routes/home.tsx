import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { MonitorSmartphone, Timer, Trophy, ArrowRight, Gamepad2, Sparkles } from "lucide-react";
import { gameManifests } from "../features/catalog/registry";
import { GameCard } from "../components/ui/GameCard";
import { HeroSpotlight } from "../components/ui/HeroSpotlight";
import { CategoryChips } from "../components/ui/CategoryChips";

export function meta() {
  return [
    { title: "gamemoa — 심심할 틈 없이, 게임을 한곳에" },
    { name: "description", content: "설치 없이 바로 즐기는 가벼운 웹 미니게임 모음 플랫폼" },
  ];
}

export default function Home() {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  const featuredGame = gameManifests[0];

  const filteredGames = useMemo(() => {
    if (selectedCategory === "all") return gameManifests;
    if (selectedCategory === "popular") return gameManifests;
    if (selectedCategory === "reaction") {
      return gameManifests.filter(g => g.modes.includes("single") || g.slug.includes("reaction"));
    }
    if (selectedCategory === "brain") {
      return gameManifests.filter(g => g.modes.includes("single"));
    }
    if (selectedCategory === "arcade") {
      return gameManifests;
    }
    return gameManifests;
  }, [selectedCategory]);

  return (
    <div className="flex flex-col w-full px-4 md:px-8 py-6 gap-10 max-w-7xl mx-auto">
      {/* MiniGame.com Style Hero Spotlight Banner */}
      {featuredGame && (
        <section className="w-full">
          <HeroSpotlight game={featuredGame} />
        </section>
      )}

      {/* Category Chips Bar & Catalog Grid Section (CrazyGames High-Density Style) */}
      <section className="flex flex-col gap-6 w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <Gamepad2 className="w-6 h-6 text-brand" />
            <h2 className="text-2xl font-black text-text-primary tracking-tight">미니게임 라인업</h2>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
              {filteredGames.length}개
            </span>
          </div>

          {/* Category Pills Bar */}
          <div className="w-full sm:w-auto">
            <CategoryChips 
              selectedCategory={selectedCategory} 
              onSelectCategory={setSelectedCategory} 
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
              해당 카테고리에 준비된 게임이 없습니다.
            </div>
          )}
        </div>
      </section>

      {/* Why Gamemoa Grid (Feature Highlights) */}
      <section className="py-8 w-full border-t border-border/40">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-surface-raised border border-border/80 flex flex-col items-start hover:border-brand/40 transition-all group shadow-md">
            <div className="p-3.5 rounded-xl bg-brand/10 text-brand mb-4 group-hover:scale-110 transition-transform">
              <MonitorSmartphone className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-text-primary">1초 무설치 시작</h3>
            <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
              웹 브라우저만 열면 즉시 시작됩니다. 로딩도, 앱 다운로드도 없습니다.
            </p>
          </div>
          
          <div className="p-6 rounded-2xl bg-surface-raised border border-border/80 flex flex-col items-start hover:border-accent-green/40 transition-all group shadow-md">
            <div className="p-3.5 rounded-xl bg-accent-green/10 text-accent-green mb-4 group-hover:scale-110 transition-transform">
              <Timer className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-text-primary">초단위 숏폼 게임</h3>
            <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
              30초 내외의 빠른 라운드로 부담 없이 짧게 즐길 수 있는 게임들로 구성되어 있습니다.
            </p>
          </div>
          
          <div className="p-6 rounded-2xl bg-surface-raised border border-border/80 flex flex-col items-start hover:border-accent-yellow/40 transition-all group shadow-md">
            <div className="p-3.5 rounded-xl bg-accent-yellow/10 text-accent-yellow mb-4 group-hover:scale-110 transition-transform">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-text-primary">정밀 기록 측정</h3>
            <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
              밀리초(ms) 단위의 최고 기록을 측정하고 자신의 신기록에 계속 도전해 보세요.
            </p>
          </div>
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
