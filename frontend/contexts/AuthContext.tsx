// frontend/contexts/AuthContext.tsx

'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBaseUrl } from '@/lib/config'; // helper για ασφαλές base URL

// Τύπος χρήστη βάσει API
export type User = {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  first_name: string;
  last_name: string;
};

// Τιμές που παρέχει το context
export type AuthContextType = {
  user: User | null;                  // το αντικείμενο χρήστη ή null
  setUser: (user: User | null) => void; // για ενημέρωση μετά το login/logout
  loading: boolean;                   // κατάσταση φόρτωσης
};

// Δημιουργία του context με default τιμές
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
});

// Provider που τυλίγει την εφαρμογή και παρέχει user state
export function AuthProvider({ children }: { readonly children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      try {
        const baseUrl = getBaseUrl();
        // Εξασφαλίζουμε CSRF cookie
        await fetch(`${baseUrl}/csrf/`, { credentials: 'include' });
        // Φόρτωση στοιχείων χρήστη
        const res = await fetch(`${baseUrl}/users/me/`, { credentials: 'include' });
        if (!res.ok) throw new Error('Not authenticated');
        const data: User = await res.json();
        setUser(data);
      } catch (err) {
        console.warn('Authentication failed:', err);
        setUser(null);
        router.push('/login'); // ανακατεύθυνση σε login αν δεν auth
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [router]);

  // Memo για αποφυγή άσκοπων rerenders
  const contextValue = useMemo(() => ({ user, loading, setUser }), [user, loading]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

// Hook για εύκολη πρόσβαση στο AuthContext
export function useAuth() {
  return useContext(AuthContext);
}
