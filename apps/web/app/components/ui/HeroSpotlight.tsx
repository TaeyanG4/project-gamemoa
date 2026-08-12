import { Link } from "react-router";
import { Play, Sparkles, Zap, Clock } from "lucide-react";

import type { GameManifest } from "@gamemoa/game-sdk";

interface HeroSpotlightProps {
  game: GameManifest;
}

export function HeroSpotlight({ game }: HeroSpotlightProps) {
  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-surface-raised via-surface-overlay to-surface border border-border shadow-2xl group select-none">
      {/* Background Decorative Glow */}
      <div 
        className="absolute -right-20 -top-20 w-96 h-96 blur-[120px] rounded-full pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity duration-500"
        style={{ backgroundColor: game.accent || "#6366f1" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Left Text Info */}
        <div className="flex flex-col items-start gap-4 max-w-xl">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/30 text-brand-light text-xs font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>오늘의 피처드 게임</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-text-primary tracking-tight leading-tight">
            {game.title}
          </h2>

          <p className="text-base md:text-lg text-text-secondary leading-relaxed">
            {game.shortDescription}
          </p>

          {/* Meta Tags */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {game.modes.map((mode) => (
              <span 
                key={mode}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-surface-sidebar border border-border text-text-secondary"
              >
                <Zap className="w-3 h-3 text-accent-yellow" />
                {mode}
              </span>
            ))}
            {game.estimatedRoundSeconds && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-surface-sidebar border border-border text-text-muted">
                <Clock className="w-3 h-3 text-brand-light" />
                약 {game.estimatedRoundSeconds}초 라운드
              </span>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-4 flex items-center gap-4 w-full sm:w-auto">
            <Link
              to={`/games/${game.slug}`}
              className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-brand to-accent-purple text-white rounded-2xl font-extrabold text-lg shadow-xl shadow-brand/30 hover:scale-105 hover:shadow-2xl hover:shadow-brand/50 transition-all duration-200 cursor-pointer"
            >
              <Play className="w-6 h-6 fill-current" />
              <span>지금 바로 플레이</span>
            </Link>
          </div>
        </div>

        {/* Right Thumbnail & Visual Element */}
        <div className="w-full md:w-72 aspect-[4/3] relative rounded-2xl overflow-hidden border border-border/80 bg-surface-sidebar flex items-center justify-center p-6 shrink-0 group-hover:border-brand/40 transition-colors shadow-2xl">
          <div 
            className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity"
            style={{
              background: `radial-gradient(circle, ${game.accent || "#6366f1"} 0%, transparent 70%)`
            }}
          />
          {game.thumbnail.startsWith("/") || game.thumbnail.startsWith("http") ? (
            <img
              src={game.thumbnail}
              alt={game.title}
              className="w-32 h-32 object-contain rounded-2xl shadow-2xl group-hover:scale-110 transition-transform duration-300 relative z-10"
            />
          ) : (
            <div 
              className="w-32 h-32 rounded-2xl shadow-2xl group-hover:scale-110 transition-transform duration-300 relative z-10 flex items-center justify-center text-white font-black text-2xl"
              style={{ backgroundColor: game.accent || "#6366f1" }}
            >
              {game.title.slice(0, 2)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
