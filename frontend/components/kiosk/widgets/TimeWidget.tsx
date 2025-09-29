'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { Clock, Calendar, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

export default function TimeWidget({ data, isLoading, error }: BaseWidgetProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  
  return (
    <div className="h-full flex flex-col items-center justify-center text-center">
      {/* Main Time Display */}
      <div className="mb-4">
        <div className="text-4xl font-bold text-white mb-2">
          {format(now, 'HH:mm', { locale: el })}
        </div>
        <div className="text-lg text-blue-200">
          {format(now, 'ss', { locale: el })} δευτερόλεπτα
        </div>
      </div>

      {/* Date Display */}
      <div className="mb-4">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Calendar className="w-4 h-4 text-blue-300" />
          <span className="text-sm text-blue-100">Ημερομηνία</span>
        </div>
        <div className="text-lg font-semibold text-white">
          {format(now, 'EEEE', { locale: el })}
        </div>
        <div className="text-sm text-blue-200">
          {format(now, 'dd MMMM yyyy', { locale: el })}
        </div>
      </div>

      {/* Location */}
      <div className="flex items-center space-x-2 text-xs text-gray-300">
        <Globe className="w-3 h-3" />
        <span>Αθήνα, Ελλάδα</span>
      </div>
    </div>
  );
}
