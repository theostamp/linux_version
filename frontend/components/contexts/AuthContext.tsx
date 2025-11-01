'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import type { User } from '@/types/user';
import { useQueryClient } from '@tanstack/react-query';
import {
  getCurrentUser,
  loginUser,
  logoutUser as apiLogoutUser,
} from '@/lib/api';
import FullPageSpinner from '@/components/FullPageSpinner';

interface AuthCtx {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthReady: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<User | undefined>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

// Global flag to prevent multiple AuthProvider instances from initializing simultaneously
let globalAuthInitializing = false;
const MAX_ROLE_SYNC_ATTEMPTS = 3;

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [userState, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [roleSyncDone, setRoleSyncDone] = useState(false);
  const roleSyncAttemptsRef = useRef(0);
  const roleSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  // Always sync user to localStorage
  const setUser = useCallback((user: User | null) => {
    setUserState(user);
    if (user) {
      const effectiveRole = user.system_role ?? user.role ?? null;
      localStorage.setItem('user', JSON.stringify(user));
      queryClient.setQueryData(['me'], user);
      if (effectiveRole && effectiveRole !== 'user') {
        setRoleSyncDone(true);
        roleSyncAttemptsRef.current = 0;
      } else {
        setRoleSyncDone(false);
      }
    } else {
      localStorage.removeItem('user');
      queryClient.removeQueries({ queryKey: ['me'], exact: true });
      setRoleSyncDone(false);
      roleSyncAttemptsRef.current = 0;
    }
  }, [queryClient]);

  const performClientLogout = useCallback(() => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    setUser(null);
    setRoleSyncDone(false);
    roleSyncAttemptsRef.current = 0;
    if (roleSyncTimeoutRef.current) {
      clearTimeout(roleSyncTimeoutRef.current);
      roleSyncTimeoutRef.current = null;
    }
    console.log('AuthContext: Client-side logout performed.');
  }, [setUser]);

  const login = useCallback(async (email: string, password: string): Promise<User & { redirectPath?: string }> => {
    try {
      setIsLoading(true);
      const { user: loggedInUser, redirectPath } = await loginUser(email, password);
      setUser(loggedInUser);
      console.log('AuthContext: Login successful for user:', loggedInUser?.email);
      
      // Ensure states are properly set after successful login
      setIsLoading(false);
      setIsAuthReady(true);
      
      // Return user plus backend-suggested redirect path
      return { ...loggedInUser, redirectPath } as User & { redirectPath?: string };
    } catch (error: any) {
      setIsLoading(false);
      console.error('AuthContext: Login failed:', error);
      
      // Improve error logging for 502/503/504 errors
      if (error?.response?.status === 502 || error?.response?.status === 503 || error?.response?.status === 504) {
        console.error('AuthContext: Backend connection error - server may be down');
        console.error('AuthContext: Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
      }
      
      throw error;
    }
  }, [setUser]);

  const loginWithToken = useCallback(async (token: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Store the token
      localStorage.setItem('access', token);
      
      // Fetch user data with this token
      const user = await getCurrentUser();
      setUser(user);
      
      // Update auth state
      setIsLoading(false);
      setIsAuthReady(true);
      
      console.log('AuthContext: Token login successful for user:', user?.email);
    } catch (error) {
      console.error('AuthContext: Token login failed:', error);
      // Clean up on failure
      localStorage.removeItem('access');
      setIsLoading(false);
      throw error;
    }
  }, [setUser]);

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

  // Clean up any pending role sync timeout on unmount
  useEffect(() => {
    return () => {
      if (roleSyncTimeoutRef.current) {
        clearTimeout(roleSyncTimeoutRef.current);
        roleSyncTimeoutRef.current = null;
      }
    };
  }, []);

  // Automatically resync role after upgrades (e.g., subscription activation)
  // DISABLED TEMPORARILY - causing loops and unnecessary refreshes
  // Users can manually refresh if needed
  // useEffect(() => {
  //   // Disabled to prevent loops
  // }, []);

  useEffect(() => {
    const loadUserOnMount = async () => {
      if (hasInitialized || globalAuthInitializing) {
        console.log('[AuthContext] Already initialized or global initialization in progress, skipping...');
        return;
      }

      console.log('[AuthContext] loadUserOnMount starting...');
      globalAuthInitializing = true;
      setHasInitialized(true);
      setIsLoading(true);

      // Set a timeout to prevent infinite hanging
      const timeoutId = setTimeout(() => {
        console.error('[AuthContext] Initialization timeout after 5 seconds, forcing ready state');
        setIsLoading(false);
        setIsAuthReady(true);
      }, 5000);

      const token = localStorage.getItem('access');
      const cachedUser = localStorage.getItem('user');

      // Skip auto-login to simplify the flow - users can manually login

      if (!token) {
        console.log('[AuthContext] No token found on mount, setting auth as ready');
        clearTimeout(timeoutId);
        setUser(null);
        setIsLoading(false);
        setIsAuthReady(true);
        return;
      }

      if (cachedUser && token) {
        try {
          const parsedUser = JSON.parse(cachedUser) as User;
          
          // Always verify user data with API to ensure permissions are up to date
          console.log('AuthContext: Found cached user:', parsedUser?.email, 'but will verify with API');
          
          try {
            const freshUser = await getCurrentUser();
            setUser(freshUser);
            console.log('AuthContext: Refreshed user data:', freshUser?.email);
          } catch (apiError) {
            console.error('AuthContext: Failed to refresh user, clearing auth state:', apiError);
            // Clear invalid auth state
            localStorage.removeItem('access');
            localStorage.removeItem('refresh');
            localStorage.removeItem('user');
            setUser(null);
          }

          clearTimeout(timeoutId);
          setIsLoading(false);
          setIsAuthReady(true);
          return;
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
          // Skip auto-login fallback - keep it simple
        }
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
        setIsAuthReady(true);
        globalAuthInitializing = false;
      }
    };

    loadUserOnMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove hasInitialized dependency to prevent re-runs

  // Compute isAuthenticated based on user state and token existence
  const isAuthenticated = !!userState && !!localStorage.getItem('access');

  // Εκτελούμε έλεγχο του token κάθε λεπτό
  useEffect(() => {
    // TEMPORARILY DISABLED - might be causing hanging issues
    console.log('[AuthContext] Token check interval disabled to debug hanging issue');
    return;
    
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
      loginWithToken,
      logout, 
      isLoading, 
      isAuthReady, 
      isAuthenticated,
      refreshUser,
      setUser 
    }),
    [userState, login, loginWithToken, logout, isLoading, isAuthReady, isAuthenticated, refreshUser, setUser]
  );

  // Εμφάνιση του spinner μόνο κατά το αρχικό φόρτωμα για πολύ σύντομο διάστημα
  // Αν το isAuthReady δεν έχει γίνει true μετά από λίγο, προχωράμε κανονικά
  // για να αποφύγουμε το infinite loading
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
