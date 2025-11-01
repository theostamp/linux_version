'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from './api';
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
    queryFn: async () => {
      const { data } = await api.get<Me>('/users/me/');
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('user', JSON.stringify(data)); } catch {}
      }
      return data;
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useRole() {
  const { data, isLoading } = useMe();
  let userData: Me | null = data ?? null;
  if (!userData && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('user');
      if (raw) userData = JSON.parse(raw) as Me;
    } catch {}
  }
  const role = userData?.role ?? null;
  const isAdmin = !!userData?.is_superuser || role === 'admin';
  const isManager = !!userData?.is_staff || role === 'manager';
  return { role, isAdmin, isManager, isLoading };
}

export function withAuth<TProps = any>(Component: (props: TProps) => any, allowedRoles: Array<'admin' | 'manager' | 'tenant'> = ['admin', 'manager', 'tenant']) {
  return function Protected(props: TProps) {
    const { role, isAdmin, isManager, isLoading } = useRole();
    if (isLoading) return null;
    const ok = (
      (allowedRoles && allowedRoles.includes('admin') && isAdmin) ||
      (allowedRoles && allowedRoles.includes('manager') && isManager) ||
      (allowedRoles && allowedRoles.includes('tenant') && role === 'tenant')
    );
    if (!ok) {
      if (typeof window !== 'undefined') window.location.replace('/');
      return null;
    }
    return React.createElement(Component as any, props as any);
  };
}


