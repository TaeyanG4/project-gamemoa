import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  fetchMyManagedGuilds,
  getDiscordRegisterAuthUrl,
} from "../features/discord/discordGuildApi";
import type { DiscordGuildDto } from "@gamemoa/contracts";

export default function DiscordHubRoute() {
  const [managedGuilds, setManagedGuilds] = useState<DiscordGuildDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetchMyManagedGuilds()
      .then((res) => {
        setManagedGuilds(res.guilds);
        setIsLoggedIn(true);
      })
      .catch(() => {
        setIsLoggedIn(false);
        setManagedGuilds([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 p-8 md:p-12 shadow-2xl border border-indigo-500/20">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-300 backdrop-blur-md">
            <span>🎮 GAMEMOA × Discord</span>
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            <span>Community Hub</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
            친구들과 게임 기록을 <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              경쟁하고 소통하세요
            </span>
          </h1>

          <p className="text-sm leading-relaxed text-indigo-100/80 md:text-base">
            GAMEMOA Discord Bot을 내 서버에 등록하고 커뮤니티 전용 리더보드와 서버 전용 페이지를
            구축하세요.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              to="/discord/servers"
              id="discord-hub-search-cta"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/40 active:scale-95"
            >
              🔍 서버 검색
            </Link>
            <a
              href={getDiscordRegisterAuthUrl()}
              id="discord-hub-register-cta"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
            >
              ⚡ 내 서버 등록 (관리자 권한)
            </a>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-8 md:grid-cols-3">
        {/* Managed Servers Column */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🛡️ 내가 관리하는 등록 서버</span>
              {managedGuilds.length > 0 && (
                <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs text-indigo-300 font-semibold">
                  {managedGuilds.length}
                </span>
              )}
            </h2>
            <Link
              to="/discord/servers"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              전체 탐색 →
            </Link>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
              서버 목록 불러오는 중...
            </div>
          ) : managedGuilds.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-8 text-center space-y-4">
              <div className="text-3xl">🏰</div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">
                  {isLoggedIn ? "관리 중인 등록 서버가 없습니다" : "로그인이 필요합니다"}
                </p>
                <p className="text-xs text-slate-400">
                  Discord 관리자 권한이 있는 서버를 GAMEMOA에 등록하여 커뮤니티를 시작해보세요.
                </p>
              </div>
              <div>
                <a
                  href={getDiscordRegisterAuthUrl()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/80 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-all"
                >
                  서버 등록 시작하기
                </a>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {managedGuilds.map((guild) => (
                <div
                  key={guild.guildId}
                  className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm transition-all hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {guild.iconUrl ? (
                        <img
                          src={guild.iconUrl}
                          alt={guild.name}
                          className="h-12 w-12 rounded-xl object-cover border border-white/10"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/30 border border-indigo-400/20 text-lg font-bold text-indigo-300">
                          {guild.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {guild.name}
                        </h3>
                        <p className="truncate text-xs text-slate-400 font-mono">
                          /discord/servers/{guild.slug}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          guild.visibility === "PUBLIC"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : guild.visibility === "UNLISTED"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        {guild.visibility}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        등록일: {guild.registeredAt.slice(0, 10)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2 pt-3 border-t border-white/5">
                    <Link
                      to={`/discord/servers/${guild.slug}`}
                      className="flex-1 rounded-lg bg-white/5 px-3 py-1.5 text-center text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                    >
                      공개 페이지
                    </Link>
                    <Link
                      to={`/discord/servers/${guild.slug}/manage`}
                      className="flex-1 rounded-lg bg-indigo-600/30 px-3 py-1.5 text-center text-xs font-medium text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/50 hover:text-white transition-all"
                    >
                      서버 관리
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Status & Features */}
        <div className="space-y-6">
          {/* Quick Guide Card */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>📌 이용 안내</span>
            </h3>
            <ul className="space-y-3 text-xs leading-relaxed text-slate-300">
              <li className="flex gap-2">
                <span className="text-indigo-400 font-bold">1.</span>
                <span>서버 등록은 Discord 관리자(MANAGE_GUILD) 권한을 가진 유저만 가능합니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-400 font-bold">2.</span>
                <span>공개(PUBLIC) 등록 시 GAMEMOA 디렉토리 및 검색에 노출됩니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-400 font-bold">3.</span>
                <span>서버별 랭킹 및 XP 수집 기능은 Phase H에서 출시될 예정입니다.</span>
              </li>
            </ul>
          </div>

          {/* Account Link Card */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🔗 Discord 계정 연동</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              GAMEMOA 계정과 Discord 계정을 연동하면 봇 커맨드(/gamemoa profile)에서 본인 정보를
              확인할 수 있습니다.
            </p>
            <Link
              to="/discord/link"
              className="block w-full rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-center text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 hover:text-white transition-all"
            >
              계정 연동 페이지 이동
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
