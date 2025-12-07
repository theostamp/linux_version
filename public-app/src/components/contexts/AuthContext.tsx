'use client';

import type { User } from '@/types/user';
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  getCurrentUser,
  loginUser,
  logoutUser as apiLogoutUser,
} from '@/lib/api';
import FullPageSpinner from '@/components/FullPageSpinner';

// Paths where AuthContext should NOT auto-verify tokens (OAuth callbacks handle their own auth)
const AUTH_CALLBACK_PATHS = ['/auth/callback', '/auth/google/callback'];

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

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const [userState, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const initializationStartedRef = useRef(false);
  
  // Check if we're on an auth callback path where OAuth flow handles authentication
  const isAuthCallbackPath = AUTH_CALLBACK_PATHS.some(path => pathname?.startsWith(path));

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
    // Remove both access_token/refresh_token and access/refresh for backward compatibility
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    setUser(null);
    console.log('AuthContext: Client-side logout performed.');
  }, [setUser]);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    try {
      setIsLoading(true);
      const { user: loggedInUser } = await loginUser(email, password);
      setUser(loggedInUser);
      console.log('AuthContext: Login successful for user:', loggedInUser?.email);
      
      // Ensure states are properly set after successful login
      setIsLoading(false);
      setIsAuthReady(true);
      
      return loggedInUser;
    } catch (error) {
      setIsLoading(false);
      console.error('AuthContext: Login failed:', error);
      throw error;
    }
  }, [setUser]);

  const loginWithToken = useCallback(async (token: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Store the token (both access_token and access for backward compatibility)
      localStorage.setItem('access_token', token);
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
      localStorage.removeItem('access_token');
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
      // Check both access_token and access for backward compatibility
      const token = localStorage.getItem('access_token') || localStorage.getItem('access');
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
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const loadUserOnMount = async () => {
      if (hasInitialized || globalAuthInitializing) {
        console.log('[AuthContext] Already initialized or global initialization in progress, skipping...');
        return;
      }

      console.log('[AuthContext] loadUserOnMount starting...');
      globalAuthInitializing = true;
      initializationStartedRef.current = true;
      setHasInitialized(true);
      setIsLoading(true);

      // Set a timeout to prevent infinite hanging
      timeoutId = setTimeout(() => {
        if (!isMounted) return;
        console.error('[AuthContext] Initialization timeout after 5 seconds, forcing ready state');
        setIsLoading(false);
        setIsAuthReady(true);
        globalAuthInitializing = false;
      }, 5000);

      // CRITICAL: Skip auto-verification on auth callback paths
      // The OAuth callback page handles its own authentication flow
      // If we verify here with old tokens, we'll get 401 and clear localStorage
      // before the callback page can store the new tokens
      if (isAuthCallbackPath) {
        console.log('[AuthContext] On auth callback path, skipping auto-verification to allow OAuth flow');
        clearTimeout(timeoutId);
        setIsLoading(false);
        setIsAuthReady(true);
        globalAuthInitializing = false;
        return;
      }

      // Check both access_token and access for backward compatibility
      const token = localStorage.getItem('access_token') || localStorage.getItem('access');
      const cachedUser = localStorage.getItem('user');

      // Skip auto-login to simplify the flow - users can manually login

      if (!token) {
        console.log('[AuthContext] No token found on mount, setting auth as ready');
        if (timeoutId) clearTimeout(timeoutId);
        if (!isMounted) return;
        setUser(null);
        setIsLoading(false);
        setIsAuthReady(true);
        globalAuthInitializing = false;
        return;
      }

      if (cachedUser && token) {
        try {
          const parsedUser = JSON.parse(cachedUser) as User;
          
          // Always verify user data with API to ensure permissions are up to date
          console.log('AuthContext: Found cached user:', parsedUser?.email, 'but will verify with API');
          
          try {
            const freshUser = await getCurrentUser();
            if (!isMounted) {
              globalAuthInitializing = false;
              return;
            }
            setUser(freshUser);
            console.log('AuthContext: Refreshed user data:', freshUser?.email);
          } catch (apiError) {
            if (!isMounted) {
              globalAuthInitializing = false;
              return;
            }
            console.error('AuthContext: Failed to refresh user, clearing auth state:', apiError);
            // Clear invalid auth state
            performClientLogout();
          }

          if (timeoutId) clearTimeout(timeoutId);
          if (!isMounted) {
            globalAuthInitializing = false;
            return;
          }
          setIsLoading(false);
          setIsAuthReady(true);
          globalAuthInitializing = false;
          return;
        } catch (e) {
          if (!isMounted) {
            globalAuthInitializing = false;
            return;
          }
          console.error('AuthContext: Failed to parse cached user', e);
          localStorage.removeItem('user');
          setUser(null);
        }
      }

      try {
        console.log('AuthContext: Fetching current user');
        const me = await getCurrentUser();
        if (!isMounted) {
          globalAuthInitializing = false;
          return;
        }
        setUser(me);
        console.log('AuthContext: Current user fetched successfully:', me?.email);
      } catch (error: unknown) {
        if (!isMounted) {
          globalAuthInitializing = false;
          return;
        }
        console.error('AuthContext: Failed to fetch current user', error);

        // Αν το σφάλμα είναι 401, καθαρίζουμε τα tokens
        const apiError = error as { status?: number; response?: { status?: number } };
        if (apiError?.status === 401 || apiError?.response?.status === 401) {
          console.log('AuthContext: 401 error, clearing tokens');
          performClientLogout();
          // Skip auto-login fallback - keep it simple
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (!isMounted) {
          globalAuthInitializing = false;
          return;
        }
        setIsLoading(false);
        setIsAuthReady(true);
        globalAuthInitializing = false;
      }
    };

    loadUserOnMount();

    // Cleanup function: reset flag if component unmounts before initialization completes
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Only reset if we were the one who set it
      if (globalAuthInitializing && initializationStartedRef.current) {
        console.log('[AuthContext] Component unmounted during initialization, resetting flag');
        globalAuthInitializing = false;
        initializationStartedRef.current = false;
      }
    };
  }, [isAuthCallbackPath]); // Include isAuthCallbackPath to handle OAuth callback paths

  // Compute isAuthenticated based on user state and token existence
  // Check both access_token and access for backward compatibility
  const isAuthenticated = !!userState && (!!localStorage.getItem('access_token') || !!localStorage.getItem('access'));

  // Εκτελούμε έλεγχο του token κάθε λεπτό
  useEffect(() => {
    // TEMPORARILY DISABLED - might be causing hanging issues
    console.log('[AuthContext] Token check interval disabled to debug hanging issue');
    return;
    
    if (!isAuthenticated) return;
    
    const checkTokenInterval = setInterval(() => {
      const token = localStorage.getItem('access_token') || localStorage.getItem('access');
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

