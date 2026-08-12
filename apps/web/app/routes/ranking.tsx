import { useState, useEffect, useMemo } from "react";
import { Trophy, Medal } from "lucide-react";
import { MOCK_LEADERBOARD, fetchLeaderboardApi } from "../features/scores/api";
import type { LeaderRecord } from "@gamemoa/shared";
import { gameManifests } from "../features/catalog/registry";

function filterLeaderboard(records: LeaderRecord[], gameId?: string): LeaderRecord[] {
  if (!gameId || gameId === "all") return records;
  return records.filter((rec) => rec.gameId === gameId);
}

export function meta() {
  return [
    { title: "명예의 전당 (랭킹) | gamemoa" },
    { name: "description", content: "최고 기록 랭킹과 유저 기록을 확인하세요." },
  ];
}

export default function Ranking() {
  const [selectedGameId, setSelectedGameId] = useState<string>("all");
  const [apiRecords, setApiRecords] = useState<LeaderRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    async function loadData() {
      const records = await fetchLeaderboardApi(selectedGameId);
      if (isMounted) {
        if (records.length > 0) {
          setApiRecords(records);
        } else {
          setApiRecords(null);
        }
        setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [selectedGameId]);

  const displayRecords = useMemo(() => {
    if (apiRecords && apiRecords.length > 0) {
      return apiRecords;
    }
    return filterLeaderboard(MOCK_LEADERBOARD, selectedGameId);
  }, [apiRecords, selectedGameId]);

  return (
    <div className="flex flex-col w-full px-4 md:px-8 py-8 gap-8 max-w-7xl mx-auto flex-1 select-none">
      {/* Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 text-accent-yellow font-bold text-xs uppercase tracking-wider mb-1">
            <Trophy className="w-4 h-4" />
            <span>Leaderboard & High Scores</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-text-primary">명예의 전당</h1>
          <p className="text-sm text-text-secondary mt-1">
            최고의 반응속도와 두뇌 회전 기록에 도전한 유저들의 실시간 랭킹입니다.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 border-b border-border/40">
        <button
          onClick={() => setSelectedGameId("all")}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer border ${
            selectedGameId === "all"
              ? "bg-brand text-white border-brand shadow-lg shadow-brand/25"
              : "bg-surface-raised text-text-secondary border-border/80 hover:text-text-primary"
          }`}
        >
          🏆 전체 랭킹
        </button>

        {gameManifests.map((game) => (
          <button
            key={game.slug}
            onClick={() => setSelectedGameId(game.slug)}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer border ${
              selectedGameId === game.slug
                ? "bg-brand text-white border-brand shadow-lg shadow-brand/25"
                : "bg-surface-raised text-text-secondary border-border/80 hover:text-text-primary"
            }`}
          >
            {game.title}
          </button>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="w-full bg-surface-raised rounded-3xl border border-border overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-sidebar border-b border-border text-xs font-extrabold text-text-muted uppercase tracking-wider">
                <th className="py-4 px-6">순위</th>
                <th className="py-4 px-6">플레이어</th>
                <th className="py-4 px-6">종목</th>
                <th className="py-4 px-6">기록</th>
                <th className="py-4 px-6">달성일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-sm font-medium text-text-primary">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-text-muted animate-pulse">
                    랭킹 정보를 불러오는 중...
                  </td>
                </tr>
              ) : (
                displayRecords.map((record, index) => {
                  const rank = index + 1;

                  return (
                    <tr key={record.id} className="hover:bg-surface-overlay/50 transition-colors">
                      {/* Rank Badge */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        {rank === 1 && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-black border border-amber-500/40 shadow-md">
                            <Medal className="w-4 h-4" /> 1위
                          </span>
                        )}
                        {rank === 2 && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-400/20 text-slate-300 font-bold border border-slate-400/40">
                            <Medal className="w-4 h-4" /> 2위
                          </span>
                        )}
                        {rank === 3 && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-700/20 text-amber-600 font-bold border border-amber-700/40">
                            <Medal className="w-4 h-4" /> 3위
                          </span>
                        )}
                        {rank > 3 && (
                          <span className="text-text-muted font-bold px-3">#{rank}</span>
                        )}
                      </td>

                      {/* Player Name */}
                      <td className="py-4 px-6 font-bold text-text-primary flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand/20 text-brand flex items-center justify-center font-black text-xs overflow-hidden">
                          {record.avatarUrl ? (
                            <img
                              src={record.avatarUrl}
                              alt={record.playerName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            record.playerName.slice(0, 2)
                          )}
                        </div>
                        <span>{record.playerName}</span>
                      </td>

                      {/* Game Title */}
                      <td className="py-4 px-6 text-text-secondary whitespace-nowrap">
                        {record.gameTitle}
                      </td>

                      {/* Score */}
                      <td className="py-4 px-6 font-black text-brand-light text-base whitespace-nowrap">
                        {record.formattedScore}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6 text-text-muted text-xs whitespace-nowrap">
                        {record.createdAt}
                      </td>
                    </tr>
                  );
                })
              )}

              {!isLoading && displayRecords.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-text-muted">
                    등록된 기록이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
