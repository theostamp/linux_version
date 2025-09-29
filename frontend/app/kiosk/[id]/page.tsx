'use client';

import KioskAppSimple from '@/components/kiosk/KioskAppSimple';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, use } from 'react';

const queryClient = new QueryClient();

export default function KioskPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [buildingId, setBuildingId] = useState<number | null>(parseInt(resolvedParams.id) || 1);

  const handleBuildingChange = (newBuildingId: number | null) => {
    setBuildingId(newBuildingId);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <KioskAppSimple buildingId={buildingId || undefined} onBuildingChange={handleBuildingChange} />
    </QueryClientProvider>
  );
}
