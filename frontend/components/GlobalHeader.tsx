'use client';

import React from 'react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import BuildingSelectorButton from './BuildingSelectorButton';
import LogoutButton from './LogoutButton';
import { User, Building as BuildingIcon } from 'lucide-react';

export default function GlobalHeader() {
  const { user } = useAuth();
  const { selectedBuilding, setSelectedBuilding } = useBuilding();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo and Building Selector */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <BuildingIcon className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Digital Concierge</h1>
            </div>
            
            {/* Building Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Κτίριο:</span>
              <BuildingSelectorButton
                onBuildingSelect={setSelectedBuilding}
                selectedBuilding={selectedBuilding}
                className="min-w-[200px]"
              />
            </div>
          </div>

          {/* Right side - User info and logout */}
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{user.email}</span>
                {user.is_staff && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Διαχειριστής
                  </span>
                )}
              </div>
            )}
            <LogoutButton className="btn-secondary text-sm" />
          </div>
        </div>
      </div>
    </header>
  );
} 