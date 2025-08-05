'use client';

import React from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAuth } from '@/components/contexts/AuthContext';
import AuthGate from '@/components/AuthGate';
import LoginForm from '@/components/LoginForm';
import ErrorMessage from '@/components/ErrorMessage';
import { FinancialPage } from '@/components/financial/FinancialPage';

export default function Financial() {
  const { isLoading: authLoading, user } = useAuth();
  const { currentBuilding, selectedBuilding, isLoading: buildingLoading, error } = useBuilding();

  // Show loading state while authentication or building data is loading
  if (authLoading || buildingLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Show error if there's an issue loading building data
  if (error) {
    return <ErrorMessage message={`Σφάλμα φόρτωσης δεδομένων κτιρίου: ${error}`} />;
  }

  // Use AuthGate to ensure user is authenticated
  return (
    <AuthGate fallback={<LoginForm />}>
      {/* Use selectedBuilding if available, otherwise currentBuilding */}
      {(selectedBuilding || currentBuilding) ? (
        <FinancialPage buildingId={(selectedBuilding || currentBuilding)!.id} />
      ) : (
        <ErrorMessage message="Δεν βρέθηκε κτίριο. Παρακαλώ επιλέξτε ένα κτίριο από τις ρυθμίσεις." />
      )}
    </AuthGate>
  );
}