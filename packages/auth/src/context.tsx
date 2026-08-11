import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { 
  type AuthUser, 
  type AuthProvider as ProviderType, 
  getStoredUser, 
  loginWithProvider, 
  logoutUser 
} from "./authService.js";

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  loginWithGoogle: () => void;
  loginWithDiscord: () => void;
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

  const loginWithGoogle = () => {
    const loggedIn = loginWithProvider("google");
    setUser(loggedIn);
    closeLoginModal();
  };

  const loginWithDiscord = () => {
    const loggedIn = loginWithProvider("discord");
    setUser(loggedIn);
    closeLoginModal();
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
