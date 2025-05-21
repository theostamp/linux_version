// frontend/hooks/useEnsureCsrf.ts
import { useEffect, useState } from 'react';
import { getBaseUrl } from '@/lib/config';

export default function useEnsureCsrf(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function fetchToken() {
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
      }
    }

    fetchToken();
  }, []);

  return ready;
}
