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
      <div className="relative group z-10">
        <button
          onClick={handleOpen}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          title={selectedBuilding ? selectedBuilding.name : 'Όλα τα Κτίρια'}
          className={`flex items-center justify-between gap-3 min-w-[220px] max-w-full px-4 py-2.5 bg-slate-200/85 dark:bg-slate-700/70 border border-slate-200/70 dark:border-slate-700/50 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-all duration-200 ${className}`}
        >
          <div className="flex items-start gap-2 min-w-0 overflow-hidden">
            <BuildingIcon className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 line-clamp-2 break-words leading-snug">
              {selectedBuilding ? selectedBuilding.name : 'Όλα τα Κτίρια'}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        </button>

        {/* Hover Tooltip */}
        {showTooltip && (
          <div className="absolute top-full left-0 mt-2 opacity-100 transition-opacity duration-300 pointer-events-none z-[60]">
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
