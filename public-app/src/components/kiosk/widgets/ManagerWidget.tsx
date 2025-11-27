'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { 
  Users, 
  Phone, 
  Mail, 
  MapPin,
  Building,
  Clock,
  Shield
} from 'lucide-react';

export default function ManagerWidget({ data, isLoading, error }: BaseWidgetProps) {
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

  // Use real building data - no fallback mock data
  const buildingInfo = data?.building_info || {};
  const managerData = {
    internal_manager: {
      name: buildingInfo.internal_manager_name || null,
      phone: buildingInfo.internal_manager_phone || null,
      email: buildingInfo.internal_manager_email || null,
      working_hours: buildingInfo.internal_manager_hours || null,
      availability: buildingInfo.internal_manager_availability || null
    },
    management_office: {
      name: buildingInfo.management_office_name || null,
      phone: buildingInfo.management_office_phone || null,
      phone_emergency: buildingInfo.management_office_phone_emergency || null,
      email: buildingInfo.management_office_email || null,
      address: buildingInfo.management_office_address || null,
      working_hours: buildingInfo.management_office_hours || null
    }
  };

  const handlePhoneCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}`, '_blank');
  };

  // Check if we have any manager data to display
  const hasInternalManager = managerData.internal_manager.name || managerData.internal_manager.phone;
  const hasManagementOffice = managerData.management_office.name || managerData.management_office.phone;

  if (!hasInternalManager && !hasManagementOffice) {
    return (
      <div className="h-full flex items-center justify-center text-center">
        <div className="text-blue-200">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-lg">Δεν υπάρχουν στοιχεία διοίκησης</p>
          <p className="text-sm text-blue-300/60 mt-1">Παρακαλούμε επικοινωνήστε με τη διαχείριση</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-blue-500/20">
        <Users className="w-5 h-5 text-blue-300" />
        <h2 className="text-lg font-bold text-white">Διοίκηση Κτιρίου</h2>
      </div>

      <div className="space-y-4 h-full overflow-y-auto">
        {/* Internal Manager */}
        {hasInternalManager && (
          <div className="bg-gradient-to-br from-kiosk-primary/40 to-kiosk-primary-light/40 backdrop-blur-sm p-4 rounded-xl border border-kiosk-primary/30 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <Shield className="w-4 h-4 text-kiosk-primary-lighter" />
              <h3 className="text-sm font-semibold text-kiosk-primary-lighter">Εσωτερικός Διαχειριστής</h3>
            </div>

            <div className="space-y-3">
              {managerData.internal_manager.name && (
                <div>
                  <div className="text-lg font-bold text-white mb-2">
                    {managerData.internal_manager.name}
                  </div>

                  <div className="space-y-2">
                    {managerData.internal_manager.phone && (
                      <div
                        className="flex items-center space-x-2 text-blue-200 cursor-pointer hover:text-white transition-colors"
                        onClick={() => handlePhoneCall(managerData.internal_manager.phone)}
                      >
                        <Phone className="w-3 h-3" />
                        <span className="text-sm">{managerData.internal_manager.phone}</span>
                      </div>
                    )}

                    {managerData.internal_manager.email && (
                      <div
                        className="flex items-center space-x-2 text-blue-200 cursor-pointer hover:text-white transition-colors"
                        onClick={() => handleEmail(managerData.internal_manager.email)}
                      >
                        <Mail className="w-3 h-3" />
                        <span className="text-sm">{managerData.internal_manager.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(managerData.internal_manager.working_hours || managerData.internal_manager.availability) && (
                <div className="pt-2 border-t border-blue-500/20">
                  {managerData.internal_manager.working_hours && (
                    <div className="flex items-center space-x-2 text-xs text-blue-300">
                      <Clock className="w-3 h-3" />
                      <span>Ώρες: {managerData.internal_manager.working_hours}</span>
                    </div>
                  )}
                  {managerData.internal_manager.availability && (
                    <div className="text-xs text-blue-300 mt-1">
                      Διαθεσιμότητα: {managerData.internal_manager.availability}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Management Office */}
        {hasManagementOffice && (
          <div className="bg-gradient-to-br from-kiosk-accent/40 to-kiosk-accent-light/40 backdrop-blur-sm p-4 rounded-xl border border-kiosk-accent/30 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <Building className="w-4 h-4 text-kiosk-accent-light" />
              <h3 className="text-sm font-semibold text-kiosk-accent-light">Γραφείο Διοίκησης</h3>
            </div>

            <div className="space-y-3">
              {managerData.management_office.name && (
                <div>
                  <div className="text-sm font-bold text-white mb-2">
                    {managerData.management_office.name}
                  </div>

                  <div className="space-y-2">
                    {managerData.management_office.phone && (
                      <div
                        className="flex items-center space-x-2 text-green-200 cursor-pointer hover:text-white transition-colors"
                        onClick={() => handlePhoneCall(managerData.management_office.phone)}
                      >
                        <Phone className="w-3 h-3" />
                        <span className="text-sm">{managerData.management_office.phone}</span>
                      </div>
                    )}

                    {managerData.management_office.email && (
                      <div
                        className="flex items-center space-x-2 text-green-200 cursor-pointer hover:text-white transition-colors"
                        onClick={() => handleEmail(managerData.management_office.email)}
                      >
                        <Mail className="w-3 h-3" />
                        <span className="text-sm">{managerData.management_office.email}</span>
                      </div>
                    )}

                    {managerData.management_office.address && (
                      <div className="flex items-center space-x-2 text-green-200">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs">{managerData.management_office.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {managerData.management_office.working_hours && (
                <div className="pt-2 border-t border-green-500/20">
                  <div className="flex items-center space-x-2 text-xs text-green-300">
                    <Clock className="w-3 h-3" />
                    <span>Ώρες: {managerData.management_office.working_hours}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Emergency Contact */}
        {managerData.management_office.phone_emergency && (
          <div className="bg-gradient-to-br from-kiosk-error/40 to-kiosk-error-light/40 backdrop-blur-sm p-4 rounded-xl border border-kiosk-error/30 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <Phone className="w-4 h-4 text-kiosk-error-light" />
              <h3 className="text-sm font-semibold text-kiosk-error-light">Έκτακτη Ανάγκη</h3>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-white mb-2">
                24/7 Υποστήριξη
              </div>
              <div 
                className="text-2xl font-bold text-kiosk-error-light cursor-pointer hover:text-kiosk-error transition-colors"
                onClick={() => handlePhoneCall(managerData.management_office.phone_emergency)}
              >
                {managerData.management_office.phone_emergency}
              </div>
              <div className="text-xs text-kiosk-error-light mt-1">
                Μόνο για επείγουσες περιπτώσεις
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gradient-to-br from-kiosk-neutral-800/40 to-kiosk-neutral-900/40 backdrop-blur-sm p-2 rounded-lg border border-kiosk-primary/20 text-center">
            <Phone className="w-4 h-4 mx-auto mb-1 text-kiosk-neutral-300" />
            <div className="text-xs text-kiosk-neutral-300">Κλήση</div>
          </div>
          <div className="bg-gradient-to-br from-kiosk-neutral-800/40 to-kiosk-neutral-900/40 backdrop-blur-sm p-2 rounded-lg border border-kiosk-primary/20 text-center">
            <Mail className="w-4 h-4 mx-auto mb-1 text-kiosk-neutral-300" />
            <div className="text-xs text-kiosk-neutral-300">Email</div>
          </div>
        </div>
      </div>
    </div>
  );
}
