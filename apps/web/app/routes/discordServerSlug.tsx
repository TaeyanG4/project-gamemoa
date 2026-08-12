import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import {
  fetchDiscordGuildBySlug,
  fetchGuildXpLeaderboard,
  fetchGuildServerGameLeaderboard,
} from "../features/discord/discordGuildApi";
import type {
  DiscordGuildDto,
  GuildSummaryDto,
  GuildXpLeaderboardEntryDto,
  ServerGameLeaderboardEntryDto,
} from "@gamemoa/contracts";
import { GAME_MANIFESTS } from "@gamemoa/core";

import { ApiClientError } from "../lib/api/errors";
import { Trophy, Zap, Calendar, Users, Gamepad2, Lock } from "lucide-react";

type ServerTab = "alltime" | "weekly" | "games";

export default function DiscordServerSlugRoute() {
  const { slug } = useParams<{ slug: string }>();
  const [guild, setGuild] = useState<DiscordGuildDto | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [summary, setSummary] = useState<GuildSummaryDto | null>(null);
  const [topAllTime, setTopAllTime] = useState<GuildXpLeaderboardEntryDto[]>([]);
  const [topWeekly, setTopWeekly] = useState<GuildXpLeaderboardEntryDto[]>([]);

  const [activeTab, setActiveTab] = useState<ServerTab>("alltime");
  const [selectedGameId, setSelectedGameId] = useState<string>(
    GAME_MANIFESTS[0]?.id ?? "reaction-time",
  );
  const [gameLeaderboard, setGameLeaderboard] = useState<ServerGameLeaderboardEntryDto[]>([]);
  const [loadingGameScores, setLoadingGameScores] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code?: string; message: string; status?: number } | null>(
    null,
  );

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    fetchDiscordGuildBySlug(slug)
      .then((res) => {
        setGuild(res.guild);
        setIsManager(res.isManager);
        setSummary(res.summary ?? { totalXp: 0, weeklyXp: 0, participantCount: 0 });
        setTopAllTime(res.topAllTime ?? []);
        setTopWeekly(res.topWeekly ?? []);
      })
      .catch((err) => {
        if (err instanceof ApiClientError) {
          const errObj: { code?: string; message: string; status?: number } = {
            message: err.detail || err.message,
          };
          if (err.code !== undefined) errObj.code = err.code;
          if (err.status !== undefined) errObj.status = err.status;
          setError(errObj);
        } else {
          setError({
            message: err instanceof Error ? err.message : "서버 정보를 불러올 수 없습니다.",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  // Fetch Game Scores when game tab or selected game changes
  useEffect(() => {
    if (!slug || activeTab !== "games") return;
    setLoadingGameScores(true);

    fetchGuildServerGameLeaderboard(slug, selectedGameId)
      .then((res) => {
        setGameLeaderboard(res.leaderboard);
      })
      .catch(() => {
        setGameLeaderboard([]);
      })
      .finally(() => setLoadingGameScores(false));
  }, [slug, activeTab, selectedGameId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-slate-400">
        서버 정보를 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
        <div className="rounded-3xl border border-rose-500/20 bg-slate-900/80 p-8 md:p-12 backdrop-blur-md space-y-4">
          <div className="text-4xl">
            <Lock className="mx-auto h-12 w-12 text-rose-400" />
          </div>
          <h1 className="text-xl font-bold text-white">
            {error.status === 403 ? "비공개(PRIVATE) 서버" : "서버를 찾을 수 없습니다"}
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
            {error.status === 403
              ? "이 서버는 PRIVATE 가시성으로 설정되어 있으며, 권한을 가진 관리자만 접근할 수 있습니다."
              : error.message}
          </p>
          <div className="pt-4">
            <Link
              to="/discord/servers"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
            >
              ← 디렉토리로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!guild) return null;

  const currentManifest = GAME_MANIFESTS.find((m) => m.id === selectedGameId);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-6 md:p-8 backdrop-blur-md shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {guild.iconUrl ? (
              <img
                src={guild.iconUrl}
                alt={guild.name}
                className="h-16 w-16 md:h-20 md:w-20 rounded-2xl object-cover border-2 border-white/10 shadow-lg"
              />
            ) : (
              <div className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-2xl bg-indigo-600/40 border-2 border-indigo-400/30 text-2xl font-bold text-indigo-200">
                {guild.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white">{guild.name}</h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    guild.visibility === "PUBLIC"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : guild.visibility === "UNLISTED"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {guild.visibility}
                </span>
              </div>
              <p className="text-xs font-mono text-indigo-400">/discord/servers/{guild.slug}</p>
            </div>
          </div>

          {isManager && (
            <Link
              to={`/discord/servers/${guild.slug}/manage`}
              id="manage-server-button"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/20 px-5 py-2.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30 hover:text-white transition-all"
            >
              ⚙️ 서버 관리
            </Link>
          )}
        </div>

        {guild.description && (
          <div className="mt-6 pt-4 border-t border-white/10 text-xs md:text-sm text-slate-300 leading-relaxed">
            {guild.description}
          </div>
        )}
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Users className="h-4 w-4 text-indigo-400" />
            <span>GAMEMOA 참여 멤버</span>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {(summary?.participantCount ?? 0).toLocaleString()}명
          </div>
          <div className="text-[11px] text-slate-500">기여한 실적 유저 수</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Zap className="h-4 w-4 text-amber-400" />
            <span>서버 총 누적 XP</span>
          </div>
          <div className="text-2xl font-extrabold text-amber-300">
            {(summary?.totalXp ?? 0).toLocaleString()} XP
          </div>
          <div className="text-[11px] text-slate-500">모든 게임 활동 합산</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Calendar className="h-4 w-4 text-purple-400" />
            <span>이번 주 서버 XP</span>
          </div>
          <div className="text-2xl font-extrabold text-purple-300">
            {(summary?.weeklyXp ?? 0).toLocaleString()} XP
          </div>
          <div className="text-[11px] text-slate-500">월요일 00:00 KST 기준</div>
        </div>
      </div>

      {/* Leaderboard Section & Tabs */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-extrabold text-white">서버 리더보드</h2>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-slate-950 p-1 border border-white/10">
            <button
              onClick={() => setActiveTab("alltime")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "alltime"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ⚡ 서버 XP
            </button>
            <button
              onClick={() => setActiveTab("weekly")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "weekly"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📅 주간 XP
            </button>
            <button
              onClick={() => setActiveTab("games")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "games"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🎮 게임별 기록
            </button>
          </div>
        </div>

        {/* Tab 1: All-time Server XP */}
        {activeTab === "alltime" && (
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
            {topAllTime.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="text-3xl">🎮</div>
                <p className="text-sm font-semibold text-slate-300">
                  아직 이 서버에 누적된 XP가 없습니다
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Discord 채널에서 <code className="text-indigo-300 font-mono">/gamemoa play</code>{" "}
                  명령어를 실행하여 게임에 기여해보세요!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {topAllTime.map((entry) => (
                  <div
                    key={entry.userId}
                    className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/5"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                          entry.rank === 1
                            ? "bg-amber-400 text-slate-950"
                            : entry.rank === 2
                              ? "bg-slate-300 text-slate-950"
                              : entry.rank === 3
                                ? "bg-amber-700 text-white"
                                : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        #{entry.rank}
                      </span>

                      {entry.avatarUrl ? (
                        <img
                          src={entry.avatarUrl}
                          alt={entry.nickname}
                          className="h-9 w-9 rounded-full object-cover border border-white/10"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/40 text-xs font-bold text-indigo-200">
                          {entry.nickname.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <span className="text-sm font-semibold text-white">{entry.nickname}</span>
                    </div>

                    <div className="text-sm font-extrabold text-amber-300">
                      {entry.xp.toLocaleString()} XP
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Weekly Server XP */}
        {activeTab === "weekly" && (
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
            {topWeekly.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="text-3xl">📅</div>
                <p className="text-sm font-semibold text-slate-300">
                  이번 주 이 서버에 누적된 XP가 없습니다
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  월요일 00:00 KST 이후 첫 플레이를 시작하여 주간 랭크를 차지해보세요!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {topWeekly.map((entry) => (
                  <div
                    key={entry.userId}
                    className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/5"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                          entry.rank === 1
                            ? "bg-purple-400 text-slate-950"
                            : entry.rank === 2
                              ? "bg-slate-300 text-slate-950"
                              : entry.rank === 3
                                ? "bg-purple-700 text-white"
                                : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        #{entry.rank}
                      </span>

                      {entry.avatarUrl ? (
                        <img
                          src={entry.avatarUrl}
                          alt={entry.nickname}
                          className="h-9 w-9 rounded-full object-cover border border-white/10"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-600/40 text-xs font-bold text-purple-200">
                          {entry.nickname.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <span className="text-sm font-semibold text-white">{entry.nickname}</span>
                    </div>

                    <div className="text-sm font-extrabold text-purple-300">
                      {entry.xp.toLocaleString()} XP
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Canonical Game Scores for Server Participants */}
        {activeTab === "games" && (
          <div className="space-y-4">
            {/* Game Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {GAME_MANIFESTS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGameId(g.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedGameId === g.id
                      ? "bg-indigo-600 text-white border border-indigo-400/40 shadow-lg"
                      : "bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Gamepad2 className="h-3.5 w-3.5" />
                  <span>{g.title}</span>
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
              {loadingGameScores ? (
                <div className="p-12 text-center text-xs text-slate-400">게임을 불러오는 중...</div>
              ) : gameLeaderboard.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="text-3xl">🎯</div>
                  <p className="text-sm font-semibold text-slate-300">
                    **{currentManifest?.title}** 에 기록된 서버 멤버 스코어가 없습니다
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Discord 채널에서{" "}
                    <code className="text-indigo-300 font-mono">
                      /gamemoa play game:{selectedGameId}
                    </code>{" "}
                    명령어로 도전해보세요!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {gameLeaderboard.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/5"
                    >
                      <div className="flex items-center gap-4">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-slate-400">
                          #{idx + 1}
                        </span>

                        {entry.avatarUrl ? (
                          <img
                            src={entry.avatarUrl}
                            alt={entry.nickname}
                            className="h-9 w-9 rounded-full object-cover border border-white/10"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/40 text-xs font-bold text-indigo-200">
                            {entry.nickname.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div>
                          <div className="text-sm font-semibold text-white font-mono">
                            {entry.nickname}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {entry.createdAt.slice(0, 10)}
                          </div>
                        </div>
                      </div>

                      <div className="text-sm font-extrabold text-indigo-300 font-mono">
                        {entry.score.toLocaleString()}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          {currentManifest?.scoreConfig?.unit ?? "pts"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Metadata Info Card */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm space-y-3">
        <h3 className="text-sm font-bold text-white">GAMEMOA 서버 정보</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-slate-400">Discord Guild ID</div>
            <div className="font-mono text-slate-200 mt-1 truncate">{guild.guildId}</div>
          </div>
          <div>
            <div className="text-slate-400">등록일</div>
            <div className="text-slate-200 mt-1">{guild.registeredAt.slice(0, 10)}</div>
          </div>
          <div>
            <div className="text-slate-400">상태</div>
            <div className="text-emerald-400 font-semibold mt-1">{guild.registrationStatus}</div>
          </div>
          <div>
            <div className="text-slate-400">가시성</div>
            <div className="text-indigo-300 font-semibold mt-1">{guild.visibility}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
