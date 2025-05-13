import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { getCurrentUser, User } from '@/lib/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let didCancel = false;

    async function fetchUser() {
      try {
        const u = await getCurrentUser();
        if (!didCancel) setUser(u);
      } catch (err: any) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          // απλώς δεν είμαστε logged-in
          if (!didCancel) setUser(null);
        } else {
          console.error('Auth fetch failed:', err);
        }
      } finally {
        if (!didCancel) setLoading(false);
      }
    }

    fetchUser();
    return () => { didCancel = true; };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
