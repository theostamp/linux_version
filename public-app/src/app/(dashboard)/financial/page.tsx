'use client';

import React from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAuth } from '@/components/contexts/AuthContext';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import ErrorMessage from '@/components/ErrorMessage';
import { DollarSign, AlertCircle } from 'lucide-react';

function FinancialContent() {
  const { isLoading: authLoading } = useAuth();
  const { currentBuilding, selectedBuilding, isLoading: buildingLoading, error } = useBuilding();

  if (authLoading || buildingLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="w-8 h-8 text-green-600" />
        <h1 className="text-3xl font-bold">💰 Οικονομικά</h1>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-900 mb-2">⚠️ Component Missing</h3>
            <p className="text-sm text-yellow-800 mb-4">
              Το FinancialPage component λείπει. Χρειάζεται να δημιουργηθεί για να λειτουργήσει αυτή η σελίδα.
            </p>
            <p className="text-xs text-yellow-700 mb-2">
              Το component χρειάζεται πολλά υπο-components:
            </p>
            <ul className="text-xs text-yellow-700 list-disc list-inside space-y-1">
              <li>CommonExpenseCalculatorNew</li>
              <li>ExpenseForm</li>
              <li>TransactionHistory</li>
              <li>ChartsContainer</li>
              <li>BulkImportWizard</li>
              <li>ExpenseList</li>
              <li>BuildingOverviewSection</li>
              <li>ApartmentBalancesTab</li>
              <li>MeterReadingList</li>
              <li>MonthSelector</li>
            </ul>
            <p className="text-xs text-yellow-700 mt-4">
              Επίσης χρειάζονται hooks: useFinancialPermissions, useFinancialAutoRefresh, useModalState
            </p>
            {buildingId && (
              <div className="mt-4 p-4 bg-white rounded border">
                <p className="text-sm font-medium mb-2">Τρέχον Κτίριο:</p>
                <p className="text-sm">ID: {buildingId}</p>
                <p className="text-sm text-gray-600">
                  {selectedBuilding?.name || currentBuilding?.name || 'Άγνωστο'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
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

