import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router";
import { ArrowLeft, Trophy, Medal, AlertCircle, RefreshCw } from "lucide-react";
import { fetchLeaderboardApi } from "../features/scores/api";
import { gameManifests } from "../features/catalog/registry";
import { getLocalizedGameContent } from "../features/catalog/localizedGameContent";
import { useI18n } from "../features/i18n/I18nContext";
import { GameThumbnail } from "../components/ui/GameThumbnail";
import type { LeaderRecord } from "@owogg/contracts";

export function meta() {
  return [
    { title: "게임별 순위 | OwOGG" },
    { name: "description", content: "게임별 리더보드를 확인하세요." },
  ];
}

type LeaderboardState = "loading" | "success" | "error";

/** Per-game ranking page — osu!-style: ranking recorded per game (like per-beatmap leaderboards)
 * rather than only living inside the single combined /ranking page's game filter. Games with
 * manifest.supportsLeaderboard === false skip this entirely (casual games where rank isn't
 * meaningful). */
export default function GameRankingRoute() {
  const params = useParams();
  const slug = params.slug ?? "";
  const { dict } = useI18n();

  const manifest = gameManifests.find((m) => m.slug === slug);
  const content = manifest ? getLocalizedGameContent(dict, manifest) : null;

  const [records, setRecords] = useState<LeaderRecord[]>([]);
  const [status, setStatus] = useState<LeaderboardState>("loading");

  const loadData = useCallback(async () => {
    if (!manifest) return;
    setStatus("loading");
    try {
      const data = await fetchLeaderboardApi(slug);
      setRecords(data);
      setStatus("success");
    } catch (err) {
      console.error("Failed to load game leaderboard:", err);
      setStatus("error");
    }
  }, [slug, manifest]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (!manifest) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center">
        <p className="text-text-muted">{dict.gamePlay.errorGameNotFound}</p>
      </div>
    );
  }

  if (!manifest.supportsLeaderboard) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center">
        <Trophy className="mx-auto mb-4 h-10 w-10 text-text-muted" />
        <h1 className="text-xl font-black text-text-primary">{dict.gameRanking.notSupported}</h1>
        <p className="mt-2 text-sm text-text-muted">{dict.gameRanking.notSupportedBody}</p>
        <Link
          to={`/games/${slug}`}
          className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-brand-light hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {dict.gameRanking.backToGame}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
      <Link
        to={`/games/${slug}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-brand-light"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {dict.gameRanking.backToGame}
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <GameThumbnail
          thumbnail={manifest.thumbnail}
          title={content?.title ?? manifest.title}
          accent={manifest.accent}
          className="h-12 w-12 shrink-0"
        />
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-brand-light">
            {dict.gameRanking.eyebrow}
          </p>
          <h1 className="text-2xl font-black text-text-primary md:text-3xl">{content?.title}</h1>
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-3xl border border-border bg-surface-raised shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-surface-sidebar text-xs font-extrabold uppercase tracking-wider text-text-muted">
                <th className="px-6 py-4">{dict.ranking.rankHeader}</th>
                <th className="px-6 py-4">{dict.ranking.playerHeader}</th>
                <th className="px-6 py-4">{dict.ranking.recordHeader}</th>
                <th className="px-6 py-4">{dict.ranking.dateHeader}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-sm font-medium text-text-primary">
              {status === "loading" && (
                <tr>
                  <td colSpan={4} className="animate-pulse py-16 text-center text-text-muted">
                    {dict.common.loading}
                  </td>
                </tr>
              )}

              {status === "error" && (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <AlertCircle className="h-8 w-8 text-accent-red" />
                      <button
                        onClick={() => void loadData()}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-2 text-xs font-bold transition-colors hover:bg-surface-overlay"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        {dict.ranking.retryButton}
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {status === "success" &&
                (records.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-text-muted">
                      {dict.gamePlay.leaderboardEmpty}
                    </td>
                  </tr>
                ) : (
                  records.map((record, index) => {
                    const rank = index + 1;
                    return (
                      <tr key={record.id} className="transition-colors hover:bg-surface-overlay/50">
                        <td className="whitespace-nowrap px-6 py-4">
                          {rank === 1 && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1 font-black text-amber-400 shadow-md">
                              <Medal className="h-4 w-4" /> {dict.ranking.rank1}
                            </span>
                          )}
                          {rank === 2 && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-400/40 bg-slate-400/20 px-3 py-1 font-bold text-slate-300">
                              <Medal className="h-4 w-4" /> {dict.ranking.rank2}
                            </span>
                          )}
                          {rank === 3 && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-700/40 bg-amber-700/20 px-3 py-1 font-bold text-amber-600">
                              <Medal className="h-4 w-4" /> {dict.ranking.rank3}
                            </span>
                          )}
                          {rank > 3 && (
                            <span className="px-3 font-bold text-text-muted">#{rank}</span>
                          )}
                        </td>
                        <td className="flex items-center gap-2 px-6 py-4 font-bold text-text-primary">
                          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-brand/20 text-xs font-black text-brand">
                            {record.avatarUrl ? (
                              <img
                                src={record.avatarUrl}
                                alt={record.playerName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              record.playerName.slice(0, 2)
                            )}
                          </div>
                          <span>{record.playerName}</span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-base font-black text-brand-light">
                          {record.formattedScore}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-xs text-text-muted">
                          {record.createdAt}
                        </td>
                      </tr>
                    );
                  })
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
