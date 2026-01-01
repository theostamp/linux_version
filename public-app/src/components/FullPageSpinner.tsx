'use client';

import { Loader2 } from 'lucide-react';

interface FullPageSpinnerProps {
  message?: string;
}

export default function FullPageSpinner({ message = 'Φόρτωση...' }: FullPageSpinnerProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}
