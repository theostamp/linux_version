'use client';

import React from 'react';
import type { Building } from '@/lib/api';
import { Building as BuildingIcon, MapPin, Users } from 'lucide-react';

interface SelectedBuildingInfoProps {
  selectedBuilding: Building | null;
}

export default function SelectedBuildingInfo({ selectedBuilding }: SelectedBuildingInfoProps) {
  if (!selectedBuilding) return null;

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-6 border border-green-200">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
          <BuildingIcon className="w-6 h-6 text-green-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{selectedBuilding.name}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{selectedBuilding.address}</span>
              {selectedBuilding.city && <span>, {selectedBuilding.city}</span>}
            </div>
            {selectedBuilding.postal_code && (
              <span className="text-gray-500">{selectedBuilding.postal_code}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Επιλεγμένο Κτίριο</div>
          <div className="text-xs text-gray-500">Φιλτράρισμα ενεργό</div>
        </div>
      </div>
    </div>
  );
} 