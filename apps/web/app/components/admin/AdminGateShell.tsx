import { createContext, useContext } from "react";
import { Link } from "react-router";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useAdminGate } from "../../features/useAdminGate";
import type { PermissionValue } from "@owogg/contracts";

const GatePermissionsContext = createContext<PermissionValue[]>([]);

/** The gate's own already-fetched permission list — lets a center page's content filter its own
 * nav/sections without re-fetching what AdminGateShell already loaded (see AdminGateShell). */
export function useGatePermissions(): PermissionValue[] {
  return useContext(GatePermissionsContext);
}

/** Shared "loading / need login / not eligible / step-up required / forbidden" chrome for the
 * Ops/Mod/System Developer centers — see useAdminGate's doc comment for why step-up itself isn't
 * duplicated here. Renders `children` only once the required permission is confirmed present,
 * with the fetched permission list available to them via useGatePermissions(). */
export function AdminGateShell({
  requiredPermission,
  title,
  children,
}: {
  requiredPermission: PermissionValue;
  title: string;
  children: React.ReactNode;
}) {
  const { stage, error, permissions } = useAdminGate(requiredPermission);

  if (stage === "loading") {
    return <PageMessage>{title} 접근 권한을 확인하는 중...</PageMessage>;
  }

  if (stage === "need-owogg-login") {
    return (
      <PageMessage>
        <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-text-muted" />
        <h1 className="text-lg font-black text-text-primary">OwOGG 로그인이 필요합니다</h1>
      </PageMessage>
    );
  }

  if (stage === "not-eligible" || stage === "forbidden") {
    return (
      <PageMessage>
        <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-text-muted" />
        <h1 className="text-lg font-black text-text-primary">접근 권한이 없습니다</h1>
        {error && <p className="mt-2 text-sm text-text-muted">{error}</p>}
        <Link
          to="/"
          className="mt-6 inline-flex items-center rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light"
        >
          홈으로 돌아가기
        </Link>
      </PageMessage>
    );
  }

  if (stage === "step-up-required") {
    return (
      <PageMessage>
        <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-text-muted" />
        <h1 className="text-lg font-black text-text-primary">관리자 본인 확인이 필요합니다</h1>
        <p className="mt-2 text-sm text-text-muted">
          {title}에 접근하려면 먼저 관리자 센터에서 Google 본인 확인과 관리자 로그인을 완료해야
          합니다.
        </p>
        <Link
          to="/admin"
          className="mt-6 inline-flex items-center rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light"
        >
          관리자 센터에서 본인 확인
        </Link>
      </PageMessage>
    );
  }

  return (
    <GatePermissionsContext.Provider value={permissions}>
      {children}
    </GatePermissionsContext.Provider>
  );
}

function PageMessage({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-xl px-4 py-24 text-center">{children}</div>;
}
