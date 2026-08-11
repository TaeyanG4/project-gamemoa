import { Link } from "react-router";
import { Clock } from "lucide-react";

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
      className="group flex flex-col bg-surface-raised rounded-2xl overflow-hidden border border-border/50 hover:border-border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 block"
    >
      <div 
        className="w-full aspect-[4/3] relative flex items-center justify-center p-6 overflow-hidden bg-surface-overlay"
        style={{
          background: `linear-gradient(135deg, ${accent}22 0%, ${accent}05 100%)`
        }}
      >
        <div className="absolute top-3 left-3 flex gap-2">
          {modes.map(mode => (
            <span 
              key={mode} 
              className="text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-md bg-black/40 text-white backdrop-blur-sm"
            >
              {mode}
            </span>
          ))}
        </div>
        
        {thumbnail.startsWith("/") || thumbnail.startsWith("http") ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-20 h-20 rounded-xl shadow-lg object-cover transform group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div 
            className="w-20 h-20 rounded-xl shadow-lg transform group-hover:scale-110 transition-transform duration-300"
            style={{ backgroundColor: accent }}
          />
        )}
      </div>
      
      <div className="p-5 flex flex-col flex-1 gap-2">
        <h3 className="font-bold text-lg text-text-primary leading-tight group-hover:text-brand transition-colors">
          {title}
        </h3>
        <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed flex-1">
          {shortDescription}
        </p>
        
        {estimatedRoundSeconds && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted mt-2">
            <Clock className="w-3.5 h-3.5" />
            <span>약 {Math.round(estimatedRoundSeconds)}초 소요</span>
          </div>
        )}
      </div>
    </Link>
  );
}
