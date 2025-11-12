'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/components/contexts/AuthContext';
import { logoutUser } from '@/lib/api';

export default function useLogout() {
  const router = useRouter();
  const { setUser } = useAuth();

  const logout = async () => {
    try {
      await logoutUser();
    } catch (err: unknown) {
      console.error("Logout API error:", err);
      const error = err as { message?: string };
      toast.error(error.message ?? 'Αποτυχία αποσύνδεσης');
    } finally {
      // Fallback client-side cleanup
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
      setUser(null);
      toast.success('Αποσυνδεθήκατε');
      router.replace('/login');
    }
  };

  return logout;
}

