import { Link } from "react-router";
import { Clock, Play, Sparkles } from "lucide-react";

interface GameCardProps {
  slug: string;
  title: string;
  shortDescription: string;
  modes: readonly string[];
  thumbnail: string;
  accent?: string | undefined;
  estimatedRoundSeconds?: number | undefined;
}

export function GameCard({
  slug,
  title,
  shortDescription,
  modes,
  thumbnail,
  accent = "#6366f1",
  estimatedRoundSeconds,
}: GameCardProps) {
  return (
    <Link 
      to={`/games/${slug}`}
      className="group relative flex flex-col bg-surface-raised rounded-2xl overflow-hidden border border-border/80 hover:border-brand/50 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-brand/10 select-none block"
    >
      {/* Thumbnail Aspect 16:9 */}
      <div 
        className="w-full aspect-[16/10] relative flex items-center justify-center p-6 overflow-hidden bg-surface-overlay"
        style={{
          background: `radial-gradient(circle at center, ${accent}25 0%, rgba(15, 19, 31, 0.95) 100%)`
        }}
      >
        {/* Top Badges */}
        <div className="absolute top-3 left-3 z-10 flex gap-1.5">
          {modes.slice(0, 2).map((mode) => (
            <span 
              key={mode} 
              className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-md border border-white/10 tracking-wider"
            >
              {mode}
            </span>
          ))}
        </div>

        {/* Thumbnail Visual */}
        {thumbnail.startsWith("/") || thumbnail.startsWith("http") ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-24 h-24 object-contain rounded-2xl shadow-xl transform group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div 
            className="w-24 h-24 rounded-2xl shadow-xl transform group-hover:scale-110 transition-transform duration-300 flex items-center justify-center text-white font-extrabold text-xl"
            style={{ backgroundColor: accent }}
          >
            {title.slice(0, 2)}
          </div>
        )}

        {/* Hover Play Action Overlay */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-20">
          <div className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center shadow-lg shadow-brand/40 transform scale-75 group-hover:scale-100 transition-transform duration-200">
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </div>
        </div>
      </div>
      
      {/* Content Info */}
      <div className="p-4 flex flex-col flex-1 gap-1.5 bg-surface-raised">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-base text-text-primary group-hover:text-brand transition-colors line-clamp-1">
            {title}
          </h3>
          <Sparkles className="w-4 h-4 text-brand-light opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>

        <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed flex-1">
          {shortDescription}
        </p>
        
        {estimatedRoundSeconds && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted mt-2 pt-2 border-t border-border/40">
            <Clock className="w-3 h-3 text-brand-light" />
            <span>약 {Math.round(estimatedRoundSeconds)}초 소요</span>
          </div>
        )}
      </div>
    </Link>
  );
}
