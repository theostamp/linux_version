'use client';

import { useEffect, useState, useRef } from 'react';
import { apiGet } from '@/lib/api';

export default function useCsrf(): boolean {
  const [ready, setReady] = useState(false);
  const hasTriedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple attempts
    if (hasTriedRef.current) return;

    async function fetchToken() {
      hasTriedRef.current = true;
      try {
        await apiGet('/csrf/');
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
