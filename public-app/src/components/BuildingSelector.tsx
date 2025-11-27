'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Building } from '@/lib/api';
import { fetchAllBuildingsPublic } from '@/lib/api';
import { Search, Building as BuildingIcon, Check, X, MapPin } from 'lucide-react';

interface BuildingSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onBuildingSelect: (building: Building | null) => void;
  selectedBuilding: Building | null;
  currentBuilding?: Building | null;
  onManualBuildingSelect?: (id: number) => void;
}

export default function BuildingSelector({
  isOpen,
  onClose,
  onBuildingSelect,
  selectedBuilding,
  currentBuilding,
  onManualBuildingSelect,
}: BuildingSelectorProps) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBuildings, setFilteredBuildings] = useState<Building[]>([]);
  const [manualId, setManualId] = useState<string>('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Load buildings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadBuildings();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadBuildings = async () => {
    setIsLoading(true);
    try {
      const buildingsData = await fetchAllBuildingsPublic();
      console.log('[BuildingSelector] Loaded buildings:', buildingsData.length);
      setBuildings(buildingsData);
    } catch (error) {
      console.error('Error loading buildings:', error);
      setBuildings([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Φιλτράρισμα κτιρίων βάσει του search term
  useEffect(() => {
    // Αποκλείουμε το selectedBuilding από τη λίστα για να μην εμφανίζεται δύο φορές
    const buildingsToFilter = selectedBuilding 
      ? buildings.filter(b => b.id !== selectedBuilding.id)
      : buildings;
    
    if (!searchTerm.trim()) {
      console.log('[BuildingSelector] Filtered buildings (no search):', buildingsToFilter.length, 'out of', buildings.length);
      setFilteredBuildings(buildingsToFilter);
    } else {
      const filtered = buildingsToFilter.filter(building =>
        building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        building.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (building.city && building.city.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      console.log('[BuildingSelector] Filtered buildings (with search):', filtered.length, 'out of', buildingsToFilter.length);
      setFilteredBuildings(filtered);
    }
  }, [searchTerm, buildings, currentBuilding]);

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
    setManualId('');
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed top-20 left-0 right-0 bottom-0 bg-black bg-opacity-50 z-30"
        onClick={handleBackdropClick}
      />
      <div 
        className="fixed top-20 left-0 right-0 bottom-0 flex items-start justify-center z-50 p-4 pointer-events-none"
      >
        <div 
          ref={modalRef}
          className="bg-white dark:bg-popover rounded-xl shadow-xl w-full max-w-md max-h-[calc(100vh-8rem)] overflow-hidden transform transition-all duration-200 border border-slate-200/60 pointer-events-auto"
        >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200/50 bg-muted">
          <div className="flex items-center gap-2">
            <BuildingIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Επιλογή Κτιρίου</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200/50 bg-white dark:bg-popover">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Αναζήτηση κτιρίου..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-md shadow-sm bg-background focus:ring-2 focus:ring-ring focus:outline-none text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          {onManualBuildingSelect && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="ID κτιρίου (χειροκίνητα)"
                className="w-full px-3 py-2 border border-input rounded-md shadow-sm bg-background focus:ring-2 focus:ring-ring focus:outline-none text-sm text-foreground placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => {
                  const idNum = Number(manualId);
                  if (Number.isFinite(idNum) && idNum > 0) {
                    onManualBuildingSelect(idNum);
                    onClose();
                    setManualId('');
                  }
                }}
                className="px-3 py-2 bg-primary text-primary-foreground text-sm rounded-md shadow-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
                disabled={!manualId}
              >
                ΟΚ
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Φόρτωση κτιρίων...
            </div>
          ) : (
            <>
              {/* Επιλογή "Όλα" */}
              <div
                onClick={() => handleBuildingSelect(null)}
                className={`flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                  selectedBuilding === null ? 'bg-primary/5 border-r-4 border-primary' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center shadow-sm text-primary-foreground">
                    <BuildingIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Όλα τα Κτίρια</div>
                    <div className="text-sm text-muted-foreground">Προβολή όλων των κτιρίων</div>
                  </div>
                </div>
                {selectedBuilding === null && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </div>

              {/* Διαχωριστική γραμμή */}
              <div className="border-t border-slate-200/50 mx-4"></div>

              {/* Τρέχον κτίριο (αν υπάρχει) */}
              {currentBuilding && (
                <>
                  <div className="px-4 py-2 bg-muted border-b border-slate-200/50">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Τρέχον κτίριο
                    </div>
                  </div>
                  <div
                    onClick={() => handleBuildingSelect(currentBuilding)}
                    className={`flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                      selectedBuilding?.id === currentBuilding.id ? 'bg-success/10 border-r-4 border-success' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-success rounded-md flex items-center justify-center shadow-sm text-success-foreground">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground flex items-center gap-2">
                          {currentBuilding.name}
                          <span className="text-xs bg-success/20 text-success-foreground px-2 py-1 rounded-full border border-success/20">
                            Τρέχον
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {currentBuilding.address}
                          {currentBuilding.city && `, ${currentBuilding.city}`}
                        </div>
                      </div>
                    </div>
                    {selectedBuilding?.id === currentBuilding.id && (
                      <Check className="w-5 h-5 text-success" />
                    )}
                  </div>
                  <div className="border-t border-slate-200/50 mx-4"></div>
                </>
              )}

              {/* Λίστα κτιρίων */}
              <div className="px-4 py-2 bg-muted border-b border-slate-200/50">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Άλλα κτίρια
                </div>
              </div>
              {filteredBuildings.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {searchTerm ? 'Δεν βρέθηκαν κτίρια' : 'Δεν υπάρχουν διαθέσιμα κτίρια'}
                </div>
              ) : (
                filteredBuildings.map((building) => (
                  <div
                    key={building.id}
                    onClick={() => handleBuildingSelect(building)}
                    className={`flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                      selectedBuilding?.id === building.id ? 'bg-primary/5 border-r-4 border-primary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center shadow-sm text-primary-foreground">
                        <BuildingIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{building.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {building.address}
                          {building.city && `, ${building.city}`}
                        </div>
                      </div>
                    </div>
                    {selectedBuilding?.id === building.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/50 bg-muted">
          <div className="text-sm text-muted-foreground">
            Επιλέξτε ένα κτίριο για φιλτράρισμα ή "Όλα τα Κτίρια" για προβολή όλων
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
