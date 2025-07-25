'use client';

import React from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Building as BuildingIcon } from 'lucide-react';

interface BuildingFilterIndicatorProps {
  className?: string;
}

export default function BuildingFilterIndicator({ className = '' }: BuildingFilterIndicatorProps) {
  const { selectedBuilding } = useBuilding();

  return (
    <div className={`flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 ${className}`}>
      <BuildingIcon className="w-4 h-4" />
      <span>
        Φιλτράρισμα: <span className="font-medium">{selectedBuilding ? selectedBuilding.name : 'Όλα τα κτίρια'}</span>
      </span>
    </div>
  );
} 