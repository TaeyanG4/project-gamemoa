import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router";
import { useAuth } from "../features/auth";
import { fetchDiscordLinkPreviewApi, confirmDiscordLinkApi } from "../features/discord/api";
import { ApiClientError } from "../lib/api";
import type { CreateMergeChallengeResponse } from "@gamemoa/contracts";
import { MergeModal } from "../components/ui/MergeModal";
import { Link2, Loader2, CheckCircle2, XCircle, LogIn } from "lucide-react";

export function meta() {
  return [
    { title: "Discord 계정 연동 | gamemoa" },
    { name: "description", content: "Discord 계정을 GAMEMOA 계정과 연동합니다." },
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
            : "연동 중 오류가 발생했습니다.",
      });
    }
  }, [token]);

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
        <p className="text-sm text-text-secondary">연동 정보를 확인하는 중...</p>
      </Shell>
    );
  }

  if (state.status === "invalid") {
    return (
      <Shell>
        <div className="w-16 h-16 rounded-full bg-accent-red/10 text-accent-red flex items-center justify-center">
          <XCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-text-primary">유효하지 않은 연동 링크입니다</h1>
        <p className="text-sm text-text-secondary">
          링크가 만료되었거나 이미 사용되었습니다. Discord 서버에서{" "}
          <code className="px-1.5 py-0.5 rounded bg-surface text-brand-light">/gamemoa link</code>를
          다시 실행해주세요.
        </p>
      </Shell>
    );
  }

  if (state.status === "confirming") {
    return (
      <Shell>
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
        <p className="text-sm text-text-secondary">Discord 계정을 연동하는 중...</p>
      </Shell>
    );
  }

  if (state.status === "error") {
    return (
      <Shell>
        <div className="w-16 h-16 rounded-full bg-accent-red/10 text-accent-red flex items-center justify-center">
          <XCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-text-primary">연동에 실패했습니다</h1>
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
          {state.alreadyLinked ? "이미 연동되어 있습니다" : "Discord 계정이 연동되었습니다"}
        </h1>
        <p className="text-sm text-text-secondary">
          이제 Discord에서 <code className="px-1.5 py-0.5 rounded bg-surface">/gamemoa</code>{" "}
          명령어로 GAMEMOA 계정 정보를 확인할 수 있습니다.
        </p>
        <Link
          to="/profile"
          className="px-8 py-3 bg-brand text-white font-extrabold rounded-2xl shadow-xl shadow-brand/30 hover:scale-105 transition-all cursor-pointer"
        >
          내 프로필로 이동
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
      <h1 className="text-xl font-black text-text-primary">Discord 계정 연동</h1>
      <p className="text-sm text-text-secondary">
        Discord 계정 <span className="font-bold text-text-primary">@{state.discordUsername}</span>을
        현재 로그인한 GAMEMOA 계정과 연동하시겠습니까?
      </p>

      {authLoading ? (
        <Loader2 className="w-6 h-6 text-brand animate-spin" />
      ) : !isAuthenticated ? (
        <>
          <p className="text-xs text-text-muted">연동하려면 먼저 GAMEMOA에 로그인해주세요.</p>
          <button
            type="button"
            onClick={openLoginModal}
            className="flex items-center gap-2 px-8 py-3 bg-brand text-white font-extrabold rounded-2xl shadow-xl shadow-brand/30 hover:scale-105 transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            로그인하기
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => void handleConfirm()}
          className="px-8 py-3 bg-brand text-white font-extrabold rounded-2xl shadow-xl shadow-brand/30 hover:scale-105 transition-all cursor-pointer"
        >
          연동하기
        </button>
      )}
    </Shell>
  );
}
