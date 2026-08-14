import { Link } from "react-router";
import { ChevronRight, Clock } from "lucide-react";
import type { GameManifest } from "@owogg/game-sdk";
import { useI18n } from "../../features/i18n/I18nContext";
import type { Dictionary } from "../../features/i18n/dictionary";
import { getLocalizedGameContent } from "../../features/catalog/localizedGameContent";

/** Shared compact "game + info row" card. Extracted from the old combined profile page when
 * favorites/recent-plays moved onto the unified profile page (/users/:id) while account
 * settings stayed behind at /settings — both sides render these same rows. */
export function GameLinkCard({
  game,
  children,
}: {
  game: GameManifest;
  children: React.ReactNode;
}) {
  const { dict } = useI18n();
  const accent = game.accent ?? "#6366f1";
  const title = getLocalizedGameContent(dict, game).title;

  return (
    <Link
      to={`/games/${game.slug}`}
      className="group flex items-center gap-4 p-4 rounded-2xl bg-surface-raised border border-border hover:border-brand/50 transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
        style={{
          background: `radial-gradient(circle at center, ${accent}30 0%, rgba(15, 19, 31, 0.9) 100%)`,
        }}
      >
        <img
          src={game.thumbnail}
          alt={title}
          className="w-9 h-9 object-contain transform group-hover:scale-110 transition-transform duration-300"
        />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm text-text-primary group-hover:text-brand transition-colors truncate">
          {title}
        </h3>
        {children}
      </div>

      <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-brand group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}

export function GameFavoriteCard({ game }: { game: GameManifest }) {
  const { dict } = useI18n();
  const shortDescription = getLocalizedGameContent(dict, game).shortDescription;

  return (
    <GameLinkCard game={game}>
      <p className="text-xs text-text-secondary line-clamp-1 mt-1">{shortDescription}</p>
    </GameLinkCard>
  );
}

export function formatRelativeTime(iso: string, dict: Dictionary["profile"]): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMin = Math.floor((Date.now() - then) / 60000);
  if (diffMin < 1) return dict.justNow;
  if (diffMin < 60) return `${diffMin}${dict.minutesAgoSuffix}`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}${dict.hoursAgoSuffix}`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}${dict.daysAgoSuffix}`;
  return iso.split("T")[0] ?? iso;
}

export function GameActivityCard({
  game,
  lastPlayedAt,
}: {
  game: GameManifest;
  lastPlayedAt: string;
}) {
  const { dict } = useI18n();
  return (
    <GameLinkCard game={game}>
      <p className="flex items-center gap-1 text-xs text-text-muted mt-1">
        <Clock className="w-3 h-3 shrink-0" />
        {formatRelativeTime(lastPlayedAt, dict.profile)}
      </p>
    </GameLinkCard>
  );
}
