'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback, // Προσθήκη useCallback για τις συναρτήσεις login/logout
} from 'react';
import {
  getCurrentUser,
  loginUser, // Υποθέτουμε ότι αυτή χειρίζεται την αποθήκευση των tokens στο localStorage μέσω του api.ts
  logoutUser as apiLogoutUser, // Μετονομασία για αποφυγή σύγκρουσης
  User,
  // Το 'api' instance δεν χρειάζεται να το εισάγουμε εδώ αν δεν ορίζουμε default headers απευθείας
} from '@/lib/api';

interface AuthCtx { // Καλύτερα να χρησιμοποιούμε interface για τον τύπο του context
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean; // Για να ξέρουμε αν γίνεται αρχική φόρτωση χρήστη
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Ξεκινάμε με true

  // Συνάρτηση για καθαρισμό κατάστασης και localStorage (client-side logout)
  const performClientLogout = useCallback(() => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user'); // Αν αποθηκεύεις και το αντικείμενο user
    setUser(null);
    // Δεν χρειάζεται να πειράξουμε το api.defaults.headers.Authorization αν δεν το ορίζουμε ποτέ απευθείας εδώ.
    // Ο request interceptor στο lib/api.ts θα βλέπει ότι δεν υπάρχει token.
    console.log("AuthContext: Client-side logout performed.");
  }, []);

  // Φόρτωσε τον τρέχοντα χρήστη κατά την αρχικοποίηση
  useEffect(() => {
    const loadUserOnMount = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('access');

      if (!token) {
        setUser(null); // Βεβαιώνει ότι ο χρήστης είναι null αν δεν υπάρχει token
        setIsLoading(false);
        return;
      }

      // Δεν χρειάζεται να ορίσουμε το api.defaults.headers.Authorization εδώ.
      // Ο request interceptor στο lib/api.ts θα το χειριστεί.

      try {
        // Η getCurrentUser θα χρησιμοποιήσει το 'api' instance από το lib/api.ts,
        // το οποίο έχει τους interceptors. Αν το token λήξει, ο response interceptor
        // θα προσπαθήσει να το ανανεώσει.
        const me = await getCurrentUser();
        setUser(me);
      } catch (error) {
        console.error(
          "AuthContext: Error fetching current user on initial load. This might be due to an expired token that failed to refresh, or other auth issue.",
          error
        );
        // Σε αυτό το σημείο, οι interceptors του lib/api.ts θα έπρεπε να έχουν ήδη προσπαθήσει για refresh.
        // Αν η getCurrentUser() αποτύχει ακόμα και μετά από πιθανή προσπάθεια refresh από τον interceptor,
        // σημαίνει ότι η αυθεντικοποίηση έχει αποτύχει οριστικά.
        // Ο response interceptor στο lib/api.ts θα έπρεπε ιδανικά να έχει ήδη καθαρίσει τα tokens
        // αν η ανανέωση απέτυχε. Εδώ, απλά εξασφαλίζουμε ότι η κατάσταση του χρήστη είναι null.
        // Μια πιο προχωρημένη λύση θα ήταν ο interceptor να καλεί απευθείας το performClientLogout
        // ή να εκπέμπει ένα event που ο AuthContext θα άκουγε.
        // Προς το παρόν, αν φτάσει σφάλμα εδώ, ειδικά 401, θεωρούμε ότι ο χρήστης δεν είναι συνδεδεμένος.
        // @ts-ignore
        if (error?.response?.status === 401) {
             performClientLogout(); // Καλεί την κεντρική συνάρτηση για καθαρισμό
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadUserOnMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [performClientLogout]); // Προσθήκη performClientLogout στις εξαρτήσεις επειδή χρησιμοποιείται έμμεσα

  const login = useCallback(async (email: string, password: string) => {
    // Η loginUser από το lib/api.ts πρέπει να χειρίζεται την κλήση API
    // και την αποθήκευση των 'access' και 'refresh' tokens στο localStorage.
    // Επίσης, θα πρέπει να επιστρέφει τα δεδομένα του χρήστη.
    const { user: loggedInUser } = await loginUser(email, password); // Υποθέτουμε ότι η loginUser επιστρέφει τον χρήστη
    setUser(loggedInUser);
    // Δεν χρειάζεται να ορίσουμε το api.defaults.headers.Authorization εδώ.
    // Ο request interceptor θα πάρει το νέο token από το localStorage.
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogoutUser(); // Καλεί το backend endpoint για logout
    } catch (error) {
      console.error("AuthContext: Error during API logoutUser call. Proceeding with client-side logout.", error);
    } finally {
      performClientLogout(); // Εκτελεί πάντα τον καθαρισμό από την πλευρά του client
    }
  }, [performClientLogout]);

  // Χρησιμοποιούμε useCallback για τις login/logout ώστε να μην αλλάζουν σε κάθε render εκτός αν αλλάξουν οι εξαρτήσεις τους
  const contextValue = React.useMemo(
    () => ({ user, login, logout, isLoading }),
    [user, login, logout, isLoading]
  );

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