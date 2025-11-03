// frontend/hooks/useCurrentUser.ts
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/types/user';

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<User>('/users/me/')
      .then(res => setUser(res.data))
      .catch(err => {
        console.error('[useCurrentUser] Failed to fetch /users/me/:', err);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
