// frontend/hooks/useCsrf.ts
import { useEffect, useState, useRef } from 'react';
import { getBaseUrl } from '@/lib/config';

export default function useEnsureCsrf(): boolean {
  const [ready, setReady] = useState(false);
  const hasTriedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple attempts
    if (hasTriedRef.current) return;
    
    async function fetchToken() {
      hasTriedRef.current = true;
      const base = getBaseUrl();
      try {
        const res = await fetch(`${base}/csrf/`, {
          credentials: 'include',
        });
        if (!res.ok) {
          console.error('CSRF fetch failed:', res.status);
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
