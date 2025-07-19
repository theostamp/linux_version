'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/components/contexts/AuthContext';
import { BuildingProvider } from '@/components/contexts/BuildingContext';
import { ReactQueryProvider } from '@/components/contexts/ReactQueryProvider';
import LayoutWrapper from '@/components/LayoutWrapper';

export default function AppProviders({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const isPublicDisplay = pathname?.startsWith('/info-screen');

  if (isPublicDisplay) {
    return (
      <ReactQueryProvider>
        <LayoutWrapper>{children}</LayoutWrapper>
      </ReactQueryProvider>
    );
  }

  return (
    <ReactQueryProvider>
      <AuthProvider>
        <BuildingProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </BuildingProvider>
      </AuthProvider>
    </ReactQueryProvider>
  );
}