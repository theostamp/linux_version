'use client';

import KioskAppSimple from '@/components/kiosk/KioskAppSimple';

export default function SimpleKioskPage() {
  const handleBuildingChange = (buildingId: number | null) => {
    console.log('Building changed to:', buildingId);
  };

  return (
    <KioskAppSimple 
      buildingId={1} 
      onBuildingChange={handleBuildingChange} 
    />
  );
}
