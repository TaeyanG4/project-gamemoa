import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { KeyRound, Power, RotateCcw, ShieldAlert, UserCog, UserPlus } from "lucide-react";
import { useAuth } from "../features/auth";
import {
  fetchAdminAccounts,
  fetchAdminAccountAudit,
  postCreateAdminAccount,
  patchAdminAccountStatus,
  patchAdminAccountRole,
  postResetAdminAccountPassword,
  postRevokeAdminAccountSessions,
} from "../features/adminApi";
import { ApiClientError } from "../lib/api/errors";
import type {
  AdminAccountSummary,
  AdminAccountAuditEntry,
  AdminAccountRoleValue,
} from "@owogg/contracts";

export function meta() {
  return [
    { title: "관리자 계정 관리 | OwOGG" },
    { name: "description", content: "OwOGG 관리자 계정 관리 (SUPERADMIN 전용)" },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

export default function AdminAccountsRoute() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState<AdminAccountSummary[] | null>(null);
  const [audit, setAudit] = useState<AdminAccountAuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [accountData, auditData] = await Promise.all([
        fetchAdminAccounts(),
        fetchAdminAccountAudit(),
      ]);
      setAccounts(accountData.accounts);
      setAudit(auditData.entries);
      setError(null);
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        setAccessDenied(true);
        setError(
          err.code === "ADMIN_SESSION_REQUIRED"
            ? "관리자 로그인이 필요합니다. /admin 에서 본인 확인을 먼저 완료해주세요."
            : "SUPERADMIN만 접근할 수 있습니다.",
        );
      } else {
        setError(err instanceof Error ? err.message : "관리자 계정 목록을 불러올 수 없습니다.");
      }
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) void load();
  }, [authLoading, isAuthenticated, load]);

  const withBusy = async (id: number, fn: () => Promise<unknown>) => {
    setBusyId(id);
    setNotice(null);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청을 처리할 수 없습니다.");
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading) return <PageMessage>접근 권한을 확인하는 중...</PageMessage>;
  if (!isAuthenticated) {
    return (
      <PageMessage>
        <Link to="/">OwOGG 로그인</Link>이 필요합니다.
      </PageMessage>
    );
  }
  if (accessDenied) {
    return (
      <PageMessage>
        <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-text-muted" />
        <h1 className="text-lg font-black text-text-primary">관리자 계정 관리</h1>
        <p className="mt-2 text-sm text-text-muted">{error}</p>
        <Link
          to="/admin"
          className="mt-6 inline-block text-xs font-bold text-brand-light hover:underline"
        >
          관리자 센터로 돌아가기
        </Link>
      </PageMessage>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-7 px-4 py-8 md:px-8">
      <header>
        <div className="mb-2 inline-flex items-center gap-2 text-accent-yellow">
          <UserCog className="h-5 w-5" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">SUPERADMIN</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-text-primary">관리자 계정 관리</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-muted">
          모든 관리자 계정은 이미 존재하는 OwOGG 사용자와, 그 사용자에게 연결된 Google 계정을
          기준으로만 생성됩니다.
        </p>
      </header>

      {error && !accessDenied && (
        <p className="rounded-xl border border-accent-red/30 bg-accent-red/10 p-3 text-xs font-semibold text-accent-red">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-xl border border-accent-green/30 bg-accent-green/10 p-3 text-xs font-semibold text-accent-green">
          {notice}
        </p>
      )}

      <CreateAdminForm
        onCreated={() => {
          setNotice("관리자 계정이 생성되었습니다.");
          void load();
        }}
        onError={(msg) => setError(msg)}
      />

      <section className="overflow-x-auto rounded-2xl border border-border bg-surface-raised">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="border-b border-border text-text-muted">
            <tr>
              <th className="px-4 py-3 font-bold">닉네임</th>
              <th className="px-4 py-3 font-bold">아이디</th>
              <th className="px-4 py-3 font-bold">역할</th>
              <th className="px-4 py-3 font-bold">상태</th>
              <th className="px-4 py-3 font-bold">비밀번호 변경 필요</th>
              <th className="px-4 py-3 font-bold">작업</th>
            </tr>
          </thead>
          <tbody>
            {(accounts ?? []).map((account) => (
              <tr key={account.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-bold text-text-primary">
                  {account.nickname}{" "}
                  {account.isSelf && <span className="text-text-muted">(나)</span>}
                </td>
                <td className="px-4 py-3 text-text-muted">{account.username}</td>
                <td className="px-4 py-3">
                  <RoleBadge role={account.role} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={account.status} />
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {account.mustChangePassword ? "예" : "아니오"}
                </td>
                <td className="px-4 py-3">
                  <AccountActions
                    account={account}
                    busy={busyId === account.id}
                    onToggleStatus={() =>
                      withBusy(account.id, () =>
                        patchAdminAccountStatus(
                          account.id,
                          account.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
                        ),
                      )
                    }
                    onToggleRole={() =>
                      withBusy(account.id, () =>
                        patchAdminAccountRole(
                          account.id,
                          account.role === "SUPERADMIN" ? "ADMIN" : "SUPERADMIN",
                        ),
                      )
                    }
                    onResetPassword={(newPassword) =>
                      withBusy(account.id, () =>
                        postResetAdminAccountPassword(account.id, newPassword),
                      )
                    }
                    onRevokeSessions={() =>
                      withBusy(account.id, () => postRevokeAdminAccountSessions(account.id))
                    }
                  />
                </td>
              </tr>
            ))}
            {accounts && accounts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-text-muted">
                  등록된 관리자 계정이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h2 className="text-sm font-black text-text-primary">감사 로그 (최근 100건)</h2>
        <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
          {audit.length === 0 && <p className="text-xs text-text-muted">기록이 없습니다.</p>}
          {audit.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-xl bg-surface px-3 py-2.5 text-xs"
            >
              <span className="font-bold text-text-primary">{entry.action}</span>
              <span className="text-text-muted">
                {entry.createdAt.replace("T", " ").slice(0, 16)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-bold ${
        role === "SUPERADMIN"
          ? "bg-accent-yellow/15 text-accent-yellow"
          : "bg-brand/15 text-brand-light"
      }`}
    >
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-bold ${
        status === "ACTIVE"
          ? "bg-accent-green/15 text-accent-green"
          : "bg-accent-red/15 text-accent-red"
      }`}
    >
      {status === "ACTIVE" ? "활성" : "비활성"}
    </span>
  );
}

function AccountActions({
  account,
  busy,
  onToggleStatus,
  onToggleRole,
  onResetPassword,
  onRevokeSessions,
}: {
  account: AdminAccountSummary;
  busy: boolean;
  onToggleStatus: () => void;
  onToggleRole: () => void;
  onResetPassword: (newPassword: string) => void;
  onRevokeSessions: () => void;
}) {
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        disabled={busy}
        onClick={onToggleStatus}
        title={account.status === "ACTIVE" ? "비활성화" : "활성화"}
        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-bold text-text-primary hover:border-brand disabled:opacity-50 cursor-pointer"
      >
        <Power className="h-3 w-3" /> {account.status === "ACTIVE" ? "비활성화" : "활성화"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onToggleRole}
        title="역할 전환"
        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-bold text-text-primary hover:border-brand disabled:opacity-50 cursor-pointer"
      >
        <UserCog className="h-3 w-3" /> 역할 전환
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onRevokeSessions}
        title="세션 해제"
        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-bold text-text-primary hover:border-brand disabled:opacity-50 cursor-pointer"
      >
        <RotateCcw className="h-3 w-3" /> 세션 해제
      </button>
      {!resetOpen ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setResetOpen(true)}
          title="임시 비밀번호 발급"
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-bold text-text-primary hover:border-brand disabled:opacity-50 cursor-pointer"
        >
          <KeyRound className="h-3 w-3" /> 비밀번호 재설정
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="새 임시 비밀번호 (12자 이상)"
            minLength={12}
            className="w-44 rounded-lg border border-border bg-surface px-2 py-1 text-[10px]"
          />
          <button
            type="button"
            disabled={busy || newPassword.length < 12}
            onClick={() => {
              onResetPassword(newPassword);
              setNewPassword("");
              setResetOpen(false);
            }}
            className="rounded-lg bg-brand px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50 cursor-pointer"
          >
            적용
          </button>
        </div>
      )}
    </div>
  );
}

function CreateAdminForm({
  onCreated,
  onError,
}: {
  onCreated: () => void;
  onError: (message: string) => void;
}) {
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminAccountRoleValue>("ADMIN");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await postCreateAdminAccount({
        userId: Number(userId),
        username,
        password,
        role,
      });
      setUserId("");
      setUsername("");
      setPassword("");
      setRole("ADMIN");
      onCreated();
    } catch (err) {
      onError(
        err instanceof ApiClientError
          ? err.detail || "관리자 계정 생성에 실패했습니다."
          : "관리자 계정 생성에 실패했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface-raised p-5"
    >
      <label className="flex flex-col gap-1 text-xs font-bold text-text-primary">
        OwOGG 사용자 ID
        <input
          type="number"
          min={1}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-40 rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-bold text-text-primary">
        관리자 아이디
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          minLength={3}
          maxLength={64}
          className="w-40 rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-bold text-text-primary">
        임시 비밀번호
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={12}
          className="w-44 rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-bold text-text-primary">
        역할
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as AdminAccountRoleValue)}
          className="w-32 rounded-xl border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="ADMIN">ADMIN</option>
          <option value="SUPERADMIN">SUPERADMIN</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light disabled:opacity-50 cursor-pointer"
      >
        <UserPlus className="h-3.5 w-3.5" /> {loading ? "생성 중..." : "관리자 추가"}
      </button>
      <p className="w-full text-[10px] text-text-muted">
        대상 사용자는 이미 Google 계정이 연결되어 있어야 합니다. Google sub는 서버에서 자동으로
        가져옵니다.
      </p>
    </form>
  );
}

function PageMessage({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-xl px-4 py-24 text-center">{children}</div>;
}
