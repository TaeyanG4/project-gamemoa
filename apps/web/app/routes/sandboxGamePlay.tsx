import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router";
import { ArrowLeft, AlertCircle, RefreshCw, Gamepad2 } from "lucide-react";
import { fetchPublicSandboxGame } from "../features/sandboxGamesApi";
import { SandboxGameFrame } from "../components/games/SandboxGameFrame";
import { ApiClientError } from "../lib/api";
import type { SandboxGamePublicDetail } from "@owogg/contracts";

export function meta() {
  return [
    { title: "게임 플레이 | OwOGG" },
    { name: "description", content: "OwOGG 개발자가 업로드한 샌드박스 게임을 플레이하세요." },
  ];
}

type LoadState = "loading" | "success" | "notFound" | "error";

/** /sandbox-games/:slug — the player-facing page for a developer-uploaded sandbox game. Text is
 * Korean-only for now, matching every other sandbox-game-adjacent surface (settings.tsx's dev
 * tab, adminSandboxGames.tsx) — none of it is in the i18n dictionary yet.
 *
 * The iframe is mounted only once the player clicks PLAY inside SandboxGameFrame — never on page
 * load — so a page view alone never spends bandwidth or B2 egress on a game nobody chose to
 * start. See docs/GAME_CREATION_GUIDE.md §3.5/§8 for why the frame carries no OwOGG auth/session
 * data and why sandbox games don't submit scores in this beta. */
export default function SandboxGamePlayRoute() {
  const { slug } = useParams();

  const [game, setGame] = useState<SandboxGamePublicDetail | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    if (!slug) return;
    setState("loading");
    try {
      const res = await fetchPublicSandboxGame(slug);
      setGame(res);
      setState("success");
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        setState("notFound");
      } else {
        setState("error");
      }
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "loading") {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-24 text-center text-sm text-text-muted">
        불러오는 중...
      </div>
    );
  }

  if (state === "notFound" || state === "error") {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-4 py-24 text-center">
        <AlertCircle className="h-9 w-9 text-text-muted" />
        <h1 className="text-lg font-black text-text-primary">
          {state === "notFound" ? "게임을 찾을 수 없어요" : "게임을 불러오지 못했어요"}
        </h1>
        {state === "notFound" && (
          <p className="text-sm text-text-muted">비공개 게임이거나, 존재하지 않는 게임 주소예요.</p>
        )}
        <div className="mt-2 flex items-center gap-4">
          <Link
            to="/games"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-light hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            게임 목록으로
          </Link>
          {state === "error" && (
            <button
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text-primary"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              다시 시도
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!game) return null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link
        to="/games"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        게임 목록으로
      </Link>

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-surface-raised">
        <SandboxGameFrame
          slug={game.slug}
          title={game.title}
          className="flex flex-col"
          frameClassName="aspect-video w-full bg-black"
          poster={
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 bg-black/40 px-6 text-center">
              <Gamepad2 className="h-10 w-10 text-text-muted" />
              <div>
                <h1 className="text-lg font-black text-text-primary">{game.title}</h1>
                {game.shortDescription && (
                  <p className="mt-1 text-sm text-text-muted">{game.shortDescription}</p>
                )}
              </div>
            </div>
          }
        />
      </div>

      <div className="mt-6 space-y-2">
        <span className="inline-block rounded-full bg-surface-raised px-2.5 py-1 text-xs font-bold text-text-muted">
          {game.genre}
        </span>
        <h1 className="text-xl font-black text-text-primary">{game.title}</h1>
        {game.description && (
          <p className="whitespace-pre-line text-sm text-text-muted">{game.description}</p>
        )}
      </div>
    </div>
  );
}
