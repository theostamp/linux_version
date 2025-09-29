// frontend/app/buildings/[id]/layout.tsx

'use client';

import { ReactNode } from 'react';
import { BuildingProvider } from '@/components/contexts/BuildingContext';

export default function BuildingLayout({ children }: { children: ReactNode }) {
  return (
    <BuildingProvider>
      {children}
    </BuildingProvider>
  );
}