'use client';

import React from 'react';
import ThreeTabFinancialDashboard from './ThreeTabFinancialDashboard';

interface FinancialOverviewTabProps {
  buildingId: number;
  selectedMonth: string;
}

export const FinancialOverviewTab: React.FC<FinancialOverviewTabProps> = ({
  buildingId,
  selectedMonth
}) => {
  return (
    <ThreeTabFinancialDashboard 
      buildingId={buildingId}
      selectedMonth={selectedMonth}
    />
  );
};
