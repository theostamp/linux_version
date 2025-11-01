'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import React from 'react';

type Me = {
  id: number;
  email: string;
  role?: string | null;  // Backward compat (same as system_role)
  system_role?: 'superuser' | 'admin' | 'manager' | null;  // CustomUser.SystemRole
  resident_role?: 'manager' | 'owner' | 'tenant' | null;  // Resident.Role (apartment level)
  resident_profile?: {
    apartment: string;
    building_id: number;
    building_name: string;
    phone?: string | null;
  } | null;
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
  // Use system_role if available, fallback to role (backward compat)
  const systemRole = userData?.system_role ?? userData?.role ?? null;
  const residentRole = userData?.resident_role ?? null;
  
  // isAdmin: Ultra Admin (superuser or admin SystemRole)
  const isAdmin = !!userData?.is_superuser || systemRole === 'admin' || systemRole === 'superuser';
  // isManager: Django Tenant Owner (manager SystemRole)
  const isManager = !!userData?.is_staff || systemRole === 'manager';
  
  return { 
    role: systemRole,  // Backward compat (system role)
    systemRole, 
    residentRole,
    isAdmin, 
    isManager, 
    isLoading 
  };
}

export function useResidentRole() {
  const { data } = useMe();
  return {
    residentRole: data?.resident_role ?? null,
    residentProfile: data?.resident_profile ?? null,
  };
}

// Note: CustomUser.role (SystemRole) can only be 'superuser', 'admin', or 'manager'
// 'tenant', 'owner', 'staff', 'resident' are NOT SystemRole - they are Resident.Role (apartment level)
// SystemRole: 'superuser'/'admin' = Ultra Admin, 'manager' = Django Tenant Owner
export function withAuth<TProps extends Record<string, any> = any>(
  Component: React.ComponentType<TProps>, 
  allowedRoles: Array<'superuser' | 'admin' | 'manager'> = ['admin', 'manager']
) {
  return function Protected(componentProps: TProps) {
    const { systemRole, isAdmin, isManager, isLoading } = useRole();
    if (isLoading) return null;
    
    // Map 'admin' to also allow 'superuser' (both are Ultra Admin)
    const hasAdminAccess = isAdmin && (
      allowedRoles.includes('admin') || 
      allowedRoles.includes('superuser') ||
      (systemRole === 'superuser' && allowedRoles.includes('admin'))
    );
    const hasManagerAccess = isManager && allowedRoles.includes('manager');
    const hasSuperuserAccess = systemRole === 'superuser' && allowedRoles.includes('superuser');
    
    const ok = hasAdminAccess || hasManagerAccess || hasSuperuserAccess;
    
    if (!ok) {
      if (typeof window !== 'undefined') window.location.replace('/');
      return null;
    }
    return React.createElement(Component as any, componentProps as any);
  };
}


