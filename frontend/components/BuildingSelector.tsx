'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Building } from '@/lib/api';
import { Search, Building as BuildingIcon, Check, X } from 'lucide-react';

interface BuildingSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onBuildingSelect: (building: Building | null) => void;
  selectedBuilding: Building | null;
}

export default function BuildingSelector({
  isOpen,
  onClose,
  onBuildingSelect,
  selectedBuilding,
}: BuildingSelectorProps) {
  const { buildings, isLoading } = useBuilding();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBuildings, setFilteredBuildings] = useState<Building[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  // Φιλτράρισμα κτιρίων βάσει του search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredBuildings(buildings);
    } else {
      const filtered = buildings.filter(building =>
        building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        building.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (building.city && building.city.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredBuildings(filtered);
    }
  }, [searchTerm, buildings]);

  // Κλείσιμο modal με ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Κλείσιμο modal με κλικ έξω
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleBuildingSelect = (building: Building | null) => {
    onBuildingSelect(building);
    onClose();
    setSearchTerm('');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <BuildingIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Επιλογή Κτιρίου</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Αναζήτηση κτιρίου..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              Φόρτωση κτιρίων...
            </div>
          ) : (
            <>
              {/* Επιλογή "Όλα" */}
              <div
                onClick={() => handleBuildingSelect(null)}
                className={`flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedBuilding === null ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <BuildingIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Όλα τα Κτίρια</div>
                    <div className="text-sm text-gray-500">Προβολή όλων των κτιρίων</div>
                  </div>
                </div>
                {selectedBuilding === null && (
                  <Check className="w-5 h-5 text-blue-600" />
                )}
              </div>

              {/* Διαχωριστική γραμμή */}
              <div className="border-t border-gray-200 mx-4"></div>

              {/* Λίστα κτιρίων */}
              {filteredBuildings.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? 'Δεν βρέθηκαν κτίρια' : 'Δεν υπάρχουν διαθέσιμα κτίρια'}
                </div>
              ) : (
                filteredBuildings.map((building) => (
                  <div
                    key={building.id}
                    onClick={() => handleBuildingSelect(building)}
                    className={`flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedBuilding?.id === building.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <BuildingIcon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{building.name}</div>
                        <div className="text-sm text-gray-500">
                          {building.address}
                          {building.city && `, ${building.city}`}
                        </div>
                      </div>
                    </div>
                    {selectedBuilding?.id === building.id && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Επιλέξτε ένα κτίριο για φιλτράρισμα ή "Όλα τα Κτίρια" για προβολή όλων
          </div>
        </div>
      </div>
    </div>
  );
} 