'use client';

import React, { useState } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Building } from '@/lib/api';
import { Building as BuildingIcon, ChevronDown } from 'lucide-react';
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

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const handleBuildingSelect = (building: Building | null) => {
    onBuildingSelect(building);
    handleClose();
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors ${className}`}
      >
        <BuildingIcon className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          {selectedBuilding ? selectedBuilding.name : 'Όλα τα Κτίρια'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      <BuildingSelector
        isOpen={isOpen}
        onClose={handleClose}
        onBuildingSelect={handleBuildingSelect}
        selectedBuilding={selectedBuilding}
      />
    </>
  );
} 