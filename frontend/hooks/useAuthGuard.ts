import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/api';

export function useAuthGuard() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        await getCurrentUser();
      } catch (err) {
        console.error('Authentication check failed:', err);
        router.replace('/login');
      }
    }

    checkAuth();
  }, [router]);
}
