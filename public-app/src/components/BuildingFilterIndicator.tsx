'use client';

import React from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Building as BuildingIcon, Filter, MapPin } from 'lucide-react';

interface BuildingFilterIndicatorProps {
  className?: string;
}

export default function BuildingFilterIndicator({ className = '' }: BuildingFilterIndicatorProps) {
  const { selectedBuilding, currentBuilding } = useBuilding();

  // Αν δεν υπάρχει επιλεγμένο κτίριο, δείχνουμε μόνο το τρέχον
  if (!selectedBuilding) {
    return (
      <div className={`flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 ${className}`}>
        <MapPin className="w-4 h-4" />
        <span>
          Τρέχον κτίριο: <span className="font-medium">{currentBuilding ? currentBuilding.name : 'Όλα τα κτίρια'}</span>
        </span>
      </div>
    );
  }

  // Αν το επιλεγμένο είναι ίδιο με το τρέχον, δείχνουμε ότι βρισκόμαστε στο κτίριο
  if (selectedBuilding.id === currentBuilding?.id) {
    return (
      <div className={`flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200 ${className}`}>
        <BuildingIcon className="w-4 h-4" />
        <span>
          Βρίσκεστε στο: <span className="font-medium">{selectedBuilding.name}</span>
        </span>
      </div>
    );
  }

  // Αν το επιλεγμένο είναι διαφορετικό από το τρέχον, δείχνουμε φιλτράρισμα
  return (
    <div className={`flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200 ${className}`}>
      <Filter className="w-4 h-4" />
      <span>
        Φιλτράρισμα: <span className="font-medium">{selectedBuilding.name}</span>
        {currentBuilding && (
          <span className="text-orange-500 ml-2">
            (από το {currentBuilding.name})
          </span>
        )}
      </span>
    </div>
  );
}
