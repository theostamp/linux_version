/**
 * Example Component: Loading States Usage
 *
 * Αυτό το component δείχνει πώς να χρησιμοποιείς τα νέα loading states
 * από το BuildingContext.
 *
 * Usage:
 *   import { BuildingContextLoadingExample } from '@/components/BuildingContextLoadingExample';
 *
 *   <BuildingContextLoadingExample />
 */

'use client';

import React from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export const BuildingContextLoadingExample = () => {
  const {
    selectedBuilding,
    buildingContext,
    isLoadingContext,
    contextError,
    permissions,
  } = useBuilding();

  // Case 1: No building selected
  if (!selectedBuilding) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="flex items-center gap-2 text-gray-600">
          <AlertCircle className="h-5 w-5" />
          <span>Δεν έχει επιλεγεί κτίριο</span>
        </div>
      </div>
    );
  }

  // Case 2: Loading context
  if (isLoadingContext) {
    return (
      <div className="p-4 border rounded-lg bg-blue-50">
        <div className="flex items-center gap-2 text-blue-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Φόρτωση δεδομένων κτιρίου...</span>
        </div>
      </div>
    );
  }

  // Case 3: Error loading context
  if (contextError) {
    return (
      <div className="p-4 border rounded-lg bg-red-50">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <div>
            <div className="font-semibold">Σφάλμα φόρτωσης</div>
            <div className="text-sm">{contextError}</div>
          </div>
        </div>
      </div>
    );
  }

  // Case 4: Context loaded successfully
  if (!buildingContext) {
    return (
      <div className="p-4 border rounded-lg bg-yellow-50">
        <div className="flex items-center gap-2 text-yellow-700">
          <AlertCircle className="h-5 w-5" />
          <span>Δεν υπάρχουν δεδομένα κτιρίου</span>
        </div>
      </div>
    );
  }

  // Case 5: Success - show building data
  return (
    <div className="p-4 border rounded-lg bg-green-50">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-700 mt-0.5" />
        <div className="flex-1">
          <div className="font-semibold text-green-900 mb-2">
            {buildingContext.name}
          </div>

          <div className="space-y-1 text-sm text-green-800">
            <div>Διαμερίσματα: {buildingContext.apartments_count}</div>
            <div>Διεύθυνση: {buildingContext.address}, {buildingContext.city}</div>
            <div>Αποθεματικό: €{buildingContext.current_reserve}</div>
          </div>

          {permissions && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <div className="text-xs font-semibold text-green-900 mb-1">
                Δικαιώματα:
              </div>
              <div className="flex flex-wrap gap-2">
                {permissions.can_edit && (
                  <span className="px-2 py-1 bg-green-200 text-green-900 rounded text-xs">
                    Επεξεργασία
                  </span>
                )}
                {permissions.can_delete && (
                  <span className="px-2 py-1 bg-red-200 text-red-900 rounded text-xs">
                    Διαγραφή
                  </span>
                )}
                {permissions.can_manage_financials && (
                  <span className="px-2 py-1 bg-blue-200 text-blue-900 rounded text-xs">
                    Διαχείριση Οικονομικών
                  </span>
                )}
                {permissions.can_view && (
                  <span className="px-2 py-1 bg-gray-200 text-gray-900 rounded text-xs">
                    Προβολή
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Usage Example in a Page Component
 */
export const ExampleUsagePage = () => {
  const { isLoadingContext, contextError } = useBuilding();

  // Pattern 1: Early return για loading
  if (isLoadingContext) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="text-lg text-gray-600">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  // Pattern 2: Early return για errors
  if (contextError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Σφάλμα</h3>
              <p className="text-sm text-red-800">{contextError}</p>
              <button
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={() => window.location.reload()}
              >
                Δοκιμάστε ξανά
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pattern 3: Normal content
  return (
    <div className="p-6">
      <BuildingContextLoadingExample />
      {/* Rest of your page content */}
    </div>
  );
};
