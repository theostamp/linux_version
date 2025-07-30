'use client';

import React, { useState, useEffect } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import type { Building } from '@/lib/api';
import { Building as BuildingIcon, ChevronDown, Info } from 'lucide-react';
import BuildingSelector from './BuildingSelector';

interface BuildingSelectorButtonProps {
  onBuildingSelect: (building: Building | null) => void;
  selectedBuilding: Building | null;
  className?: string;
}

export default function BuildingSelectorButton({
  onBuildingSelect,
  selectedBuilding,
  className = '',
}: BuildingSelectorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasSeenTooltip, setHasSeenTooltip] = useState(false);

  useEffect(() => {
    // Check if user has seen the tooltip before
    const seen = localStorage.getItem('building-selector-tooltip-seen');
    if (!seen) {
      // Show tooltip after 2 seconds for first-time users
      const timer = setTimeout(() => {
        setShowTooltip(true);
        // Auto-hide after 5 seconds
        setTimeout(() => {
          setShowTooltip(false);
          setHasSeenTooltip(true);
          localStorage.setItem('building-selector-tooltip-seen', 'true');
        }, 5000);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setHasSeenTooltip(true);
    }
  }, []);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const handleBuildingSelect = (building: Building | null) => {
    onBuildingSelect(building);
    handleClose();
  };

  const handleMouseEnter = () => {
    if (hasSeenTooltip) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    if (hasSeenTooltip) {
      setShowTooltip(false);
    }
  };

  return (
    <>
      <div className="relative group">
        <button
          onClick={handleOpen}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors ${className}`}
        >
          <BuildingIcon className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            {selectedBuilding ? selectedBuilding.name : 'Όλα τα Κτίρια'}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </button>

        {/* Hover Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-0 mb-2 opacity-100 transition-opacity duration-300 pointer-events-none z-10">
            <div className="bg-white/95 backdrop-blur-sm text-gray-800 text-xs rounded-lg p-2 shadow-lg border border-gray-200 max-w-xs">
              <div className="flex items-start gap-2">
                <Info className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1 text-xs">Αλλαγή Κτιρίου</p>
                  <p className="text-gray-600 text-xs leading-relaxed">
                    Κάνε κλικ για να επιλέξεις διαφορετικό κτίριο.
                  </p>
                </div>
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-4 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-white/95"></div>
            </div>
          </div>
        )}
      </div>

      <BuildingSelector
        isOpen={isOpen}
        onClose={handleClose}
        onBuildingSelect={handleBuildingSelect}
        selectedBuilding={selectedBuilding}
      />
    </>
  );
} 