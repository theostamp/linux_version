'use client';

import { useState, useEffect } from 'react';
import { usePublicInfo } from '@/hooks/usePublicInfo';
import { useBuildingChange } from '@/hooks/useBuildingChange';
import KioskMode from '@/components/KioskMode';
import KioskSidebar from '@/components/KioskSidebar';
import FullPageSpinner from '@/components/FullPageSpinner';
import { fetchAllBuildingsPublic } from '@/lib/api';
import { useSearchParams } from 'next/navigation';

export default function KioskPage() {
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(true);
  const searchParams = useSearchParams();

  // Use the selected building ID for data fetching
  const { data, isLoading, error, isFetching } = usePublicInfo(selectedBuildingId ?? null);

  // Use the building change hook
  const { isChangingBuilding, changeBuilding } = useBuildingChange({
    onBuildingChange: (buildingId) => {
      setSelectedBuildingId(buildingId);
    },
    onError: (error) => {
      console.error('Building change error:', error);
    },
    showToast: false // Disable toast notifications for kiosk mode
  });

  // Load all buildings for selection
  useEffect(() => {
    async function loadBuildings() {
      try {
        const buildingsData = await fetchAllBuildingsPublic();
        setBuildings(buildingsData);
        
        // Check URL parameter for building ID
        const buildingParam = searchParams.get('building');
        if (buildingParam) {
          const buildingId = parseInt(buildingParam);
          if (!isNaN(buildingId)) {
            setSelectedBuildingId(buildingId);
          } else {
            // Fallback to null (all buildings) if invalid ID
            setSelectedBuildingId(null);
          }
        } else {
          // Auto-select first building if no URL parameter
          if (buildingsData.length > 0) {
            setSelectedBuildingId(buildingsData[0].id);
          } else {
            setSelectedBuildingId(null);
          }
        }
      } catch (error) {
        console.error('Failed to load buildings:', error);
        setSelectedBuildingId(null);
      } finally {
        setIsLoadingBuildings(false);
      }
    }
    loadBuildings();
  }, [searchParams]);

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
    <div className="flex h-screen w-screen overflow-hidden max-w-full max-h-full">
      {/* Weather and Advertisement Sidebar - Left Side */}
      <KioskSidebar buildingInfo={data?.building_info} />
      
      {/* Main Kiosk Content - Right Side */}
      <div className="flex-1 overflow-hidden min-w-0 relative">
        {/* Loading overlay during building change */}
        {isChangingBuilding && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white bg-opacity-90 rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-700 font-medium">Αλλαγή κτιρίου...</p>
            </div>
          </div>
        )}
        
        {/* Data loading indicator */}
        {isFetching && !isChangingBuilding && (
          <div className="absolute top-4 right-4 z-40">
            <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              <span>Ενημέρωση...</span>
            </div>
          </div>
        )}
        
        <KioskMode
          announcements={data?.announcements ?? []}
          votes={data?.votes ?? []}
          buildingInfo={data?.building_info}
          advertisingBanners={data?.advertising_banners}
          generalInfo={data?.general_info}
          onBuildingChange={changeBuilding}
          isLoading={isLoading}
          isError={!!error}
          isFetching={isFetching}
        />
      </div>
    </div>
  );
} 