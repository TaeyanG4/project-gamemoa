import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { fetchDiscordGuildBySlug } from "../features/discord/discordGuildApi";
import type { DiscordGuildDto } from "@gamemoa/contracts";
import { ApiClientError } from "../lib/api/errors";

export default function DiscordServerSlugRoute() {
  const { slug } = useParams<{ slug: string }>();
  const [guild, setGuild] = useState<DiscordGuildDto | null>(null);
  const [isManager, setIsManager] = useState(false);
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
          <div className="text-4xl">🔒</div>
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

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-6 md:p-10 backdrop-blur-md shadow-2xl">
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

      {/* Phase H Preview Banner */}
      <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/60 via-purple-950/60 to-slate-900/60 p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">🚀</span>
          <div>
            <h2 className="text-sm font-bold text-indigo-200">서버 랭킹 및 활동 XP 기능 안내</h2>
            <p className="text-xs text-slate-400">
              서버별 랭킹 및 활동 XP는 다음 단계(Phase H)에서 제공됩니다.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 pt-2">
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-2 opacity-60">
            <div className="text-xs font-bold text-slate-400">🎮 게임별 랭킹 (Game Ranking)</div>
            <div className="text-xs text-slate-500">이 서버 멤버들의 최고 스코어 리더보드</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-2 opacity-60">
            <div className="text-xs font-bold text-slate-400">⚡ 서버 총 XP (Server XP)</div>
            <div className="text-xs text-slate-500">서버 활동으로 누적되는 총 진행도</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-2 opacity-60">
            <div className="text-xs font-bold text-slate-400">📅 주간 XP (Weekly XP)</div>
            <div className="text-xs text-slate-500">주간 활성 멤버 활동 순위</div>
          </div>
        </div>
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
