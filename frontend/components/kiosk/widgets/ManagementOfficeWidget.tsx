'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { Phone, Building2, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';

export default function ManagementOfficeWidget({ data, isLoading, error }: BaseWidgetProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-300"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-xl mb-2">⚠️</div>
          <p className="text-xs">Σφάλμα φόρτωσης δεδομένων</p>
        </div>
      </div>
    );
  }

  const building = data?.building_info;
  const currentDate = currentTime;

  return (
    <div className="h-full max-h-24 flex items-center justify-between p-4">
      {/* Left side - Management Office Info */}
      <div className="flex items-center space-x-4">
        {/* Logo or placeholder */}
        {building?.office_logo ? (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
            <img 
              src={building.office_logo.startsWith('http') ? building.office_logo : `${API_BASE_URL.replace('/api', '')}${building.office_logo.startsWith('/') ? building.office_logo : `/${building.office_logo}`}`}
              alt="Office Logo" 
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
        )}
        
        {/* Management Office Details */}
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-2">
            <Building2 className="w-3 h-3 text-blue-300" />
            <h3 className="text-xs font-semibold text-white">
              {building?.management_office_name || 'Γραφείο Διαχείρισης'}
            </h3>
          </div>
          
          {building?.management_office_address && (
            <div className="flex items-center space-x-2">
              <MapPin className="w-3 h-3 text-blue-300" />
              <span className="text-xs text-blue-200 truncate max-w-48">
                {building.management_office_address}
              </span>
            </div>
          )}
          
          {building?.management_office_phone && (
            <div className="flex items-center space-x-2">
              <Phone className="w-3 h-3 text-blue-300" />
              <a 
                href={`tel:${building.management_office_phone}`}
                className="text-xs text-blue-200 hover:text-blue-100 transition-colors"
              >
                {building.management_office_phone}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Current Date and Time */}
      <div className="text-right">
        <div className="flex items-center space-x-2 mb-1">
          <div className="text-xl font-bold text-white">
            {format(currentDate, 'dd')}
          </div>
          <div className="text-sm text-blue-200">
            {format(currentDate, 'MMMM yyyy', { locale: el })}
          </div>
        </div>
        <div className="flex items-center justify-end space-x-2">
          <div className="text-xs text-blue-300">
            {format(currentDate, 'EEEE', { locale: el })}
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-blue-300" />
            <span className="text-sm text-blue-200 font-mono font-bold">
              {format(currentDate, 'HH:mm', { locale: el })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
