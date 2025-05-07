'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { logoutUser } from '@/lib/api';

export default function useLogout() {
  const router = useRouter();
  const { setUser } = useAuth();

  const logout = async () => {
    try {
      await logoutUser();         // καλεί το API
      setUser(null);              // καθαρίζει το context
      toast.success('Αποσυνδεθήκατε');
      router.replace('/dashboard');
    } catch (err: any) {
      toast.error(err.message ?? 'Αποτυχία αποσύνδεσης');
    }
  };

  return logout;
}
