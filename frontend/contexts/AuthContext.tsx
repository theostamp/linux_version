// frontend/contexts/AuthContext.tsx

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
}

interface AuthContextType {
  user: User | null;
  /** Fetching current user on app load */
  loadingAuth: boolean;
  /** During login/logout operations */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

  const fetchUser = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setUser(null);
      setLoadingAuth(false);
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/users/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        // Άκυρο ή ληγμένο token
        localStorage.removeItem('accessToken');
        setUser(null);
      } else if (res.ok) {
        const data: User = await res.json();
        setUser(data);
      } else {
        console.warn('fetchUser unexpected status:', res.status);
        setUser(null);
      }
    } catch (err) {
      console.error('fetchUser error:', err);
      setUser(null);
    } finally {
      setLoadingAuth(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/users/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Σφάλμα ${res.status}`);
      }

      const { access } = await res.json();
      localStorage.setItem('accessToken', access);
      await fetchUser();
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loadingAuth, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
