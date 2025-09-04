'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from './api';
import React from 'react';

type Me = {
  id: number;
  email: string;
  role?: string | null;
  is_staff?: boolean;
  is_superuser?: boolean;
};

export function useMe() {
  return useQuery<Me>({
    queryKey: ['me'],
    queryFn: () => apiGet('/api/users/me/'),
    staleTime: 60_000,
  });
}

export function useRole() {
  const { data, isLoading } = useMe();
  const role = data?.role ?? null;
  const isAdmin = !!data?.is_superuser || role === 'admin';
  const isManager = !!data?.is_staff || role === 'manager';
  return { role, isAdmin, isManager, isLoading };
}

export function withAuth<TProps = any>(Component: (props: TProps) => any, allowedRoles: Array<'admin' | 'manager' | 'tenant'>) {
  return function Protected(props: TProps) {
    const { role, isAdmin, isManager, isLoading } = useRole();
    if (isLoading) return null;
    const ok = (
      (allowedRoles.includes('admin') && isAdmin) ||
      (allowedRoles.includes('manager') && isManager) ||
      (allowedRoles.includes('tenant') && role === 'tenant')
    );
    if (!ok) {
      if (typeof window !== 'undefined') window.location.replace('/');
      return null;
    }
    // @ts-expect-error allow passing through props
    return React.createElement(Component as any, props as any);
  };
}


