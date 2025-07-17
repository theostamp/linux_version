// frontend/app/buildings/[id]/layout.tsx

'use client';

import { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import { BuildingProvider } from '@/components/contexts/BuildingContext';

export default function BuildingLayout({ children }: { children: ReactNode }) {
  return (
    <BuildingProvider>
      <div className="flex min-h-screen">
        <aside className="w-64 bg-gray-100 border-r">
          <Sidebar />
        </aside>
        <main className="flex-1 p-4 overflow-y-auto">
          {children}
        </main>
      </div>
    </BuildingProvider>
  );
}