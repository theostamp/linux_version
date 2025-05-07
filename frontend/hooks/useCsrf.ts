import { useEffect } from 'react';
import { getBaseUrl } from '@/lib/config';

export default function useEnsureCsrf(): boolean {
  useEffect(() => {
    async function fetchToken() {
      const base = getBaseUrl(); // παίρνουμε με ασφάλεια το base URL
      try {
        const res = await fetch(`${base}/csrf/`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`CSRF fetch failed: ${res.status}`);
      } catch (err) {
        console.error(err);
      }
    }
    fetchToken();
  }, []);

  // Μπορούμε να γυρίσουμε true αμέσως, το hook φροντίζει να κάνει το fetch
  return true;
}
