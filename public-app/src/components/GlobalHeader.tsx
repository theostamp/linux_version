'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import BuildingSelectorButton from './BuildingSelectorButton';
import LogoutButton from './LogoutButton';
import OfficeSettingsModal from './OfficeSettingsModal';
import { TodoReminderDropdown } from './todos/TodoReminderDropdown';
import { ThemeToggle } from './ThemeToggle';
import { User, Building as BuildingIcon, Settings, Calendar, Shield } from 'lucide-react';
import { getOfficeLogoUrl } from '@/lib/utils';
import { getRoleLabel, hasOfficeAdminAccess, isResident, hasInternalManagerAccess, getEffectiveRole } from '@/lib/roleUtils';

export default function GlobalHeader() {
  const { user } = useAuth();
  const { selectedBuilding, setSelectedBuilding } = useBuilding();
  const isAdminLevel = hasOfficeAdminAccess(user);
  const isResidentUser = isResident(user);
  const isInternalManager = getEffectiveRole(user) === 'internal_manager';
  // Επιτρέπουμε αλλαγή κτιρίου σε διαχειριστές και εσωτερικούς διαχειριστές
  const canSelectBuilding = isAdminLevel || isInternalManager;
  const roleLabel = getRoleLabel(user);
  // Show office details for admins AND internal managers
  const showOfficeDetails = isAdminLevel || isInternalManager;

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);

  const handleSettingsModalOpen = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, []);

  useEffect(() => {
    setLogoError(false);
  }, [user?.office_logo]);

  return (
    <>
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm shadow-md border-b border-border/40">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-6 lg:gap-8 h-20 py-3">
              {/* Left Section - Logo */}
              <div className="flex-shrink-0">
                {(() => {
                  const logoUrl = getOfficeLogoUrl(user?.office_logo);
                  return logoUrl && !logoError ? (
                    <div className="w-12 h-12 rounded-md flex items-center justify-center shadow-md overflow-hidden bg-muted">
                      <img
                        src={logoUrl}
                        alt="Office Logo"
                        className={`w-full h-full object-contain transition-opacity duration-200 ${logoLoading ? 'opacity-50' : 'opacity-100'}`}
                        onLoad={() => {
                          setLogoLoading(false);
                          setLogoError(false);
                        }}
                        onLoadStart={() => setLogoLoading(true)}
                        onError={() => {
                          setLogoError(true);
                          setLogoLoading(false);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center shadow-md">
                      <BuildingIcon className="w-6 h-6 text-white" />
                    </div>
                  );
                })()}
              </div>

              {/* Center Section - Office Details spread across width */}
              <div className="min-w-0">
                {showOfficeDetails ? (
                  <>
                {/* Desktop: Grid Layout for even spacing */}
                <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                  {/* Office Name and Address */}
                  <div className="flex flex-col justify-center min-w-0">
                    <h1 className="text-base font-bold text-foreground leading-tight mb-1 truncate">
                      {user?.office_name || 'Γραφείο Διαχείρισης'}
                    </h1>
                    {user?.office_address && (
                      <p className="text-xs text-muted-foreground leading-tight truncate">
                        {user.office_address}
                      </p>
                    )}
                  </div>

                  {/* Contact Details */}
                  <div className="flex flex-col justify-center min-w-0">
                    {user?.office_phone && (
                      <p className="text-xs text-gray-500 leading-tight mb-1 truncate">
                        📞 {user.office_phone}
                      </p>
                    )}
                    {user?.email && (
                      <p className="text-xs text-muted-foreground leading-tight truncate">
                        ✉️ {user.email}
                      </p>
                    )}
                  </div>

                      {/* Building Selector - ADMIN & INTERNAL MANAGER */}
                      {canSelectBuilding && (
                    <div className="hidden lg:flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Κτίριο:</span>
                      <BuildingSelectorButton
                        onBuildingSelect={setSelectedBuilding}
                        selectedBuilding={selectedBuilding}
                        className="min-w-[160px]"
                      />
                    </div>
                  )}
                </div>

                {/* Mobile version - Office Name Only */}
                <div className="sm:hidden">
                  <h1 className="text-sm font-bold text-foreground leading-tight truncate">
                    {user?.office_name?.substring(0, 15) || 'ΓΔ'}
                  </h1>
                </div>
                  </>
                ) : (
                  <div className="flex flex-col justify-center min-w-0">
                    <h1 className="text-base font-bold text-foreground leading-tight mb-1 truncate">
                      {selectedBuilding?.name || 'Η Πολυκατοικία μου'}
                    </h1>
                    <p className="text-xs text-muted-foreground leading-tight truncate">
                      {selectedBuilding?.address || (isResidentUser ? 'Προσωπικός χώρος' : user?.email)}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Section - Actions and User Info */}
              <div className="flex items-center gap-2 flex-shrink-0">
              {/* Todo Reminders Dropdown - Bell Icon */}
              <TodoReminderDropdown 
                className="hidden sm:flex"
                onOpenCalendar={() => {
                  const calendarUrl = `${window.location.protocol}//${window.location.host}/calendar`;
                  window.open(calendarUrl, 'calendar', 'width=1200,height=800,scrollbars=yes,resizable=yes');
                }}
              />

              {/* Calendar Button */}
              <button
                onClick={() => {
                  const calendarUrl = `${window.location.protocol}//${window.location.host}/calendar`;
                  window.open(calendarUrl, 'calendar', 'width=1200,height=800,scrollbars=yes,resizable=yes');
                }}
                className="hidden sm:flex p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all duration-200"
                title="Άνοιγμα Ημερολογίου σε νέο παράθυρο"
              >
                <Calendar className="w-5 h-5" />
              </button>

              {/* Theme Toggle Button */}
              <ThemeToggle className="hidden sm:flex" />

              {/* Settings Button - Desktop - ADMIN-ONLY */}
              {isAdminLevel && (
                <button
                  onClick={handleSettingsModalOpen}
                  className="hidden sm:flex p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all duration-200"
                  title="Ρυθμίσεις Γραφείου Διαχείρισης"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}

              {/* Settings Button - Mobile - ADMIN-ONLY */}
              {isAdminLevel && (
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="sm:hidden p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all duration-200"
                  title="Ρυθμίσεις"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}

              {/* Todo Reminders - Mobile */}
              <TodoReminderDropdown 
                className="sm:hidden"
                onOpenCalendar={() => {
                  window.location.href = '/calendar';
                }}
              />

              {/* Theme Toggle Button - Mobile */}
              <ThemeToggle className="sm:hidden" />

              {/* User Info Card */}
              {user && (
                <div className={`flex items-center gap-3 px-4 py-2 rounded-md shadow-sm transition-colors ${
                  isInternalManager 
                    ? 'bg-amber-100 dark:bg-amber-900/30 ring-1 ring-amber-500/30' 
                    : 'bg-muted dark:bg-muted/50'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isInternalManager ? 'bg-amber-500' : 'bg-muted-foreground'
                  }`}>
                    {isInternalManager ? (
                      <Shield className="w-4 h-4 text-white" />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground leading-tight">
                        {user.first_name || user.last_name
                          ? `${user.first_name} ${user.last_name}`.trim()
                          : user.email}
                      </p>
                      {isInternalManager && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-amber-500 text-white rounded">
                          Διαχειριστής
                        </span>
                      )}
                    </div>
                    <p className={`text-xs leading-tight mt-0.5 ${
                      isInternalManager ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'
                    }`}>
                      {roleLabel}
                    </p>
                  </div>
                  <div className="sm:hidden">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-medium text-foreground leading-tight">
                        {user.first_name || user.last_name
                          ? `${user.first_name} ${user.last_name}`.trim().split(' ')[0]
                          : user.email.split('@')[0]}
                      </p>
                      {isInternalManager && (
                        <Shield className="w-3 h-3 text-amber-600" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Logout Button */}
              <LogoutButton className="text-sm" />
            </div>
          </div>
        </div>
      </div>
    </header>

      {/* Office Settings Modal */}
      <OfficeSettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </>
  );
}

