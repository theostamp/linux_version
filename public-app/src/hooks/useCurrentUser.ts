'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/api';
import type { User } from '@/types/user';

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then(userData => setUser(userData))
      .catch(err => {
        console.error('[useCurrentUser] Failed to fetch current user:', err);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}

