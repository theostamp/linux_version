'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface ChartsContainerProps {
  buildingId: number;
  selectedMonth?: string;
}

export const ChartsContainer: React.FC<ChartsContainerProps> = ({
  buildingId,
  selectedMonth,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          ChartsContainer - Under Development
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 mb-4">
          Το ChartsContainer component βρίσκεται υπό ανάπτυξη.
        </p>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Building ID: {buildingId}</p>
          {selectedMonth && <p>Selected Month: {selectedMonth}</p>}
        </div>
      </CardContent>
    </Card>
  );
};
