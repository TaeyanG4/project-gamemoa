import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { useAuth } from "../features/auth";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  User,
  LogOut,
  Trophy,
  ArrowLeft,
  ChevronRight,
  Link2,
  Unlink,
  Loader2,
  Zap,
  Award,
  Settings,
  Bookmark,
  Clock,
} from "lucide-react";
import { formatScore } from "@gamemoa/game-sdk";
import type { GameManifest } from "@gamemoa/game-sdk";
import { getLocalBestScore, fetchUserBestsApi } from "../features/scores/api";
import { gameManifests } from "../features/catalog/registry";
import { usePersonalization } from "../features/personalization";
import {
  fetchConnectedProviders,
  linkGoogleProvider,
  getDiscordLinkUrl,
  unlinkProvider,
} from "../features/auth/authService";
import { fetchMyProgressApi, fetchMyAchievementsApi } from "../features/progression/api";
import { updateNicknameApi, updateCountryApi } from "../features/profile/api";
import { COUNTRY_OPTIONS } from "../lib/countries";
import type {
  ConnectedProvider,
  SocialProvider,
  CreateMergeChallengeResponse,
  ProgressResponse,
  AchievementSummaryResponse,
} from "@gamemoa/contracts";
import { ACHIEVEMENT_DEFINITIONS, type AchievementCode } from "@gamemoa/core";
import { ApiClientError } from "../lib/api";
import { MergeModal } from "../components/ui/MergeModal";

export function meta() {
  return [
    { title: "내 프로필 & 기록 | gamemoa" },
    {
      name: "description",
      content: "내 계정 정보, 레벨/경험치, 도전과제, 게임별 최고 기록을 확인하세요.",
    },
  ];
}

const ALL_PROVIDERS: SocialProvider[] = ["google", "discord"];
type ProfileTab = "profile" | "records";

function providerLabel(provider: SocialProvider): string {
  return provider === "google" ? "Google" : "Discord";
}

/** Shared compact "game + info row" card used for records, favorites, and recent plays. */
function GameLinkCard({ game, children }: { game: GameManifest; children: ReactNode }) {
  const accent = game.accent ?? "#6366f1";

  return (
    <Link
      to={`/games/${game.slug}`}
      className="group flex items-center gap-4 p-4 rounded-2xl bg-surface-raised border border-border hover:border-brand/50 transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
        style={{
          background: `radial-gradient(circle at center, ${accent}30 0%, rgba(15, 19, 31, 0.9) 100%)`,
        }}
      >
        <img
          src={game.thumbnail}
          alt={game.title}
          className="w-9 h-9 object-contain transform group-hover:scale-110 transition-transform duration-300"
        />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm text-text-primary group-hover:text-brand transition-colors truncate">
          {game.title}
        </h3>
        {children}
      </div>

      <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-brand group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}

function GameRecordCard({
  game,
  serverBest,
  localBest,
}: {
  game: GameManifest;
  serverBest: number | null;
  localBest: number | null;
}) {
  const hasRecord = serverBest !== null || localBest !== null;

  return (
    <GameLinkCard game={game}>
      {hasRecord ? (
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="flex items-center gap-1 text-sm font-black text-brand-light">
            <Trophy className="w-3.5 h-3.5 text-accent-yellow shrink-0" />
            {serverBest !== null ? formatScore(serverBest, game.scoreConfig) : "계정 기록 없음"}
          </span>
          {localBest !== null && (
            <span className="text-[10px] text-text-muted font-semibold">
              기기 기록: {formatScore(localBest, game.scoreConfig)}
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-text-muted mt-1">아직 기록이 없어요 — 지금 도전해보세요!</p>
      )}
    </GameLinkCard>
  );
}

function GameFavoriteCard({ game }: { game: GameManifest }) {
  return (
    <GameLinkCard game={game}>
      <p className="text-xs text-text-secondary line-clamp-1 mt-1">{game.shortDescription}</p>
    </GameLinkCard>
  );
}

function formatRelativeTimeKo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMin = Math.floor((Date.now() - then) / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return iso.split("T")[0] ?? iso;
}

function GameActivityCard({ game, lastPlayedAt }: { game: GameManifest; lastPlayedAt: string }) {
  return (
    <GameLinkCard game={game}>
      <p className="flex items-center gap-1 text-xs text-text-muted mt-1">
        <Clock className="w-3 h-3 shrink-0" />
        {formatRelativeTimeKo(lastPlayedAt)}
      </p>
    </GameLinkCard>
  );
}

export default function ProfilePage() {
  const { user, isAuthenticated, logout, openLoginModal, refreshUser, providerStatus } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { favoriteGameIds, recentPlays } = usePersonalization();
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
  const [serverBests, setServerBests] = useState<Record<string, number>>({});
  const [connected, setConnected] = useState<ConnectedProvider[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyProvider, setBusyProvider] = useState<SocialProvider | null>(null);
  const [mergeChallengeId, setMergeChallengeId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [achievements, setAchievements] = useState<AchievementSummaryResponse | null>(null);
  const [nicknameInput, setNicknameInput] = useState("");
  const [nicknameBusy, setNicknameBusy] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [countryInput, setCountryInput] = useState("");
  const [countryBusy, setCountryBusy] = useState(false);
  const [countryError, setCountryError] = useState<string | null>(null);

  // Keep the settings inputs in sync with the latest saved user data (e.g. after a
  // successful update, or on first load) without clobbering an unrelated in-progress edit.
  useEffect(() => {
    if (user) {
      setNicknameInput(user.nickname);
      setCountryInput(user.country ?? "");
    }
  }, [user]);

  const favoriteGames = useMemo(
    () =>
      favoriteGameIds
        .map((id) => gameManifests.find((g) => g.slug === id || g.id === id))
        .filter((g): g is (typeof gameManifests)[number] => Boolean(g)),
    [favoriteGameIds],
  );

  const recentGames = useMemo(
    () =>
      recentPlays
        .map((r) => {
          const game = gameManifests.find((g) => g.slug === r.gameId || g.id === r.gameId);
          return game ? { game, lastPlayedAt: r.lastPlayedAt } : null;
        })
        .filter((entry): entry is { game: (typeof gameManifests)[number]; lastPlayedAt: string } =>
          Boolean(entry),
        )
        .slice(0, 8),
    [recentPlays],
  );

  const refreshConnected = useCallback(async () => {
    try {
      const data = await fetchConnectedProviders();
      setConnected(data.providers);
    } catch {
      setConnected([]);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      void fetchUserBestsApi()
        .then(setServerBests)
        .catch(() => setServerBests({}));
      void refreshConnected();
      void fetchMyProgressApi()
        .then(setProgress)
        .catch(() => setProgress(null));
      void fetchMyAchievementsApi()
        .then(setAchievements)
        .catch(() => setAchievements(null));
    }
  }, [isAuthenticated, user, refreshConnected]);

  // Handle Discord link redirect status params
  useEffect(() => {
    const linkStatus = searchParams.get("link_status");
    const challenge = searchParams.get("challenge");
    if (!linkStatus) return;

    if (linkStatus === "success") {
      setStatusMessage("로그인 수단이 연결되었습니다.");
      void refreshConnected();
    } else if (linkStatus === "already") {
      setStatusMessage("이미 연결된 계정입니다.");
    } else if (linkStatus === "conflict" && challenge) {
      setMergeChallengeId(challenge);
    } else if (linkStatus === "error") {
      setStatusMessage("로그인 수단 연결 중 오류가 발생했습니다.");
    }
    setActiveTab("profile");
    // clean the URL
    setSearchParams({}, { replace: true });
  }, [searchParams, refreshConnected, setSearchParams]);

  const isConnected = (provider: SocialProvider) => connected.some((p) => p.provider === provider);

  const handleLinkGoogle = () => {
    if (busyProvider) return;
    const clientId = providerStatus.google.clientId;
    if (!clientId || !providerStatus.google.configured || !window.google?.accounts?.id) {
      setStatusMessage("Google 로그인 스크립트가 준비되지 않았습니다.");
      return;
    }
    setBusyProvider("google");
    const googleAuth = window.google.accounts.id;
    googleAuth.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        try {
          await linkGoogleProvider(response.credential);
          setStatusMessage("Google 로그인이 연결되었습니다.");
          await refreshConnected();
        } catch (err: unknown) {
          const code = err instanceof ApiClientError ? err.code : undefined;
          const data = err instanceof ApiClientError ? err.data : undefined;
          if (code === "ACCOUNT_ALREADY_LINKED" && data) {
            const merge = (data as { mergeChallenge?: CreateMergeChallengeResponse })
              .mergeChallenge;
            if (merge?.challengeId) {
              setMergeChallengeId(merge.challengeId);
            } else {
              setStatusMessage("이 Google 계정은 이미 다른 GAMEMOA 계정으로 사용 중입니다.");
            }
          } else if (code === "PROVIDER_ALREADY_LINKED") {
            setStatusMessage("이 계정에는 이미 Google 로그인이 연결되어 있습니다.");
          } else {
            setStatusMessage(err instanceof Error ? err.message : "Google 연결에 실패했습니다.");
          }
        } finally {
          setBusyProvider(null);
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    googleAuth.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        const tempDiv = document.createElement("div");
        tempDiv.style.position = "fixed";
        tempDiv.style.top = "-9999px";
        document.body.appendChild(tempDiv);
        googleAuth.renderButton(tempDiv, { type: "icon", size: "large" });
        const btn = tempDiv.querySelector("div[role=button]") as HTMLElement | null;
        if (btn) btn.click();
        setTimeout(() => document.body.removeChild(tempDiv), 5000);
      }
    });
  };

  const handleLinkDiscord = () => {
    if (busyProvider) return;
    window.location.href = getDiscordLinkUrl();
  };

  const handleUnlink = async (provider: SocialProvider) => {
    if (busyProvider) return;
    setBusyProvider(provider);
    try {
      await unlinkProvider(provider);
      setStatusMessage(`${providerLabel(provider)} 연결이 해제되었습니다.`);
      await refreshConnected();
    } catch (err: unknown) {
      const code = err instanceof ApiClientError ? err.code : undefined;
      if (code === "LAST_AUTH_PROVIDER") {
        setStatusMessage("마지막 로그인 수단은 해제할 수 없습니다.");
      } else {
        setStatusMessage(err instanceof Error ? err.message : "연결 해제에 실패했습니다.");
      }
    } finally {
      setBusyProvider(null);
    }
  };

  const handleMerged = async () => {
    setMergeChallengeId(null);
    setStatusMessage("계정 통합이 완료되었습니다.");
    // The current session may now resolve to the primary account or be invalidated (reverse merge).
    await refreshUser();
    await refreshConnected();
    await fetchUserBestsApi()
      .then(setServerBests)
      .catch(() => setServerBests({}));
  };

  const handleUpdateNickname = async () => {
    if (!user || nicknameBusy) return;
    const trimmed = nicknameInput.trim();
    if (!trimmed || trimmed === user.nickname) return;

    setNicknameBusy(true);
    setNicknameError(null);
    try {
      await updateNicknameApi(trimmed);
      await refreshUser();
      setStatusMessage("닉네임이 변경되었습니다.");
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        const data = err.data as { nextAllowedAt?: string } | undefined;
        if (err.code === "NICKNAME_COOLDOWN_ACTIVE" && data?.nextAllowedAt) {
          setNicknameError(
            `닉네임은 ${data.nextAllowedAt.split("T")[0]} 이후 다시 변경할 수 있습니다.`,
          );
        } else {
          setNicknameError(err.detail || "닉네임 변경에 실패했습니다.");
        }
      } else {
        setNicknameError("닉네임 변경에 실패했습니다.");
      }
    } finally {
      setNicknameBusy(false);
    }
  };

  const handleUpdateCountry = async () => {
    if (!user || countryBusy) return;
    const nextCountry = countryInput || null;
    if (nextCountry === (user.country ?? null)) return;

    setCountryBusy(true);
    setCountryError(null);
    try {
      await updateCountryApi(nextCountry);
      await refreshUser();
      setStatusMessage("국가/지역이 변경되었습니다.");
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        const data = err.data as { nextAllowedAt?: string } | undefined;
        if (err.code === "COUNTRY_COOLDOWN_ACTIVE" && data?.nextAllowedAt) {
          setCountryError(
            `국가/지역은 ${data.nextAllowedAt.split("T")[0]} 이후 다시 변경할 수 있습니다.`,
          );
        } else {
          setCountryError(err.detail || "국가/지역 변경에 실패했습니다.");
        }
      } else {
        setCountryError("국가/지역 변경에 실패했습니다.");
      }
    } finally {
      setCountryBusy(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-20 text-center gap-6 select-none">
        <div className="w-16 h-16 rounded-full bg-brand/10 text-brand flex items-center justify-center">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-text-primary">로그인이 필요한 페이지입니다</h2>
        <p className="text-sm text-text-secondary max-w-sm">
          구글 또는 디스코드 계정으로 로그인하고 내 게임 기록을 관리하세요.
        </p>
        <button
          onClick={openLoginModal}
          className="px-8 py-3.5 bg-brand text-white font-extrabold rounded-2xl shadow-xl shadow-brand/30 hover:scale-105 transition-all cursor-pointer"
        >
          로그인하기
        </button>
      </div>
    );
  }

  const recordedGameCount = gameManifests.filter(
    (g) => serverBests[g.slug] !== undefined || getLocalBestScore(g.slug) !== null,
  ).length;

  return (
    <div className="flex flex-col w-full px-4 md:px-8 py-8 gap-6 max-w-4xl mx-auto flex-1 select-none">
      {mergeChallengeId && (
        <MergeModal
          challengeId={mergeChallengeId}
          onClose={() => setMergeChallengeId(null)}
          onMerged={() => void handleMerged()}
        />
      )}

      <button
        onClick={() => void navigate(-1)}
        className="flex items-center gap-2 text-xs font-bold text-text-muted hover:text-text-primary transition-colors cursor-pointer w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>이전으로 돌아가기</span>
      </button>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 p-1 bg-surface-raised border border-border rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === "profile"
              ? "bg-brand text-white shadow-md"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          내 프로필
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("records")}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === "records"
              ? "bg-brand text-white shadow-md"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          기록
        </button>
      </div>

      {activeTab === "profile" ? (
        <div className="flex flex-col gap-8">
          {/* User Card Header */}
          <div className="w-full bg-surface-raised rounded-3xl border border-border p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-brand/20 text-brand font-black text-2xl flex items-center justify-center border-2 border-brand/40 overflow-hidden shadow-md">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.nickname}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user.nickname.slice(0, 2)
                )}
              </div>

              <div className="flex flex-col gap-1 text-center md:text-left">
                <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
                  <h1 className="text-2xl font-black text-text-primary">{user.nickname}</h1>
                  {user.providers.map((p) => (
                    <span
                      key={p}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-brand/10 text-brand border border-brand/20 uppercase"
                    >
                      {p}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-text-secondary">{user.email}</p>
                <p className="text-[11px] text-text-muted mt-1">
                  가입일: {user.created_at?.split("T")[0]}
                </p>
              </div>
            </div>

            <button
              onClick={() => void logout()}
              className="flex items-center gap-2 px-6 py-2.5 bg-accent-red/10 text-accent-red border border-accent-red/30 rounded-2xl font-bold text-xs hover:bg-accent-red/20 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>로그아웃</span>
            </button>
          </div>

          {statusMessage && (
            <div className="px-4 py-3 rounded-2xl bg-brand/10 border border-brand/30 text-brand text-xs font-semibold">
              {statusMessage}
              <button
                onClick={() => setStatusMessage(null)}
                className="ml-2 p-1 hover:bg-brand/20 rounded-full cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          {/* Level & XP */}
          {progress && (
            <div className="w-full bg-surface-raised rounded-3xl border border-border p-6 md:p-8 flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-accent-yellow" />
                  <h2 className="text-xl font-bold text-text-primary">
                    레벨 {progress.summary.level}
                  </h2>
                </div>
                {progress.globalRank !== null && (
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-brand/10 text-brand border border-brand/20">
                    전체 XP 랭킹 #{progress.globalRank}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="w-full h-3 rounded-full bg-surface border border-border overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand to-accent-yellow rounded-full transition-all"
                    style={{ width: `${progress.summary.progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-text-muted font-semibold">
                  <span>
                    {progress.summary.currentLevelProgressXp.toLocaleString()} /{" "}
                    {progress.summary.currentLevelSpanXp.toLocaleString()} XP
                  </span>
                  <span>총 {progress.summary.totalXp.toLocaleString()} XP</span>
                </div>
              </div>
            </div>
          )}

          {/* Profile settings: nickname & country/region */}
          <div className="w-full bg-surface-raised rounded-3xl border border-border p-6 md:p-8 flex flex-col gap-6 shadow-xl">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-brand" />
              <h2 className="text-xl font-bold text-text-primary">프로필 설정</h2>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="nickname-input" className="text-xs font-bold text-text-muted">
                닉네임
              </label>
              <div className="flex gap-2">
                <input
                  id="nickname-input"
                  type="text"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  maxLength={20}
                  className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-surface border border-border text-sm text-text-primary focus:outline-none focus:border-brand/50"
                  placeholder="닉네임을 입력하세요"
                />
                <button
                  type="button"
                  onClick={() => void handleUpdateNickname()}
                  disabled={
                    nicknameBusy || !nicknameInput.trim() || nicknameInput.trim() === user.nickname
                  }
                  className="flex items-center justify-center px-4 py-2.5 bg-brand text-white border border-brand rounded-xl font-bold text-xs hover:bg-brand-dark transition-all cursor-pointer disabled:opacity-50 shrink-0 min-w-16"
                >
                  {nicknameBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "변경"}
                </button>
              </div>
              {nicknameError && (
                <p className="text-[11px] text-accent-red font-semibold">{nicknameError}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="country-input" className="text-xs font-bold text-text-muted">
                국가/지역{" "}
                <span className="font-normal text-text-muted">
                  (선택, 자기 신고 정보이며 국적 인증이 아닙니다)
                </span>
              </label>
              <div className="flex gap-2">
                <select
                  id="country-input"
                  value={countryInput}
                  onChange={(e) => setCountryInput(e.target.value)}
                  className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-surface border border-border text-sm text-text-primary focus:outline-none focus:border-brand/50"
                >
                  <option value="">설정 안 함</option>
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.labelKo}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void handleUpdateCountry()}
                  disabled={countryBusy || countryInput === (user.country ?? "")}
                  className="flex items-center justify-center px-4 py-2.5 bg-brand text-white border border-brand rounded-xl font-bold text-xs hover:bg-brand-dark transition-all cursor-pointer disabled:opacity-50 shrink-0 min-w-16"
                >
                  {countryBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "변경"}
                </button>
              </div>
              {countryError && (
                <p className="text-[11px] text-accent-red font-semibold">{countryError}</p>
              )}
            </div>
          </div>

          {/* Favorites */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-amber-400 fill-amber-400" />
                <h2 className="text-xl font-bold text-text-primary">즐겨찾기</h2>
              </div>
              <span className="text-xs font-bold text-text-muted">{favoriteGames.length}개</span>
            </div>

            {favoriteGames.length === 0 ? (
              <div className="p-5 rounded-2xl bg-surface-raised border border-border text-xs text-text-muted">
                아직 즐겨찾기한 게임이 없습니다. 게임 카드의 북마크 아이콘을 눌러 추가해보세요.{" "}
                <Link to="/games" className="text-brand-light font-bold hover:underline">
                  게임 둘러보기 →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {favoriteGames.map((game) => (
                  <GameFavoriteCard key={game.slug} game={game} />
                ))}
              </div>
            )}
          </div>

          {/* Recent plays */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand" />
                <h2 className="text-xl font-bold text-text-primary">최근 플레이</h2>
              </div>
              <span className="text-xs font-bold text-text-muted">{recentGames.length}개</span>
            </div>

            {recentGames.length === 0 ? (
              <div className="p-5 rounded-2xl bg-surface-raised border border-border text-xs text-text-muted">
                아직 플레이 기록이 없습니다. 게임을 플레이하면 여기에 표시돼요.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentGames.map(({ game, lastPlayedAt }) => (
                  <GameActivityCard key={game.slug} game={game} lastPlayedAt={lastPlayedAt} />
                ))}
              </div>
            )}
          </div>

          {/* Connected login accounts */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-brand" />
              <h2 className="text-xl font-bold text-text-primary">연결된 로그인 계정</h2>
            </div>
            <div className="flex flex-col gap-3">
              {ALL_PROVIDERS.map((provider) => {
                const linked = isConnected(provider);
                return (
                  <div
                    key={provider}
                    className="flex items-center justify-between p-4 rounded-2xl bg-surface-raised border border-border shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-text-primary">
                        {providerLabel(provider)}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase ${
                          linked
                            ? "bg-accent-green/10 text-accent-green border-accent-green/30"
                            : "bg-surface text-text-muted border-border"
                        }`}
                      >
                        {linked ? "연결됨" : "연결 안 됨"}
                      </span>
                    </div>
                    {linked ? (
                      <button
                        type="button"
                        onClick={() => void handleUnlink(provider)}
                        disabled={busyProvider === provider}
                        className="flex items-center gap-2 px-4 py-2 bg-accent-red/10 text-accent-red border border-accent-red/30 rounded-xl font-bold text-xs hover:bg-accent-red/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {busyProvider === provider ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Unlink className="w-3.5 h-3.5" />
                        )}
                        <span>연결 해제</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={provider === "google" ? handleLinkGoogle : handleLinkDiscord}
                        disabled={
                          busyProvider !== null ||
                          (provider === "google" && !providerStatus.google.configured) ||
                          (provider === "discord" && !providerStatus.discord.configured)
                        }
                        className="flex items-center gap-2 px-4 py-2 bg-brand text-white border border-brand rounded-xl font-bold text-xs hover:bg-brand-dark transition-all cursor-pointer disabled:opacity-50"
                      >
                        {busyProvider === provider ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Link2 className="w-3.5 h-3.5" />
                        )}
                        <span>연결</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Achievements */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-accent-yellow" />
                <h2 className="text-xl font-bold text-text-primary">도전과제</h2>
              </div>
              {achievements && (
                <span className="text-xs font-bold text-text-muted">
                  {achievements.unlockedCodes.length} / {achievements.totalAchievements} 달성
                </span>
              )}
            </div>

            {!achievements || achievements.unlockedCodes.length === 0 ? (
              <div className="p-5 rounded-2xl bg-surface-raised border border-border text-xs text-text-muted">
                아직 달성한 도전과제가 없습니다. 게임을 플레이하고 즐겨찾기를 추가해보세요!
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {achievements.recentlyUnlocked.map((a) => {
                  const def = ACHIEVEMENT_DEFINITIONS[a.code as AchievementCode];
                  return (
                    <span
                      key={a.code}
                      title={def?.descriptionKo}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/30"
                    >
                      <Award className="w-3.5 h-3.5" />
                      {def?.titleKo ?? a.code}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* High Scores Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-accent-yellow" />
                <h2 className="text-xl font-bold text-text-primary">내 게임별 최고 기록</h2>
                <span className="text-xs font-bold text-text-muted">
                  {recordedGameCount} / {gameManifests.length} 도전
                </span>
              </div>

              <Link to="/ranking" className="text-xs font-bold text-brand-light hover:underline">
                전체 랭킹 보기 →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gameManifests.map((game) => (
                <GameRecordCard
                  key={game.slug}
                  game={game}
                  serverBest={serverBests[game.slug] ?? null}
                  localBest={getLocalBestScore(game.slug)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
