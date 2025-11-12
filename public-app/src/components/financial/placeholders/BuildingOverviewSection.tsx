'use client';

import React, { forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface BuildingOverviewSectionProps {
  buildingId: number;
  selectedMonth?: string;
  onReserveFundAmountChange?: (amount: number) => void;
}

export interface BuildingOverviewSectionRef {
  refresh: () => void;
}

export const BuildingOverviewSection = forwardRef<BuildingOverviewSectionRef, BuildingOverviewSectionProps>(({
  buildingId,
  selectedMonth,
  onReserveFundAmountChange,
}, ref) => {
  useImperativeHandle(ref, () => ({
    refresh: () => {
      console.log('BuildingOverviewSection refresh called');
    },
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          BuildingOverviewSection - Under Development
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 mb-4">
          Το BuildingOverviewSection component βρίσκεται υπό ανάπτυξη.
        </p>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Building ID: {buildingId}</p>
          {selectedMonth && <p>Selected Month: {selectedMonth}</p>}
        </div>
      </CardContent>
    </Card>
  );
});

BuildingOverviewSection.displayName = 'BuildingOverviewSection';

