'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { Phone, Building2, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

export default function ManagementOfficeWidget({ data, isLoading, error }: BaseWidgetProps) {
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

  const building = data?.building;
  const currentDate = new Date();

  return (
    <div className="h-full flex items-center justify-between p-4">
      {/* Left side - Management Office Info */}
      <div className="flex items-center space-x-6">
        {/* Logo placeholder */}
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        
        {/* Management Office Details */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-blue-300" />
            <h3 className="text-sm font-semibold text-white">
              {building?.management_office_name || 'Γραφείο Διαχείρισης'}
            </h3>
          </div>
          
          {building?.management_office_address && (
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-blue-300" />
              <span className="text-xs text-blue-200">
                {building.management_office_address}
              </span>
            </div>
          )}
          
          {building?.management_office_phone && (
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-blue-300" />
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

      {/* Right side - Current Date */}
      <div className="text-right">
        <div className="text-2xl font-bold text-white mb-1">
          {format(currentDate, 'dd')}
        </div>
        <div className="text-sm text-blue-200">
          {format(currentDate, 'MMMM yyyy', { locale: el })}
        </div>
        <div className="text-xs text-blue-300 mt-1">
          {format(currentDate, 'EEEE', { locale: el })}
        </div>
      </div>
    </div>
  );
}
