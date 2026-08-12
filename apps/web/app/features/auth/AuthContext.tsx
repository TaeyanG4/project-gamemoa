import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  type AuthUser,
  type ProviderStatus,
  fetchCurrentUser,
  fetchProviderStatus,
  loginGoogle,
  getDiscordLoginUrl,
  logoutFromServer,
} from "./authService.js";

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  providerStatus: ProviderStatus;
  error: string | null;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  loginWithGoogle: () => void;
  loginWithDiscord: () => void;
  logout: () => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (
            notification?: (n: {
              isNotDisplayed: () => boolean;
              isSkippedMoment: () => boolean;
            }) => void,
          ) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
          revoke: (hint: string, callback: () => void) => void;
        };
      };
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    google: false,
    discord: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const [currentUser, status] = await Promise.all([fetchCurrentUser(), fetchProviderStatus()]);
      setUser(currentUser);
      setProviderStatus(status);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const openLoginModal = () => {
    setError(null);
    setIsLoginModalOpen(true);
  };
  const closeLoginModal = () => {
    setError(null);
    setIsLoginModalOpen(false);
  };
  const clearError = () => setError(null);

  const loginWithGoogle = useCallback(() => {
    setError(null);

    const clientId =
      typeof window !== "undefined"
        ? ((import.meta as unknown as { env?: { VITE_GOOGLE_CLIENT_ID?: string } }).env
            ?.VITE_GOOGLE_CLIENT_ID ?? "")
        : "";

    if (!clientId || !providerStatus.google) {
      setError("Google 로그인이 아직 설정되지 않았습니다.");
      return;
    }

    if (!window.google?.accounts?.id) {
      setError("Google 로그인 스크립트가 로드되지 않았습니다. 페이지를 새로고침해주세요.");
      return;
    }

    const googleAuth = window.google.accounts.id;

    googleAuth.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        try {
          setIsLoading(true);
          const loggedInUser = await loginGoogle(response.credential);
          setUser(loggedInUser);
          setIsLoginModalOpen(false);
          setError(null);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Google 로그인에 실패했습니다. 다시 시도해주세요.",
          );
        } finally {
          setIsLoading(false);
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
        googleAuth.renderButton(tempDiv, {
          type: "icon",
          size: "large",
        });
        const btn = tempDiv.querySelector("div[role=button]") as HTMLElement | null;
        if (btn) {
          btn.click();
        }
        setTimeout(() => document.body.removeChild(tempDiv), 5000);
      }
    });
  }, [providerStatus.google]);

  const loginWithDiscord = useCallback(() => {
    setError(null);
    if (!providerStatus.discord) {
      setError("Discord 로그인이 아직 설정되지 않았습니다.");
      return;
    }
    window.location.href = getDiscordLoginUrl();
  }, [providerStatus.discord]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    await logoutFromServer();
    setUser(null);
    setIsLoading(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        providerStatus,
        error,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        loginWithGoogle,
        loginWithDiscord,
        logout,
        clearError,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
