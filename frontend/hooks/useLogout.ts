// frontend/hooks/useLogout.ts

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
      await logoutUser(); // Εάν πετάει token από backend
    } catch (err: any) {
      console.error("Logout API error:", err);
      toast.error(err.message ?? 'Αποτυχία αποσύνδεσης');
    } finally {
      // Fallback client-side cleanup
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
