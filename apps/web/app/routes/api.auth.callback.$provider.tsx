import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { setStoredUser, type AuthUser, type AuthProvider, OAUTH_CONFIG } from "@gamemoa/auth";
import { ShieldCheck, AlertCircle } from "lucide-react";

export function meta() {
  return [
    { title: "소셜 로그인 처리 중... | gamemoa" },
  ];
}

export default function AuthCallbackPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const provider = (params.provider ?? "google") as AuthProvider;

  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check URL hash parameters for access_token (#access_token=...&token_type=Bearer)
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.substring(1) : hash);
    const accessToken = hashParams.get("access_token") || searchParams.get("access_token");
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error") || hashParams.get("error");

    if (errorParam) {
      setStatus("error");
      setErrorMessage(`인증이 거부되었습니다: ${errorParam}`);
      return;
    }

    if (!accessToken && !code) {
      setStatus("error");
      setErrorMessage("인증 토큰(access_token)이 전달되지 않았습니다.");
      return;
    }

    async function fetchRealUserProfile() {
      try {
        let user: AuthUser;

        if (accessToken) {
          if (provider === "google") {
            // Fetch real Google user info
            const res = await fetch(`${OAUTH_CONFIG.google.userInfoUrl}?access_token=${accessToken}`);
            if (!res.ok) throw new Error("Google 프로필 정보를 가져오는 데 실패했습니다.");
            const data = await res.json();

            user = {
              id: `google_${data.sub}`,
              email: data.email || "google_user@gamemoa.dev",
              name: data.name || data.given_name || "Google User",
              image: data.picture || "https://lh3.googleusercontent.com/a/default-user=s96-c",
              provider: "google",
              createdAt: new Date().toISOString().split("T")[0],
            };
          } else {
            // Fetch real Discord user info
            const res = await fetch(OAUTH_CONFIG.discord.userInfoUrl, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!res.ok) throw new Error("Discord 프로필 정보를 가져오는 데 실패했습니다.");
            const data = await res.json();

            const avatarUrl = data.avatar
              ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
              : "https://cdn.discordapp.com/embed/avatars/0.png";

            user = {
              id: `discord_${data.id}`,
              email: data.email || `${data.username}@discord.gg`,
              name: data.global_name || data.username || "Discord User",
              image: avatarUrl,
              provider: "discord",
              createdAt: new Date().toISOString().split("T")[0],
            };
          }
        } else {
          // Code fallback if backend OAuth exchange is enabled
          user = {
            id: `usr_${provider}_${Date.now()}`,
            email: `${provider}_user@gamemoa.dev`,
            name: `${provider === "google" ? "Google" : "Discord"} 계정 유저`,
            provider,
            createdAt: new Date().toISOString().split("T")[0],
          };
        }

        setStoredUser(user);
        setStatus("success");
        setTimeout(() => {
          void navigate("/profile", { replace: true });
        }, 800);
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err?.message || "소셜 프로필 수신 중 오류가 발생했습니다.");
      }
    }

    void fetchRealUserProfile();
  }, [searchParams, provider, navigate]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8 text-center select-none max-w-md mx-auto min-h-[60vh]">
      {status === "loading" && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand/30 border-t-brand rounded-full animate-spin" />
          <h2 className="text-xl font-bold text-text-primary">
            {provider === "google" ? "Google" : "Discord"} 실계정 인증 프로필 확인 중...
          </h2>
          <p className="text-xs text-text-secondary">
            실제 계정의 프로필 정보와 아바타를 불러오고 있습니다. 잠시만 기다려주세요.
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-accent-green/10 text-accent-green flex items-center justify-center">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-text-primary">소셜 로그인 성공!</h2>
          <p className="text-xs text-text-secondary">인증 완료되었습니다. 프로필로 이동합니다...</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-accent-red/10 text-accent-red flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">인증 오류</h2>
          <p className="text-xs text-accent-red font-medium max-w-xs leading-relaxed">{errorMessage}</p>
          <button
            onClick={() => void navigate("/", { replace: true })}
            className="px-6 py-2.5 bg-surface-raised border border-border rounded-xl font-bold text-xs hover:bg-surface-overlay transition-colors mt-2 cursor-pointer"
          >
            메인 페이지로 돌아가기
          </button>
        </div>
      )}
    </div>
  );
}
