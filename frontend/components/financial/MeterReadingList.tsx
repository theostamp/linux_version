'use client';

import React from 'react';
import { MeterReadingReport } from './MeterReadingReport';

interface MeterReadingListProps {
  buildingId: number;
  selectedMonth?: string;
}

// Simple wrapper component - updated to force cache refresh
export const MeterReadingList: React.FC<MeterReadingListProps> = ({ buildingId, selectedMonth }) => {
  return (
    <MeterReadingReport 
      buildingId={buildingId} 
      selectedMonth={selectedMonth} 
    />
  );
};