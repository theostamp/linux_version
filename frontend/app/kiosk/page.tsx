'use client';

import { useState, useEffect } from 'react';
import { usePublicInfo } from '@/hooks/usePublicInfo';
import KioskMode from '@/components/KioskMode';
import FullPageSpinner from '@/components/FullPageSpinner';
import { fetchAllBuildings } from '@/lib/api';

export default function KioskPage() {
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(true);

  // Load all buildings for selection
  useEffect(() => {
    async function loadBuildings() {
      try {
        const buildingsData = await fetchAllBuildings();
        setBuildings(buildingsData);
        // Auto-select first building if available
        if (buildingsData.length > 0) {
          setSelectedBuildingId(buildingsData[0].id);
        }
      } catch (error) {
        console.error('Failed to load buildings:', error);
      } finally {
        setIsLoadingBuildings(false);
      }
    }
    loadBuildings();
  }, []);

  // Use the selected building ID for data fetching
  const { data, isLoading, error } = usePublicInfo(selectedBuildingId || 1);

  if (isLoadingBuildings) {
    return <FullPageSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-800 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Σφάλμα Φόρτωσης</h1>
          <p className="text-red-200">
            Δεν ήταν δυνατή η φόρτωση των πληροφοριών.
          </p>
        </div>
      </div>
    );
  }

  return (
    <KioskMode
      announcements={data?.announcements ?? []}
      votes={data?.votes ?? []}
      buildingInfo={data?.building_info}
      advertisingBanners={data?.advertising_banners}
      generalInfo={data?.general_info}
    />
  );
} 