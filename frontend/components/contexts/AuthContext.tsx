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
import FullPageSpinner from '@/components/FullPageSpinner';

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
  const [userState, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Always sync user to localStorage
  const setUser = useCallback((user: User | null) => {
    setUserState(user);
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, []);

  const performClientLogout = useCallback(() => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    setUser(null);
    console.log('AuthContext: Client-side logout performed.');
  }, [setUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: loggedInUser } = await loginUser(email, password);
    await new Promise((resolve) => setTimeout(resolve, 0));
    setUser(loggedInUser);
    // Do not set isAuthReady here; let the effect handle it
  }, [setUser]);

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
          console.error('AuthContext: Failed to parse cached user', e);
          localStorage.removeItem('user');
          setUser(null);
        }
      }

      try {
        const me = await getCurrentUser();
        setUser(me);
      } catch (error) {
        // Wait for axios interceptor to handle refresh
        console.error('AuthContext: Failed to fetch current user', error);
      } finally {
        setIsLoading(false);
        setIsAuthReady(true);
      }
    };

    loadUserOnMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contextValue = React.useMemo(
    () => ({ user: userState, login, logout, isLoading, isAuthReady, setUser }),
    [userState, login, logout, isLoading, isAuthReady, setUser]
  );

  if (isLoading) {
    return <FullPageSpinner message="Συνδέουμε τον λογαριασμό..." />;
  }

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
