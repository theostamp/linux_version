'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export const BulkImportWizard: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          BulkImportWizard - Under Development
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700">
          Το BulkImportWizard component βρίσκεται υπό ανάπτυξη.
        </p>
      </CardContent>
    </Card>
  );
};

