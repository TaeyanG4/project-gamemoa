import { useState, useEffect, useTransition } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import {
  searchDiscordGuilds,
  fetchRegistrationCandidates,
  registerDiscordGuild,
  getDiscordRegisterAuthUrl,
} from "../features/discord/discordGuildApi";
import type { DiscordGuildDto, DiscordCandidateGuildDto } from "@gamemoa/contracts";

export default function DiscordServersRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();

  const queryParam = searchParams.get("q") || "";
  const tokenParam = searchParams.get("register_token") || "";
  const registerStatusParam = searchParams.get("register_status") || "";

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [guilds, setGuilds] = useState<DiscordGuildDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Registration Modal State
  const [candidates, setCandidates] = useState<DiscordCandidateGuildDto[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<DiscordCandidateGuildDto | null>(null);
  const [customSlug, setCustomSlug] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "UNLISTED" | "PRIVATE">("PUBLIC");
  const [description, setDescription] = useState("");
  const [regError, setRegError] = useState<string | null>(null);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regSuccessGuild, setRegSuccessGuild] = useState<DiscordGuildDto | null>(null);

  // Fetch public directory search
  useEffect(() => {
    setLoading(true);
    searchDiscordGuilds(queryParam, 20, 0)
      .then((res) => {
        setGuilds(res.guilds);
        setTotal(res.total);
      })
      .catch((err) => {
        console.error("Search failed:", err);
        setGuilds([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [queryParam]);

  // Load registration candidates if token present
  useEffect(() => {
    if (tokenParam) {
      fetchRegistrationCandidates(tokenParam)
        .then((res) => {
          if (res.valid && res.candidates.length > 0) {
            setCandidates(res.candidates);
            setSelectedCandidate(res.candidates[0] ?? null);
          } else {
            setRegError(
              "등록 가능한 서버 목록을 불러올 수 없습니다. 만료되었거나 이미 사용된 토큰입니다.",
            );
          }
        })
        .catch((err) => {
          setRegError(err instanceof Error ? err.message : "서버 목록 조회 실패");
        });
    }
  }, [tokenParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchQuery.trim()) {
      newParams.set("q", searchQuery.trim());
    } else {
      newParams.delete("q");
    }
    setSearchParams(newParams);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate || !tokenParam) return;

    setRegSubmitting(true);
    setRegError(null);

    try {
      const res = await registerDiscordGuild({
        token: tokenParam,
        guildId: selectedCandidate.guildId,
        slug: customSlug.trim() ? customSlug.trim() : undefined,
        description: description.trim() ? description.trim() : undefined,
        visibility,
      });

      setRegSuccessGuild(res.guild);
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "서버 등록 실패");
    } finally {
      setRegSubmitting(false);
    }
  };

  const closeRegistrationModal = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("register_token");
    newParams.delete("register_status");
    setSearchParams(newParams);
    setCandidates([]);
    setSelectedCandidate(null);
    setRegSuccessGuild(null);
    setRegError(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Search Header Banner */}
      <div className="rounded-3xl bg-slate-900/80 border border-white/10 p-6 md:p-8 backdrop-blur-md space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              🔍 Discord 서버 디렉토리
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              GAMEMOA에 등록된 Discord 커뮤니티 서버를 탐색하거나 내 서버를 새로 등록하세요.
            </p>
          </div>

          <a
            href={getDiscordRegisterAuthUrl()}
            id="register-server-button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 active:scale-95 transition-all"
          >
            <span>🏰 내 서버 등록하기</span>
          </a>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              id="server-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="서버 이름 또는 vanity slug 검색..."
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-slate-800 px-6 py-3 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            검색
          </button>
        </form>
      </div>

      {/* Notifications from OAuth redirect */}
      {registerStatusParam && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 flex items-center justify-between">
          <span>
            {registerStatusParam === "no_guilds"
              ? "관리자(MANAGE_GUILD) 권한을 가진 Discord 서버를 찾을 수 없습니다."
              : registerStatusParam === "unauthorized"
                ? "서버 등록을 위해 로그인이 필요합니다."
                : "Discord 인증 중 오류가 발생했습니다. 다시 시도해 주세요."}
          </span>
          <button
            onClick={() => {
              const newParams = new URLSearchParams(searchParams);
              newParams.delete("register_status");
              setSearchParams(newParams);
            }}
            className="text-amber-400 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Registration Candidate Modal */}
      {(tokenParam || candidates.length > 0) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🏰 Discord 서버 등록</span>
              </h2>
              <button
                onClick={closeRegistrationModal}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {regSuccessGuild ? (
              <div className="space-y-4 text-center py-4">
                <div className="text-4xl">🎉</div>
                <h3 className="text-lg font-bold text-white">서버가 성공적으로 등록되었습니다!</h3>
                <p className="text-xs text-slate-300">
                  <span className="font-semibold text-indigo-300">{regSuccessGuild.name}</span>{" "}
                  (/discord/servers/{regSuccessGuild.slug})
                </p>
                <div className="pt-4 flex gap-3">
                  <Link
                    to={`/discord/servers/${regSuccessGuild.slug}`}
                    onClick={closeRegistrationModal}
                    className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    공개 페이지 보기
                  </Link>
                  <Link
                    to={`/discord/servers/${regSuccessGuild.slug}/manage`}
                    onClick={closeRegistrationModal}
                    className="flex-1 rounded-xl border border-white/20 bg-white/10 py-2.5 text-xs font-semibold text-white hover:bg-white/20"
                  >
                    서버 관리하기
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-5">
                {regError && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                    {regError}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">
                    1. 등록할 서버 선택 (관리 중인 길드)
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {candidates.map((c) => (
                      <div
                        key={c.guildId}
                        onClick={() => setSelectedCandidate(c)}
                        className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                          selectedCandidate?.guildId === c.guildId
                            ? "border-indigo-500 bg-indigo-500/20 text-white"
                            : "border-white/10 bg-slate-950/40 text-slate-300 hover:border-white/20"
                        }`}
                      >
                        {c.iconUrl ? (
                          <img
                            src={c.iconUrl}
                            alt={c.name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/40 font-bold text-indigo-200">
                            {c.name.charAt(0)}
                          </div>
                        )}
                        <div className="font-semibold text-sm truncate">{c.name}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">
                    2. Vanity Slug 주소 설정 (옵션)
                  </label>
                  <div className="flex items-center rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
                    <span>/discord/servers/</span>
                    <input
                      type="text"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value)}
                      placeholder="자동 생성 (영문 소문자, 숫자, -)"
                      className="ml-1 flex-1 bg-transparent text-white placeholder-slate-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">3. 가시성 선택</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["PUBLIC", "UNLISTED", "PRIVATE"] as const).map((v) => (
                      <button
                        type="button"
                        key={v}
                        onClick={() => setVisibility(v)}
                        className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                          visibility === v
                            ? "border-indigo-500 bg-indigo-600 text-white"
                            : "border-white/10 bg-slate-950/40 text-slate-400 hover:text-white"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={closeRegistrationModal}
                    className="flex-1 rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={regSubmitting || !selectedCandidate}
                    className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {regSubmitting ? "등록 중..." : "서버 등록 완료"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Directory Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>총 {total}개의 공개 서버가 등록되어 있습니다.</span>
          {queryParam && <span>검색어: "{queryParam}"</span>}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-12 text-center text-sm text-slate-400">
            서버 목록을 불러오는 중...
          </div>
        ) : guilds.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-12 text-center space-y-3">
            <div className="text-3xl">🔍</div>
            <p className="text-sm font-semibold text-slate-300">
              검색 조건에 맞는 공개 서버가 없습니다.
            </p>
            <p className="text-xs text-slate-400">
              다른 검색어로 찾아보거나 새로운 서버를 등록해보세요.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {guilds.map((guild) => (
              <Link
                key={guild.guildId}
                to={`/discord/servers/${guild.slug}`}
                className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm transition-all hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-0.5"
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

                  {guild.description && (
                    <p className="line-clamp-2 text-xs text-slate-300/80 leading-relaxed">
                      {guild.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/5 text-[11px] text-slate-400">
                  <span>GAMEMOA 서버</span>
                  <span className="text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform">
                    페이지 보기 →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
