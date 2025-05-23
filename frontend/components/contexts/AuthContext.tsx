'use client';

import type { User } from '@/types/user';
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import {
  getCurrentUser,
  loginUser,
  logoutUser as apiLogoutUser,
} from '@/lib/api';

interface AuthCtx {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthReady: boolean;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const performClientLogout = useCallback(() => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    setUser(null);
    console.log('AuthContext: Client-side logout performed.');
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: loggedInUser } = await loginUser(email, password);

    // ⚠️ Περιμένουμε να αποθηκευτεί και να "σταθεροποιηθεί" το access token
    await new Promise((resolve) => setTimeout(resolve, 0));

    setUser(loggedInUser);
    setIsAuthReady(true); // ✅ σηματοδοτεί ότι είμαστε έτοιμοι
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogoutUser();
    } catch (error) {
      console.error('AuthContext: API logout error, fallback to client logout.', error);
    } finally {
      performClientLogout();
    }
  }, [performClientLogout]);

  useEffect(() => {
    const loadUserOnMount = async () => {
      setIsLoading(true);

      const token = localStorage.getItem('access');
      const cachedUser = localStorage.getItem('user');

      if (!token) {
        setUser(null);
        setIsLoading(false);
        setIsAuthReady(true);
        return;
      }

      if (cachedUser) {
        try {
          const parsedUser = JSON.parse(cachedUser) as User;
          setUser(parsedUser);
        } catch (e) {
          console.warn('AuthContext: Failed to parse cached user from localStorage.', e);
          localStorage.removeItem('user');
          setUser(null);
        }
      }

      try {
        const me = await getCurrentUser();
        setUser(me);
      } catch (error) {
        console.warn(
          'AuthContext: getCurrentUser failed. Relying on axios interceptor to refresh token if needed.',
          error
        );
        // Δεν κάνουμε logout εδώ! Περιμένουμε το interceptor να διαχειριστεί το token refresh.
      } finally {
        setIsLoading(false);
        setIsAuthReady(true);
      }
    };

    loadUserOnMount();
  }, [performClientLogout]);

  const contextValue = React.useMemo(
    () => ({ user, login, logout, isLoading, isAuthReady, setUser }),
    [user, login, logout, isLoading, isAuthReady]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
export function useAuthGuard() {
  const { user, isAuthReady } = useAuth();
  return { user, isAuthReady };
}
