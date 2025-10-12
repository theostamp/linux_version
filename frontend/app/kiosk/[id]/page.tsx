'use client';

import KioskAppSimple from '@/components/kiosk/KioskAppSimple';
import KioskSceneRenderer from '@/components/KioskSceneRenderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, use } from 'react';
import { useSearchParams } from 'next/navigation';

const queryClient = new QueryClient();

export default function KioskPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const [buildingId, setBuildingId] = useState<number | null>(parseInt(resolvedParams.id) || 1);
  
  // Check if scene mode is requested
  const mode = searchParams.get('mode');
  const isSceneMode = mode === 'scene';

  const handleBuildingChange = (newBuildingId: number | null) => {
    setBuildingId(newBuildingId);
  };

  // If scene mode, render the scene renderer
  if (isSceneMode) {
    return <KioskSceneRenderer selectedBuildingId={buildingId} />;
  }

  // Default: render simple kiosk
  return (
    <QueryClientProvider client={queryClient}>
      <KioskAppSimple buildingId={buildingId || undefined} onBuildingChange={handleBuildingChange} />
    </QueryClientProvider>
  );
}
