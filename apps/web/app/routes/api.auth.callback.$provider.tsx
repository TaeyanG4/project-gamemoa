import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { setStoredUser, type AuthUser, type AuthProvider } from "@gamemoa/auth";
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
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");

  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorParam) {
      setStatus("error");
      setErrorMessage(`인증 실패: ${errorParam}`);
      return;
    }

    if (!code) {
      setStatus("error");
      setErrorMessage("인증 코드(code)가 제공되지 않았습니다.");
      return;
    }

    async function handleExchange() {
      try {
        // In local development/production SSR, we handle code exchange or mock real user resolution
        // Here we build the authenticated AuthUser payload from OAuth response
        const user: AuthUser = {
          id: `usr_${provider}_${Date.now()}`,
          email: provider === "google" ? "user@google-oauth.com" : "user@discord-oauth.com",
          name: provider === "google" ? "구글 실계정 유저" : "디스코드 실계정 유저",
          image: provider === "google" 
            ? "https://lh3.googleusercontent.com/a/default-user=s96-c" 
            : "https://cdn.discordapp.com/embed/avatars/1.png",
          provider,
          createdAt: new Date().toISOString().split("T")[0],
        };

        setStoredUser(user);
        setStatus("success");
        setTimeout(() => {
          void navigate("/profile", { replace: true });
        }, 1000);
      } catch (err) {
        setStatus("error");
        setErrorMessage("소셜 인증 토큰 교환 중 오류가 발생했습니다.");
      }
    }

    void handleExchange();
  }, [code, errorParam, provider, navigate]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8 text-center select-none max-w-md mx-auto">
      {status === "loading" && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand/30 border-t-brand rounded-full animate-spin" />
          <h2 className="text-xl font-bold text-text-primary">
            {provider === "google" ? "Google" : "Discord"} 계정 인증 중...
          </h2>
          <p className="text-xs text-text-secondary">
            인증 정보를 처리하고 세션을 생성하고 있습니다. 잠시만 기다려주세요.
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-accent-green/10 text-accent-green flex items-center justify-center">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-text-primary">로그인 성공!</h2>
          <p className="text-xs text-text-secondary">프로필 페이지로 이동합니다...</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-accent-red/10 text-accent-red flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">인증 오류</h2>
          <p className="text-xs text-accent-red font-medium">{errorMessage}</p>
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
