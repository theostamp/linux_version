'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAuth } from '@/components/contexts/AuthContext';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import ErrorMessage from '@/components/ErrorMessage';
import { FinancialPage } from '@/components/financial/FinancialPage';
import { Loader2 } from 'lucide-react';

function FinancialContent() {
  const { isLoading: authLoading } = useAuth();
  const { buildings, currentBuilding, selectedBuilding, isLoading: buildingLoading, error } = useBuilding();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastUpdatedBuildingId = useRef<number | null>(null);

  if (authLoading || buildingLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={`Σφάλμα φόρτωσης δεδομένων κτιρίου: ${error}`} />;
  }

  // Read buildingId from URL parameter first, then fallback to selectedBuilding or currentBuilding
  const urlBuildingId = searchParams.get('building');
  const urlBuildingIdNum = urlBuildingId ? parseInt(urlBuildingId, 10) : null;
  
  // Validate URL buildingId exists in available buildings
  const validUrlBuildingId = urlBuildingIdNum && !isNaN(urlBuildingIdNum) && buildings.some(b => b.id === urlBuildingIdNum)
    ? urlBuildingIdNum
    : null;
  
  const buildingId = validUrlBuildingId || selectedBuilding?.id || currentBuilding?.id;
  
  console.log('[FinancialPage] BuildingId resolution:', {
    urlBuildingId,
    urlBuildingIdNum,
    validUrlBuildingId,
    selectedBuildingId: selectedBuilding?.id,
    currentBuildingId: currentBuilding?.id,
    finalBuildingId: buildingId,
  });

  // Update URL when selectedBuilding changes (but only if URL doesn't already have a valid building)
  useEffect(() => {
    if (!buildingLoading && buildings.length > 0 && selectedBuilding?.id) {
      // Skip if we already updated for this buildingId (prevent infinite loop)
      if (lastUpdatedBuildingId.current === selectedBuilding.id) {
        return;
      }
      
      const currentUrlBuilding = searchParams.get('building');
      const currentUrlBuildingNum = currentUrlBuilding ? parseInt(currentUrlBuilding, 10) : null;
      const urlBuildingIsValid = currentUrlBuildingNum && !isNaN(currentUrlBuildingNum) && 
                                  buildings.some(b => b.id === currentUrlBuildingNum);
      
      // Only update URL if:
      // 1. URL doesn't have a building parameter, OR
      // 2. URL has an invalid building parameter, OR
      // 3. selectedBuilding is different from URL building
      if (!urlBuildingIsValid || (currentUrlBuildingNum !== null && currentUrlBuildingNum !== selectedBuilding.id)) {
        const params = new URLSearchParams(window.location.search);
        params.set('building', selectedBuilding.id.toString());
        
        // Preserve other URL parameters (like 'tab')
        const newUrl = `/financial?${params.toString()}`;
        console.log(`[FinancialPage] Updating URL to match selectedBuilding: ${newUrl}`);
        
        // Mark that we've updated for this buildingId
        lastUpdatedBuildingId.current = selectedBuilding.id;
        
        router.replace(newUrl, { scroll: false });
      } else {
        // URL already matches, update ref
        lastUpdatedBuildingId.current = selectedBuilding.id;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBuilding?.id, buildingLoading]);

  if (!buildingId) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <ErrorMessage message="Δεν βρέθηκε κτίριο. Παρακαλώ επιλέξτε ένα κτίριο από τις ρυθμίσεις." />
      </div>
    );
  }

  // Validate that the buildingId exists in available buildings
  // This prevents issues when URL has stale building ID
  if (buildings.length > 0) {
    const buildingExists = buildings.some(b => b.id === buildingId);
    if (!buildingExists) {
      // Redirect to first available building's financial page
      const targetBuilding = selectedBuilding || buildings[0];
      if (targetBuilding && targetBuilding.id !== buildingId) {
        console.log(`[FinancialPage] Building ${buildingId} not found. Redirecting to building ${targetBuilding.id}`);
        const params = new URLSearchParams(searchParams.toString());
        params.set('building', targetBuilding.id.toString());
        router.replace(`/financial?${params.toString()}`);
        return (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
          </div>
        );
      }
    }
  }

  return <FinancialPage buildingId={buildingId} />;
}

export default function Financial() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <FinancialContent />
      </SubscriptionGate>
    </AuthGate>
  );
}

