'use client';

import React, { useState } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { HelpCircle, X, Info } from 'lucide-react';

interface BuildingContextHelpProps {
  className?: string;
}

export default function BuildingContextHelp({ className = '' }: BuildingContextHelpProps) {
  const { selectedBuilding, currentBuilding } = useBuilding();
  const [showHelp, setShowHelp] = useState(false);

  // Αν δεν υπάρχει διαφορά μεταξύ επιλεγμένου και τρέχοντος, δεν χρειάζεται βοήθεια
  if (!selectedBuilding || selectedBuilding.id === currentBuilding?.id) {
    return null;
  }

  return (
    <div className={className}>
      {/* Help Button */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="inline-flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg border border-amber-200 transition-colors"
      >
        <HelpCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Βοήθεια</span>
      </button>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Κατανόηση Προβολής
              </h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-700">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">🏢 Τρέχον Κτίριο</h4>
                <p className="text-blue-800">
                  Βρίσκεστε στο: <strong>{currentBuilding?.name}</strong>
                </p>
              </div>

              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <h4 className="font-medium text-orange-900 mb-2">🔍 Φιλτράρισμα</h4>
                <p className="text-orange-800">
                  Βλέπετε αιτήματα από: <strong>{selectedBuilding.name}</strong>
                </p>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">💡 Τι σημαίνει αυτό;</h4>
                <ul className="space-y-1 text-gray-700">
                  <li>• Βλέπετε αιτήματα από άλλο κτίριο</li>
                  <li>• Μπορείτε να δημιουργήσετε νέο αίτημα</li>
                  <li>• Για να επιστρέψετε στο τρέχον κτίριο, επιλέξτε "Όλα τα κτίρια"</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowHelp(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Κατάλαβα
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 