import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  fetchDiscordGuildBySlug,
  updateDiscordGuild,
  unregisterDiscordGuild,
} from "../features/discord/discordGuildApi";
import type { DiscordGuildDto, DiscordGuildVisibility } from "@gamemoa/contracts";

export default function DiscordServerManageRoute() {
  const { slug: currentSlug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [guild, setGuild] = useState<DiscordGuildDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [slugInput, setSlugInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [visibilityInput, setVisibilityInput] = useState<DiscordGuildVisibility>("PUBLIC");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Unregister modal
  const [showUnregisterModal, setShowUnregisterModal] = useState(false);
  const [unregistering, setUnregistering] = useState(false);

  useEffect(() => {
    if (!currentSlug) return;
    setLoading(true);

    fetchDiscordGuildBySlug(currentSlug)
      .then((res) => {
        if (!res.isManager) {
          setError(
            "이 서버를 관리할 권한이 없습니다. Discord 관리자 계정으로 로그인되어 있는지 확인하세요.",
          );
          return;
        }
        setGuild(res.guild);
        setSlugInput(res.guild.slug);
        setDescriptionInput(res.guild.description || "");
        setVisibilityInput(res.guild.visibility);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "서버 정보를 불러올 수 없습니다.");
      })
      .finally(() => setLoading(false));
  }, [currentSlug]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guild || !currentSlug) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await updateDiscordGuild(currentSlug, {
        slug: slugInput.trim() !== guild.slug ? slugInput.trim() : undefined,
        description: descriptionInput.trim() ? descriptionInput.trim() : null,
        visibility: visibilityInput,
      });

      setGuild(res.guild);
      setSaveSuccess(true);
      if (res.guild.slug !== currentSlug) {
        navigate(`/discord/servers/${res.guild.slug}/manage`, { replace: true });
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "설정 저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleUnregister = async () => {
    if (!guild || !currentSlug) return;
    setUnregistering(true);

    try {
      await unregisterDiscordGuild(currentSlug);
      navigate("/discord/servers", { replace: true });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "서버 해제 실패");
      setShowUnregisterModal(false);
    } finally {
      setUnregistering(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-slate-400">
        서버 관리 정보를 불러오는 중...
      </div>
    );
  }

  if (error || !guild) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <div className="rounded-3xl border border-rose-500/20 bg-slate-900/80 p-8 backdrop-blur-md space-y-4">
          <div className="text-3xl">🚫</div>
          <h1 className="text-lg font-bold text-white">접근 권한 없음</h1>
          <p className="text-xs text-slate-300 leading-relaxed">{error}</p>
          <div className="pt-2">
            <Link
              to="/discord/servers"
              className="inline-flex items-center gap-1 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              ← 디렉토리로 이동
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>⚙️ {guild.name} 서버 관리</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            공개/비공개 가시성, 커스텀 Vanity Slug 주소 및 설명 문구를 설정할 수 있습니다.
          </p>
        </div>
        <Link
          to={`/discord/servers/${guild.slug}`}
          className="rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
        >
          공개 페이지 →
        </Link>
      </div>

      {/* Settings Form */}
      <form
        onSubmit={handleUpdate}
        className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 md:p-8 backdrop-blur-md space-y-6"
      >
        {saveError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {saveError}
          </div>
        )}

        {saveSuccess && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            설정이 성공적으로 저장되었습니다.
          </div>
        )}

        {/* Vanity Slug */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-200">
            Vanity Slug 주소 (영문 소문자, 숫자, -)
          </label>
          <div className="flex items-center rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-xs text-slate-400">
            <span>/discord/servers/</span>
            <input
              type="text"
              id="vanity-slug-input"
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value)}
              className="ml-1 flex-1 bg-transparent text-white font-mono focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            변경하더라도 Discord Guild ID({guild.guildId}) 자체는 변경되지 않습니다.
          </p>
        </div>

        {/* Visibility */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-200">서버 가시성 (Visibility)</label>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { key: "PUBLIC", title: "PUBLIC", desc: "검색 노출 및 공개 페이지 접속 가능" },
                {
                  key: "UNLISTED",
                  title: "UNLISTED",
                  desc: "검색 미노출, 직링크 페이지 접속 가능",
                },
                { key: "PRIVATE", title: "PRIVATE", desc: "검색 미노출, 관리자만 접근 가능" },
              ] as const
            ).map((v) => (
              <button
                type="button"
                key={v.key}
                onClick={() => setVisibilityInput(v.key)}
                className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-all ${
                  visibilityInput === v.key
                    ? "border-indigo-500 bg-indigo-600/20 text-white"
                    : "border-white/10 bg-slate-950/40 text-slate-400 hover:border-white/20"
                }`}
              >
                <div className="font-bold text-xs">{v.title}</div>
                <div className="text-[10px] mt-1 opacity-80 leading-tight">{v.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-200">서버 설명 문구</label>
          <textarea
            rows={3}
            value={descriptionInput}
            onChange={(e) => setDescriptionInput(e.target.value)}
            placeholder="서버의 특징이나 커뮤니티 소개글을 입력하세요..."
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-lg shadow-indigo-600/20"
          >
            {saving ? "저장 중..." : "설정 저장"}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="rounded-3xl border border-rose-500/20 bg-rose-950/20 p-6 md:p-8 backdrop-blur-md space-y-4">
        <h2 className="text-sm font-bold text-rose-300">위험 구역 (Danger Zone)</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          서버 등록을 해제하면 GAMEMOA 디렉토리에서 제외되고 `DISABLED` 상태로 변경됩니다. (Discord
          서버 자체에는 영향이 없습니다)
        </p>
        <div>
          <button
            type="button"
            onClick={() => setShowUnregisterModal(true)}
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500 hover:text-white transition-all"
          >
            서버 등록 해제
          </button>
        </div>
      </div>

      {/* Unregister Confirmation Modal */}
      {showUnregisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 space-y-6 shadow-2xl">
            <div className="space-y-2 text-center">
              <div className="text-3xl">⚠️</div>
              <h3 className="text-base font-bold text-white">서버 등록을 해제하시겠습니까?</h3>
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-white">{guild.name}</span> 서버가 GAMEMOA
                디렉토리 및 검색에서 제외됩니다.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowUnregisterModal(false)}
                className="flex-1 rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleUnregister}
                disabled={unregistering}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {unregistering ? "해제 중..." : "확인 (해제)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
