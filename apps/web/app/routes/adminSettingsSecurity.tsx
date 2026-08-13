import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ShieldAlert, Lock } from "lucide-react";
import { useAuth } from "../features/auth";
import { fetchAdminMe } from "../features/adminApi";
import { PasswordChangeForm } from "./admin";
import type { AdminMeResponse } from "@owogg/contracts";

export function meta() {
  return [
    { title: "관리자 보안 설정 | OwOGG" },
    { name: "description", content: "OwOGG 관리자 비밀번호 변경" },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

export default function AdminSettingsSecurityRoute() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [me, setMe] = useState<AdminMeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchAdminMe()
      .then(setMe)
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated]);

  if (authLoading || loading) {
    return <PageMessage>접근 권한을 확인하는 중...</PageMessage>;
  }

  if (!isAuthenticated || !me?.adminAuthenticated) {
    return (
      <PageMessage>
        <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-text-muted" />
        <h1 className="text-lg font-black text-text-primary">관리자 인증이 필요합니다</h1>
        <p className="mt-2 text-sm text-text-muted">
          <Link to="/admin" className="font-bold text-brand-light hover:underline">
            /admin
          </Link>
          에서 본인 확인과 관리자 로그인을 먼저 완료해주세요.
        </p>
      </PageMessage>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div className="text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-accent-yellow" />
        <h1 className="text-xl font-black text-text-primary">보안 설정</h1>
        <p className="mt-2 text-xs leading-relaxed text-text-muted">
          관리자 비밀번호를 변경하면 이 계정의 다른 모든 관리자 세션이 즉시 해제됩니다.
        </p>
      </div>
      <PasswordChangeForm onChanged={() => void fetchAdminMe().then(setMe)} />
      <Link to="/admin" className="text-center text-xs font-bold text-brand-light hover:underline">
        관리자 센터로 돌아가기
      </Link>
    </div>
  );
}

function PageMessage({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-xl px-4 py-24 text-center">{children}</div>;
}
