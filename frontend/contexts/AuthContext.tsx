'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  User,
  api,                           // ⬅️ για να βάλουμε default header
} from '@/lib/api';

type AuthCtx = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // ------------------------------------------------------------
  //  Φόρτωσε τον τρέχοντα χρήστη αν υπάρχει token στο localStorage
  // ------------------------------------------------------------
  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('access');
      if (!token) return;                         // δεν υπάρχει; άρα όχι log-in
      api.defaults.headers.Authorization = `Bearer ${token}`;

      try {
        const me = await getCurrentUser();
        setUser(me);
      } catch {
        // token ήταν άκυρο/έληξε – καθάρισέ το
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        setUser(null);
      }
    })();
  }, []);

  // ------------------------------------------------------------
  //  LOGIN
  // ------------------------------------------------------------
  const login = async (email: string, password: string) => {
    const { access, refresh, user: me } = await loginUser(email, password);

    // αποθήκευσε tokens
    localStorage.setItem('access', access);
    localStorage.setItem('refresh', refresh);
    api.defaults.headers.Authorization = `Bearer ${access}`;

    setUser(me);
  };

  // ------------------------------------------------------------
  //  LOGOUT
  // ------------------------------------------------------------
  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      delete api.defaults.headers.Authorization;
      setUser(null);
    }
  };

  const contextValue = React.useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
