'use client';

import { ReactNode } from 'react';
import GlobalLoadingOverlay from '@/components/GlobalLoadingOverlay';

export default function LayoutWrapper({ children }: { readonly children: ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
      <GlobalLoadingOverlay />
    </div>
  );
}
