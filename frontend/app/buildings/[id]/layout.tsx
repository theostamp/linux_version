// frontend/app/buildings/[id]/layout.tsx

'use client';

import { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import { BuildingProvider } from '@/components/contexts/BuildingContext';
import NewsTicker from '@/components/NewsTicker';

export default function BuildingLayout({ children }: { children: ReactNode }) {
  return (
    <BuildingProvider>
      <div className="flex min-h-screen">
        <aside className="w-64 bg-gray-100 border-r">
          <Sidebar />
        </aside>
        <div className="flex flex-col flex-1">
          <main className="flex-1 p-4 overflow-y-auto">
            {children}
          </main>
          <NewsTicker />
        </div>
      </div>
    </BuildingProvider>
  );
}