'use client';

import React from 'react';
import type { Building } from '@/lib/api';
import { Building as BuildingIcon, Users, FileText, MessageSquare } from 'lucide-react';

interface BuildingStatsProps {
  buildings: Building[];
  selectedBuilding: Building | null;
}

export default function BuildingStats({ buildings, selectedBuilding }: BuildingStatsProps) {
  if (selectedBuilding) return null; // Δεν εμφανίζουμε στατιστικά όταν έχει επιλεγεί συγκεκριμένο κτίριο

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <BuildingIcon className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Στατιστικά Όλων των Κτιρίων</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BuildingIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Συνολικά Κτίρια</p>
              <p className="text-2xl font-bold text-gray-900">{buildings.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Ενεργά Κτίρια</p>
              <p className="text-2xl font-bold text-gray-900">{buildings.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Διαθέσιμα</p>
              <p className="text-2xl font-bold text-gray-900">{buildings.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-100 rounded-lg">
        <p className="text-sm text-blue-800">
          <MessageSquare className="w-4 h-4 inline mr-1" />
          Προβολή δεδομένων από όλα τα διαθέσιμα κτίρια. Επιλέξτε συγκεκριμένο κτίριο για λεπτομερέστερη προβολή.
        </p>
      </div>
    </div>
  );
}

