'use client';

import { useParams } from 'next/navigation';
import KioskSettings from '@/components/KioskSettings';

export default function KioskSettingsPage() {
  const params = useParams();
  const buildingId = params.buildingId ? Number(params.buildingId) : undefined;

  return (
    <div className="container mx-auto py-6">
      <KioskSettings buildingId={buildingId} />
    </div>
  );
} 