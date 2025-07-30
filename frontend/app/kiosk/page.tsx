'use client';

import { useState, useEffect } from 'react';
import { usePublicInfo } from '@/hooks/usePublicInfo';
import KioskMode from '@/components/KioskMode';
import KioskSidebar from '@/components/KioskSidebar';
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
      <div className="h-screen w-screen bg-gradient-to-br from-red-900 to-red-800 flex items-center justify-center text-white font-ubuntu">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Σφάλμα Φόρτωσης</h1>
          <p className="text-red-200 text-lg mb-6">
            Δεν ήταν δυνατή η φόρτωση των πληροφοριών.
          </p>
          <div className="text-sm text-red-300">
            <p>Πατήστε <kbd className="px-2 py-1 bg-red-700 rounded text-xs">Ctrl + Alt + B</kbd> για επιλογή κτιρίου</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 overflow-hidden">
      {/* Weather and Advertisement Sidebar - Left Side */}
      <KioskSidebar />
      
      {/* Main Kiosk Content - Right Side */}
      <div className="flex-1 overflow-hidden">
        <KioskMode
          announcements={data?.announcements ?? []}
          votes={data?.votes ?? []}
          buildingInfo={data?.building_info}
          advertisingBanners={data?.advertising_banners}
          generalInfo={data?.general_info}
        />
      </div>
    </div>
  );
} 