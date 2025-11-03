// frontend/hooks/useCsrf.ts
import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';

export default function useEnsureCsrf(): boolean {
  const [ready, setReady] = useState(false);
  const hasTriedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple attempts
    if (hasTriedRef.current) return;
    
    async function fetchToken() {
      hasTriedRef.current = true;
      try {
        const res = await api.get('/csrf/');
        if (!res || (res as any).status !== 200) {
          console.error('CSRF fetch failed:', (res as any)?.status);
          return;
        }
        setReady(true);
      } catch (err) {
        console.error('CSRF token error:', err);
        // Don't retry on network error to prevent infinite loops
      }
    }

    fetchToken();
  }, []);

  return ready;
}
