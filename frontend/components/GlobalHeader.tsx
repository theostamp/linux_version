'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import BuildingSelectorButton from './BuildingSelectorButton';
import LogoutButton from './LogoutButton';
import OfficeSettingsModal from './OfficeSettingsModal';
import { User, Building as BuildingIcon, Bell, Settings, Menu } from 'lucide-react';

export default function GlobalHeader() {
  const { user } = useAuth();
  const { selectedBuilding, setSelectedBuilding } = useBuilding();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  return (
    <>
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Logo and Building Selector */}
            <div className="flex items-center gap-4 lg:gap-6">
              {/* Mobile Menu Toggle - Hidden on large screens since sidebar is always visible */}
              <button className="lg:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200">
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                  <BuildingIcon className="w-5 h-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Digital Concierge</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">Διαχείριση Κτιρίων</p>
                </div>
                <div className="sm:hidden">
                  <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">DC</h1>
                </div>
              </div>
              
              {/* Building Selector - Hidden on mobile to save space */}
              <div className="hidden md:flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Κτίριο:</span>
                <BuildingSelectorButton
                  onBuildingSelect={setSelectedBuilding}
                  selectedBuilding={selectedBuilding}
                  className="min-w-[200px]"
                />
              </div>
            </div>

            {/* Right side - User info and actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Notifications - Hidden on small mobile */}
              <button className="hidden sm:block p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200">
                <Bell className="w-5 h-5" />
              </button>
              
              {/* Settings - Desktop */}
              <button 
                onClick={() => setIsSettingsModalOpen(true)}
                className="hidden sm:block p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                title="Ρυθμίσεις Γραφείου Διαχείρισης"
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* Settings - Mobile */}
              <button 
                onClick={() => setIsSettingsModalOpen(true)}
                className="sm:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                title="Ρυθμίσεις"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* User Info */}
              {user && (
                <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user.first_name || user.last_name
                        ? `${user.first_name} ${user.last_name}`.trim()
                        : user.email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user.is_staff ? 'Διαχειριστής' : 'Χρήστης'}
                    </p>
                  </div>
                  <div className="sm:hidden">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      {user.first_name || user.last_name
                        ? `${user.first_name} ${user.last_name}`.trim().split(' ')[0]
                        : user.email.split('@')[0]}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Logout Button */}
              <LogoutButton className="btn-secondary text-sm" />
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