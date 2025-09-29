'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { 
  Building, 
  Users, 
  Home, 
  Euro,
  TrendingUp,
  Calendar,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';

export default function BuildingStatisticsWidget({ data, isLoading, error }: BaseWidgetProps) {
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

  const buildingInfo = data?.building_info || {};
  const stats = {
    totalApartments: buildingInfo.total_apartments || 24,
    occupiedApartments: buildingInfo.occupied_apartments || 22,
    vacantApartments: (buildingInfo.total_apartments || 24) - (buildingInfo.occupied_apartments || 22),
    totalResidents: buildingInfo.total_residents || 65,
    averagePerApartment: Math.round((buildingInfo.total_residents || 65) / (buildingInfo.occupied_apartments || 22) * 10) / 10,
    buildingAge: buildingInfo.year_built ? new Date().getFullYear() - buildingInfo.year_built : 15,
    floors: buildingInfo.floors || 6,
    area: buildingInfo.total_area || 2400
  };

  const occupancyRate = Math.round((stats.occupiedApartments / stats.totalApartments) * 100);

  return (
    <div className="h-full overflow-hidden">
      <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-blue-500/20">
        <Building className="w-6 h-6 text-blue-300" />
        <h2 className="text-lg font-bold text-white">Στατιστικά Κτιρίου</h2>
      </div>
      
      <div className="space-y-4 h-full overflow-y-auto">
        {/* Building Info */}
        <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 backdrop-blur-sm p-4 rounded-xl border border-blue-500/30">
          <div className="flex items-center space-x-2 mb-3">
            <MapPin className="w-4 h-4 text-blue-300" />
            <h3 className="text-sm font-semibold text-blue-100">Πληροφορίες Κτιρίου</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-300">Όνομα:</p>
              <p className="text-white font-semibold truncate">
                {buildingInfo.name || 'Αλκμάνος 22'}
              </p>
            </div>
            <div>
              <p className="text-gray-300">Έτος Κατασκευής:</p>
              <p className="text-white font-semibold">
                {buildingInfo.year_built || '2010'}
              </p>
            </div>
            <div>
              <p className="text-gray-300">Όροφοι:</p>
              <p className="text-white font-semibold">
                {stats.floors} όροφοι
              </p>
            </div>
            <div>
              <p className="text-gray-300">Ηλικία:</p>
              <p className="text-white font-semibold">
                {stats.buildingAge} έτη
              </p>
            </div>
          </div>
          
          {buildingInfo.address && (
            <div className="mt-3 pt-3 border-t border-blue-500/20">
              <p className="text-xs text-gray-300">Διεύθυνση:</p>
              <p className="text-xs text-blue-100">
                {buildingInfo.address}
              </p>
            </div>
          )}
        </div>

        {/* Occupancy Statistics */}
        <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 backdrop-blur-sm p-4 rounded-xl border border-green-500/30">
          <div className="flex items-center space-x-2 mb-3">
            <Home className="w-4 h-4 text-green-300" />
            <h3 className="text-sm font-semibold text-green-100">Κατοίκηση</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {stats.totalApartments}
              </div>
              <div className="text-xs text-green-200">Σύνολο</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-300">
                {stats.occupiedApartments}
              </div>
              <div className="text-xs text-green-200">Κατειλημμένα</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-300">
                {stats.vacantApartments}
              </div>
              <div className="text-xs text-green-200">Κενά</div>
            </div>
          </div>
          
          {/* Occupancy Rate Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-green-200 mb-1">
              <span>Ποσοστό Κατοίκησης</span>
              <span>{occupancyRate}%</span>
            </div>
            <div className="w-full bg-green-900/50 rounded-full h-2">
              <div 
                className="bg-green-400 h-2 rounded-full transition-all"
                style={{ width: `${occupancyRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Resident Statistics */}
        <div className="bg-gradient-to-br from-purple-900/40 to-violet-900/40 backdrop-blur-sm p-4 rounded-xl border border-purple-500/30">
          <div className="flex items-center space-x-2 mb-3">
            <Users className="w-4 h-4 text-purple-300" />
            <h3 className="text-sm font-semibold text-purple-100">Κάτοικοι</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {stats.totalResidents}
              </div>
              <div className="text-xs text-purple-200">Σύνολο Κατοίκων</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-300">
                {stats.averagePerApartment}
              </div>
              <div className="text-xs text-purple-200">Μέσος όρος/Διαμέρισμα</div>
            </div>
          </div>
        </div>

        {/* Management Contact */}
        {(buildingInfo.management_office_name || buildingInfo.internal_manager_name) && (
          <div className="bg-gradient-to-br from-amber-900/40 to-yellow-900/40 backdrop-blur-sm p-4 rounded-xl border border-amber-500/30">
            <div className="flex items-center space-x-2 mb-3">
              <Phone className="w-4 h-4 text-amber-300" />
              <h3 className="text-sm font-semibold text-amber-100">Διοίκηση</h3>
            </div>
            
            <div className="space-y-2">
              {buildingInfo.management_office_name && (
                <div>
                  <p className="text-xs text-gray-300">Γραφείο Διοίκησης:</p>
                  <p className="text-sm text-white font-semibold">
                    {buildingInfo.management_office_name}
                  </p>
                  {buildingInfo.management_office_phone && (
                    <p className="text-xs text-amber-200">
                      📞 {buildingInfo.management_office_phone}
                    </p>
                  )}
                </div>
              )}
              
              {buildingInfo.internal_manager_name && (
                <div className="pt-2 border-t border-amber-500/20">
                  <p className="text-xs text-gray-300">Εσωτερικός Διαχειριστής:</p>
                  <p className="text-sm text-white font-semibold">
                    {buildingInfo.internal_manager_name}
                  </p>
                  {buildingInfo.internal_manager_phone && (
                    <p className="text-xs text-amber-200">
                      📞 {buildingInfo.internal_manager_phone}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gradient-to-br from-gray-800/40 to-slate-800/40 backdrop-blur-sm p-3 rounded-lg border border-gray-600/30 text-center">
            <Calendar className="w-4 h-4 mx-auto mb-1 text-gray-300" />
            <div className="text-xs text-gray-300">Ηλικία</div>
            <div className="text-sm font-bold text-white">{stats.buildingAge} έτη</div>
          </div>
          <div className="bg-gradient-to-br from-gray-800/40 to-slate-800/40 backdrop-blur-sm p-3 rounded-lg border border-gray-600/30 text-center">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-gray-300" />
            <div className="text-xs text-gray-300">Περιοχή</div>
            <div className="text-sm font-bold text-white">{stats.area} m²</div>
          </div>
        </div>
      </div>
    </div>
  );
}
