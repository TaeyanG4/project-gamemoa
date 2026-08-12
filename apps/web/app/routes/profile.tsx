import { useAuth } from "@gamemoa/auth";
import { Link, useNavigate } from "react-router";
import { User, LogOut, Trophy, Gamepad2, ArrowLeft } from "lucide-react";
import { getLocalBestScore } from "@gamemoa/core";
import { gameManifests } from "../features/catalog/registry";

export function meta() {
  return [
    { title: "내 프로필 | gamemoa" },
    { name: "description", content: "내 계정 정보 및 미니게임 최고 기록을 확인하세요." },
  ];
}

export default function ProfilePage() {
  const { user, isAuthenticated, logout, openLoginModal } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="flex flex-col w-full px-4 md:px-8 py-8 gap-8 max-w-4xl mx-auto flex-1 select-none">
      {/* Back button */}
      <button
        onClick={() => void navigate(-1)}
        className="flex items-center gap-2 text-xs font-bold text-text-muted hover:text-text-primary transition-colors cursor-pointer w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>이전으로 돌아가기</span>
      </button>

      {/* User Card Header */}
      <div className="w-full bg-surface-raised rounded-3xl border border-border p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-brand/20 text-brand font-black text-2xl flex items-center justify-center border-2 border-brand/40 overflow-hidden shadow-md">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.nickname} className="w-full h-full object-cover" />
            ) : (
              user.nickname.slice(0, 2)
            )}
          </div>

          <div className="flex flex-col gap-1 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
              <h1 className="text-2xl font-black text-text-primary">{user.nickname}</h1>
              {user.providers.map((p) => (
                <span key={p} className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-brand/10 text-brand border border-brand/20 uppercase">
                  {p}
                </span>
              ))}
            </div>
            <p className="text-xs text-text-secondary">{user.email}</p>
            <p className="text-[11px] text-text-muted mt-1">가입일: {user.created_at?.split("T")[0]}</p>
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

      {/* Local High Scores Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent-yellow" />
            <h2 className="text-xl font-bold text-text-primary">내 게임별 최고 기록</h2>
          </div>

          <Link to="/ranking" className="text-xs font-bold text-brand-light hover:underline">
            전체 랭킹 보기 →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gameManifests.map((game) => {
            const best = getLocalBestScore(game.slug);

            return (
              <div
                key={game.slug}
                className="p-5 rounded-2xl bg-surface-raised border border-border flex items-center justify-between shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center">
                    <Gamepad2 className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-text-primary">{game.title}</h3>
                    <span className="text-[11px] text-text-muted">{game.shortDescription}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-text-muted block">최고 기록</span>
                  <span className="font-black text-brand-light text-base">
                    {best !== null ? (game.slug === "reaction-time" ? `${best} ms` : `Level ${best}`) : "기록 없음"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
