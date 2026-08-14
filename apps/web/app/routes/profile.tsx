import { useEffect } from "react";
import { useNavigate } from "react-router";
import { User } from "lucide-react";
import { useAuth } from "../features/auth";
import { useI18n } from "../features/i18n/I18nContext";

export function meta() {
  return [{ title: "프로필 | OwOGG" }];
}

/** /profile — kept only as a stable redirect target for old links/bookmarks/OAuth callbacks
 * (e.g. login-gate hints on admin pages that pre-date the /users/:id public profile). Logged-in
 * visitors are bounced straight to their own profile at /users/:id, which is now the single
 * unified "내 프로필" destination; logged-out visitors get the same login prompt this page
 * always showed, so nothing here actually breaks by not being logged in yet. */
export default function ProfileRedirect() {
  const { user, isAuthenticated, openLoginModal } = useAuth();
  const { dict } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      void navigate(`/users/${user.id}`, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  if (isAuthenticated && user) return null;

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-20 text-center gap-6 select-none">
      <div className="w-16 h-16 rounded-full bg-brand/10 text-brand flex items-center justify-center">
        <User className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-black text-text-primary">{dict.profile.loginRequiredTitle}</h2>
      <p className="text-sm text-text-secondary max-w-sm">{dict.profile.loginRequiredBody}</p>
      <button
        onClick={openLoginModal}
        className="px-8 py-3.5 bg-brand text-white font-extrabold rounded-2xl shadow-xl shadow-brand/30 hover:scale-105 transition-all cursor-pointer"
      >
        {dict.profile.loginRequiredCta}
      </button>
    </div>
  );
}
