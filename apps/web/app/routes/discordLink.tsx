import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router";
import { useAuth } from "../features/auth";
import { fetchDiscordLinkPreviewApi, confirmDiscordLinkApi } from "../features/discord/api";
import { ApiClientError } from "../lib/api";
import type { CreateMergeChallengeResponse } from "@owogg/contracts";
import { MergeModal } from "../components/ui/MergeModal";
import { Link2, Loader2, CheckCircle2, XCircle, LogIn } from "lucide-react";
import { useI18n } from "../features/i18n/I18nContext";

export function meta() {
  return [
    { title: "Discord 계정 연동 | OwOGG" },
    { name: "description", content: "Discord 계정을 OwOGG 계정과 연동합니다." },
  ];
}

type PageState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "preview"; discordUsername: string }
  | { status: "confirming" }
  | { status: "success"; alreadyLinked: boolean }
  | { status: "error"; message: string };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-20 select-none">
      <div className="w-full max-w-md bg-surface-raised rounded-3xl border border-border p-8 shadow-xl flex flex-col items-center gap-5 text-center">
        {children}
      </div>
    </div>
  );
}

export default function DiscordLinkPage() {
  const { dict } = useI18n();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { isAuthenticated, isLoading: authLoading, openLoginModal } = useAuth();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [mergeChallengeId, setMergeChallengeId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState({ status: "invalid" });
      return;
    }
    void fetchDiscordLinkPreviewApi(token)
      .then((data) => setState({ status: "preview", discordUsername: data.discordUsername }))
      .catch(() => setState({ status: "invalid" }));
  }, [token]);

  const handleConfirm = useCallback(async () => {
    if (!token) return;
    setState({ status: "confirming" });
    try {
      const result = await confirmDiscordLinkApi(token);
      setState({ status: "success", alreadyLinked: result.alreadyLinked });
    } catch (err: unknown) {
      const code = err instanceof ApiClientError ? err.code : undefined;
      const data = err instanceof ApiClientError ? err.data : undefined;
      if (code === "ACCOUNT_ALREADY_LINKED" && data) {
        const merge = (data as { mergeChallenge?: CreateMergeChallengeResponse }).mergeChallenge;
        if (merge?.challengeId) {
          setMergeChallengeId(merge.challengeId);
          return;
        }
      }
      setState({
        status: "error",
        message:
          err instanceof ApiClientError
            ? err.detail || err.message
            : dict.discordLink.genericErrorMessage,
      });
    }
  }, [token, dict.discordLink.genericErrorMessage]);

  const handleMerged = useCallback(() => {
    setMergeChallengeId(null);
    setState({ status: "success", alreadyLinked: false });
  }, []);

  if (mergeChallengeId) {
    return (
      <MergeModal
        challengeId={mergeChallengeId}
        onClose={() => setMergeChallengeId(null)}
        onMerged={() => handleMerged()}
      />
    );
  }

  if (state.status === "loading") {
    return (
      <Shell>
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
        <p className="text-sm text-text-secondary">{dict.discordLink.checkingLinkInfo}</p>
      </Shell>
    );
  }

  if (state.status === "invalid") {
    return (
      <Shell>
        <div className="w-16 h-16 rounded-full bg-accent-red/10 text-accent-red flex items-center justify-center">
          <XCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-text-primary">{dict.discordLink.invalidTitle}</h1>
        <p className="text-sm text-text-secondary">
          {dict.discordLink.invalidBodyPrefix}{" "}
          <code className="px-1.5 py-0.5 rounded bg-surface text-brand-light">/owogg link</code>
          {dict.discordLink.invalidBodySuffix}
        </p>
      </Shell>
    );
  }

  if (state.status === "confirming") {
    return (
      <Shell>
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
        <p className="text-sm text-text-secondary">{dict.discordLink.linkingInProgress}</p>
      </Shell>
    );
  }

  if (state.status === "error") {
    return (
      <Shell>
        <div className="w-16 h-16 rounded-full bg-accent-red/10 text-accent-red flex items-center justify-center">
          <XCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-text-primary">{dict.discordLink.errorTitle}</h1>
        <p className="text-sm text-text-secondary">{state.message}</p>
      </Shell>
    );
  }

  if (state.status === "success") {
    return (
      <Shell>
        <div className="w-16 h-16 rounded-full bg-accent-green/10 text-accent-green flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-text-primary">
          {state.alreadyLinked ? dict.discordLink.alreadyLinkedTitle : dict.discordLink.linkedTitle}
        </h1>
        <p className="text-sm text-text-secondary">
          {dict.discordLink.successBodyPrefix}{" "}
          <code className="px-1.5 py-0.5 rounded bg-surface">/owogg</code>{" "}
          {dict.discordLink.successBodySuffix}
        </p>
        <Link
          to="/profile"
          className="px-8 py-3 bg-brand text-white font-extrabold rounded-2xl shadow-xl shadow-brand/30 hover:scale-105 transition-all cursor-pointer"
        >
          {dict.discordLink.goToProfileCta}
        </Link>
      </Shell>
    );
  }

  // state.status === "preview"
  return (
    <Shell>
      <div className="w-16 h-16 rounded-full bg-brand/10 text-brand flex items-center justify-center">
        <Link2 className="w-8 h-8" />
      </div>
      <h1 className="text-xl font-black text-text-primary">{dict.discordLink.linkAccountTitle}</h1>
      <p className="text-sm text-text-secondary">
        {dict.discordLink.confirmPromptPrefix}{" "}
        <span className="font-bold text-text-primary">@{state.discordUsername}</span>{" "}
        {dict.discordLink.confirmPromptSuffix}
      </p>

      {authLoading ? (
        <Loader2 className="w-6 h-6 text-brand animate-spin" />
      ) : !isAuthenticated ? (
        <>
          <p className="text-xs text-text-muted">{dict.discordLink.loginRequiredHint}</p>
          <button
            type="button"
            onClick={openLoginModal}
            className="flex items-center gap-2 px-8 py-3 bg-brand text-white font-extrabold rounded-2xl shadow-xl shadow-brand/30 hover:scale-105 transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            {dict.discordLink.loginCta}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => void handleConfirm()}
          className="px-8 py-3 bg-brand text-white font-extrabold rounded-2xl shadow-xl shadow-brand/30 hover:scale-105 transition-all cursor-pointer"
        >
          {dict.discordLink.linkCta}
        </button>
      )}
    </Shell>
  );
}
