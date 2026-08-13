import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  fetchDiscordGuildBySlug,
  updateDiscordGuild,
  unregisterDiscordGuild,
} from "../features/discord/discordGuildApi";
import type { DiscordGuildDto, DiscordGuildVisibility } from "@owogg/contracts";
import { useI18n } from "../features/i18n/I18nContext";

export default function DiscordServerManageRoute() {
  const { dict } = useI18n();
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
          setError(dict.discordServerManage.noPermissionError);
          return;
        }
        setGuild(res.guild);
        setSlugInput(res.guild.slug);
        setDescriptionInput(res.guild.description || "");
        setVisibilityInput(res.guild.visibility);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : dict.discordServerSlug.loadFailedGeneric);
      })
      .finally(() => setLoading(false));
  }, [
    currentSlug,
    dict.discordServerManage.noPermissionError,
    dict.discordServerSlug.loadFailedGeneric,
  ]);

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
      setSaveError(err instanceof Error ? err.message : dict.discordServerManage.saveFailedError);
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
      setSaveError(
        err instanceof Error ? err.message : dict.discordServerManage.unregisterFailedError,
      );
      setShowUnregisterModal(false);
    } finally {
      setUnregistering(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-slate-400">
        {dict.discordServerManage.loadingManageInfo}
      </div>
    );
  }

  if (error || !guild) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <div className="rounded-3xl border border-rose-500/20 bg-slate-900/80 p-8 backdrop-blur-md space-y-4">
          <div className="text-3xl">🚫</div>
          <h1 className="text-lg font-bold text-white">
            {dict.discordServerManage.accessDeniedTitle}
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">{error}</p>
          <div className="pt-2">
            <Link
              to="/discord/servers"
              className="inline-flex items-center gap-1 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              {dict.discordServerManage.backToDirectory}
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
            <span>
              ⚙️ {guild.name} {dict.discordServerManage.manageTitleSuffix}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">{dict.discordServerManage.manageSubtitle}</p>
        </div>
        <Link
          to={`/discord/servers/${guild.slug}`}
          className="rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
        >
          {dict.discordServerManage.publicPageArrow}
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
            {dict.discordServerManage.saveSuccessMessage}
          </div>
        )}

        {/* Vanity Slug */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-200">
            {dict.discordServerManage.slugLabel}
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
            {dict.discordServerManage.slugHintPrefix}
            {guild.guildId}
            {dict.discordServerManage.slugHintSuffix}
          </p>
        </div>

        {/* Visibility */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-200">
            {dict.discordServerManage.visibilityLabel}
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                {
                  key: "PUBLIC",
                  title: "PUBLIC",
                  desc: dict.discordServerManage.visibilityPublicDesc,
                },
                {
                  key: "UNLISTED",
                  title: "UNLISTED",
                  desc: dict.discordServerManage.visibilityUnlistedDesc,
                },
                {
                  key: "PRIVATE",
                  title: "PRIVATE",
                  desc: dict.discordServerManage.visibilityPrivateDesc,
                },
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
          <label className="text-xs font-semibold text-slate-200">
            {dict.discordServerManage.descriptionLabel}
          </label>
          <textarea
            rows={3}
            value={descriptionInput}
            onChange={(e) => setDescriptionInput(e.target.value)}
            placeholder={dict.discordServerManage.descriptionPlaceholder}
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
            {saving ? dict.discordServerManage.savingButton : dict.discordServerManage.saveButton}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="rounded-3xl border border-rose-500/20 bg-rose-950/20 p-6 md:p-8 backdrop-blur-md space-y-4">
        <h2 className="text-sm font-bold text-rose-300">
          {dict.discordServerManage.dangerZoneTitle}
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          {dict.discordServerManage.dangerZoneText}
        </p>
        <div>
          <button
            type="button"
            onClick={() => setShowUnregisterModal(true)}
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500 hover:text-white transition-all"
          >
            {dict.discordServerManage.unregisterButton}
          </button>
        </div>
      </div>

      {/* Unregister Confirmation Modal */}
      {showUnregisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 space-y-6 shadow-2xl">
            <div className="space-y-2 text-center">
              <div className="text-3xl">⚠️</div>
              <h3 className="text-base font-bold text-white">
                {dict.discordServerManage.unregisterConfirmTitle}
              </h3>
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-white">{guild.name}</span>{" "}
                {dict.discordServerManage.unregisterConfirmBodySuffix}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowUnregisterModal(false)}
                className="flex-1 rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                {dict.discordServerManage.cancelButton}
              </button>
              <button
                type="button"
                onClick={handleUnregister}
                disabled={unregistering}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {unregistering
                  ? dict.discordServerManage.unregisteringButton
                  : dict.discordServerManage.confirmUnregisterButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
