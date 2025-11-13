'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
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

  const buildingId = selectedBuilding?.id || currentBuilding?.id;

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
        router.replace('/financial');
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

