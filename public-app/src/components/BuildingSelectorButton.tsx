'use client';

import React, { useState, useEffect } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import type { Building } from '@/lib/api';
import { Building as BuildingIcon, ChevronDown, Info } from 'lucide-react';
import BuildingSelector from './BuildingSelector';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

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
  const { currentBuilding } = useBuilding();
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasSeenTooltip, setHasSeenTooltip] = useState(false);

  const handleOpen = React.useCallback(() => setIsOpen(true), []);
  const handleClose = React.useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const seen = localStorage.getItem('building-selector-tooltip-seen');
    if (!seen) {
      const timer = setTimeout(() => {
        setShowTooltip(true);
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

  useKeyboardShortcuts({
    onBuildingSelector: handleOpen,
  });

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
          className={`flex items-center gap-2 min-w-0 max-w-full px-4 py-2 bg-white dark:bg-slate-900 border border-input rounded-md shadow-sm hover:bg-accent hover:text-accent-foreground hover:shadow-md transition-all ${className}`}
        >
          <BuildingIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium text-foreground truncate min-w-0">
            {selectedBuilding ? selectedBuilding.name : 'Όλα τα Κτίρια'}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>

        {/* Hover Tooltip */}
        {showTooltip && (
          <div className="absolute top-full left-0 mt-2 opacity-100 transition-opacity duration-300 pointer-events-none z-10">
            <div className="bg-white dark:bg-popover text-popover-foreground text-xs rounded-md p-2 shadow-md border border-slate-200/60 max-w-xs">
              <div className="flex items-start gap-2">
                <Info className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1 text-xs">Αλλαγή Κτιρίου</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Κάνε κλικ για να επιλέξεις διαφορετικό κτίριο.
                  </p>
                </div>
              </div>
              {/* Arrow */}
              <div className="absolute bottom-full left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-border"></div>
            </div>
          </div>
        )}
      </div>

      <BuildingSelector
        isOpen={isOpen}
        onClose={handleClose}
        onBuildingSelect={handleBuildingSelect}
        selectedBuilding={selectedBuilding}
        currentBuilding={currentBuilding}
      />
    </>
  );
}
