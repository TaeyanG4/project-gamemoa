import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { 
  type AuthUser, 
  type AuthProvider as ProviderType, 
  getStoredUser, 
  startRealOAuthFlow,
  getEnvClientId,
  setEnvClientIdOverride,
  logoutUser 
} from "./authService.js";

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  loginWithGoogle: () => boolean;
  loginWithDiscord: () => boolean;
  getClientId: (provider: ProviderType) => string | null;
  setClientId: (provider: ProviderType, clientId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    const existing = getStoredUser();
    if (existing) {
      setUser(existing);
    }
  }, []);

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  const loginWithGoogle = (): boolean => {
    return startRealOAuthFlow("google");
  };

  const loginWithDiscord = (): boolean => {
    return startRealOAuthFlow("discord");
  };

  const getClientId = (provider: ProviderType): string | null => {
    return getEnvClientId(provider);
  };

  const setClientId = (provider: ProviderType, clientId: string): void => {
    setEnvClientIdOverride(provider, clientId);
  };

  const logout = () => {
    logoutUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        loginWithGoogle,
        loginWithDiscord,
        getClientId,
        setClientId,
        logout,
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
