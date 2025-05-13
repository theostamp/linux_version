'use client';

import {
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
} from '@/lib/api';

type AuthCtx = {
  user: User | null;
  login: (u: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Δοκιμάζουμε να φέρουμε τον τρέχοντα χρήστη,
  // αλλά ακόμη κι αν αποτύχει συνεχίζουμε κανονικά.
  useEffect(() => {
    (async () => {
      try {
        const me = await getCurrentUser();
        setUser(me);
      } catch {
        setUser(null);
      }
    })();
  }, []);

  const login = async (username: string, password: string) => {
    await loginUser(username, password);
    const me = await getCurrentUser();
    setUser(me);
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
