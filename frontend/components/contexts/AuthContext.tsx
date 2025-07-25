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
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
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
    try {
      const { user: loggedInUser } = await loginUser(email, password);
      setUser(loggedInUser);
      console.log('AuthContext: Login successful for user:', loggedInUser?.email);
      // Μετά από επιτυχημένο login, δεν είμαστε πλέον σε loading state
      if (isLoading) {
        setIsLoading(false);
      }
      if (!isAuthReady) {
        setIsAuthReady(true);
      }
    } catch (error) {
      console.error('AuthContext: Login failed:', error);
      throw error;
    }
  }, [setUser, isLoading, isAuthReady]);

  const logout = useCallback(async () => {
    try {
      await apiLogoutUser();
      console.log('AuthContext: API logout successful');
    } catch (error) {
      console.error('AuthContext: API logout error, fallback to client logout.', error);
    } finally {
      performClientLogout();
      // Μετά το logout, ενημερώνουμε τα states
      if (!isAuthReady) {
        setIsAuthReady(true);
      }
      if (isLoading) {
        setIsLoading(false);
      }
    }
  }, [performClientLogout, isAuthReady, isLoading]);

  // Νέα μέθοδος για ανανέωση των στοιχείων χρήστη
  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('access');
      if (!token) {
        console.log('AuthContext: No token found, cannot refresh user');
        return;
      }
      
      console.log('AuthContext: Refreshing user data');
      const me = await getCurrentUser();
      setUser(me);
      console.log('AuthContext: User data refreshed successfully');
      return me;
    } catch (error) {
      console.error('AuthContext: Failed to refresh user data', error);
      throw error;
    }
  }, [setUser]);

  useEffect(() => {
    const loadUserOnMount = async () => {
      setIsLoading(true);

      const token = localStorage.getItem('access');
      const cachedUser = localStorage.getItem('user');

      if (!token) {
        console.log('AuthContext: No token found on mount');
        setUser(null);
        setIsLoading(false);
        setIsAuthReady(true);
        return;
      }

      if (cachedUser) {
        try {
          const parsedUser = JSON.parse(cachedUser) as User;
          setUser(parsedUser);
          console.log('AuthContext: Loaded cached user:', parsedUser?.email);
        } catch (e) {
          console.error('AuthContext: Failed to parse cached user', e);
          localStorage.removeItem('user');
          setUser(null);
        }
      }

      try {
        console.log('AuthContext: Fetching current user');
        const me = await getCurrentUser();
        setUser(me);
        console.log('AuthContext: Current user fetched successfully:', me?.email);
      } catch (error: any) {
        console.error('AuthContext: Failed to fetch current user', error);
        
        // Αν το σφάλμα είναι 401, καθαρίζουμε τα tokens
        if (error?.response?.status === 401) {
          console.log('AuthContext: 401 error, clearing tokens');
          performClientLogout();
        }
      } finally {
        setIsLoading(false);
        setIsAuthReady(true);
      }
    };

    loadUserOnMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute isAuthenticated based on user state and token existence
  const isAuthenticated = !!userState && !!localStorage.getItem('access');

  // Εκτελούμε έλεγχο του token κάθε λεπτό
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const checkTokenInterval = setInterval(() => {
      const token = localStorage.getItem('access');
      if (!token) {
        console.log('AuthContext: Token check - No token found, logging out');
        performClientLogout();
        return;
      }
      
      // Προαιρετικά, θα μπορούσαμε να κάνουμε ένα ελαφρύ API call για να επιβεβαιώσουμε ότι το token είναι έγκυρο
      console.log('AuthContext: Token check - Token exists');
    }, 1 * 60 * 1000); // 1 λεπτό
    
    return () => clearInterval(checkTokenInterval);
  }, [isAuthenticated, performClientLogout]);

  const contextValue = React.useMemo(
    () => ({ 
      user: userState, 
      login, 
      logout, 
      isLoading, 
      isAuthReady, 
      isAuthenticated,
      refreshUser,
      setUser 
    }),
    [userState, login, logout, isLoading, isAuthReady, isAuthenticated, refreshUser, setUser]
  );

  // Εμφάνιση του spinner μόνο κατά το αρχικό φόρτωμα, όχι κατά το login
  if (isLoading && !isAuthReady) {
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
  const { user, isAuthReady, isAuthenticated } = useAuth();
  return { user, isAuthReady, isAuthenticated };
}
