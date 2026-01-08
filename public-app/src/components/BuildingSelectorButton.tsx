'use client';

import React, { useState, useEffect } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import type { Building } from '@/lib/api';
import { Building as BuildingIcon, ChevronDown, Info, Loader2 } from 'lucide-react';
import BuildingSelector from './BuildingSelector';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useIsFetching } from '@tanstack/react-query';

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
  const { currentBuilding, isLoadingContext } = useBuilding();
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasSeenTooltip, setHasSeenTooltip] = useState(false);
  const [showSwitchIndicator, setShowSwitchIndicator] = useState(false);
  const activeBuildingId = selectedBuilding?.id ?? currentBuilding?.id;
  const isFetching = useIsFetching({
    predicate: (query) => {
      if (!activeBuildingId) return false;
      const queryKey = query.queryKey as unknown[];
      return queryKey.some((key) => {
        if (!key) return false;
        if (Array.isArray(key)) return key.includes(activeBuildingId);
        if (typeof key === 'object') {
          return Object.values(key as Record<string, unknown>).some((value) => value === activeBuildingId);
        }
        return false;
      });
    },
  });
  const isSwitching = isLoadingContext || isFetching > 0 || showSwitchIndicator;

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

  useEffect(() => {
    if (!activeBuildingId) return;
    setShowSwitchIndicator(true);
    const timer = setTimeout(() => setShowSwitchIndicator(false), 700);
    return () => clearTimeout(timer);
  }, [activeBuildingId]);

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
          <div className="flex items-center gap-2 flex-shrink-0">
            {isSwitching ? <Loader2 className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-spin" /> : null}
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
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
