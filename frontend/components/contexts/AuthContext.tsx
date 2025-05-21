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
  isAuthReady: boolean; // ✅ Νέο flag
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // ✅ για το UI
  const [isAuthReady, setIsAuthReady] = useState(false); // ✅ για τις εξωτερικές εξαρτήσεις

  const performClientLogout = useCallback(() => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    setUser(null);
    console.log('AuthContext: Client-side logout performed.');
  }, []);

  useEffect(() => {
    const loadUserOnMount = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('access');

      if (!token) {
        setUser(null);
        setIsLoading(false);
        setIsAuthReady(true); // ✅ Έστω και χωρίς token, θεωρούμε το auth flow initialized
        return;
      }

      try {
        const me = await getCurrentUser();
        setUser(me);
      } catch (error) {
        console.error('AuthContext: Error fetching current user on mount', error);
        // @ts-ignore
        if (error?.response?.status === 401) {
          performClientLogout();
        }
      } finally {
        setIsLoading(false);
        setIsAuthReady(true); // ✅ Πάντα σηματοδοτούμε το τέλος της αρχικής φάσης
      }
    };

    loadUserOnMount();
  }, [performClientLogout]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: loggedInUser } = await loginUser(email, password);
    setUser(loggedInUser);
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
