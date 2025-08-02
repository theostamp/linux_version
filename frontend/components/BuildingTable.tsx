'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { Building } from '@/lib/api';
import { deleteBuilding } from '@/lib/api';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { 
  Building as BuildingIcon, 
  Home, 
  MapPin, 
  User, 
  Edit, 
  Trash, 
  ArrowRight,
  MoreHorizontal,
  Calendar,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useNavigationWithLoading } from '@/hooks/useNavigationWithLoading';

interface BuildingTableProps {
  buildings: Building[];
  onRefresh?: () => void;
}

const BuildingTable: React.FC<BuildingTableProps> = ({ buildings, onRefresh }) => {
  const { user } = useAuth();
  const { setCurrentBuilding, refreshBuildings } = useBuilding();
  const { navigateWithLoading } = useNavigationWithLoading();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const canManage = user?.is_superuser || user?.is_staff;

  const handleDelete = async (building: Building) => {
    if (window.confirm(`Είστε βέβαιοι ότι θέλετε να διαγράψετε το κτίριο "${building.name}";`)) {
      setDeletingId(building.id);
      try {
        await deleteBuilding(building.id);
        toast.success('Το κτίριο διαγράφηκε επιτυχώς');
        await refreshBuildings();
        if (onRefresh) {
          onRefresh();
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.detail || 'Σφάλμα κατά τη διαγραφή του κτιρίου');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleSelectBuilding = async (building: Building) => {
    setCurrentBuilding(building);
    await navigateWithLoading(`/buildings/${building.id}/dashboard`, `Μετάβαση στο ${building.name}...`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('el-GR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (buildings.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <BuildingIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">Δεν βρέθηκαν κτίρια.</p>
        {canManage && (
          <Link href="/buildings/new">
            <Button>
              <BuildingIcon className="w-4 h-4 mr-2" />
              Δημιουργία Πρώτου Κτιρίου
            </Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Κτίριο
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Διεύθυνση
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Διαμερίσματα
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Διαχειριστής
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ημ/νία Δημιουργίας
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ενέργειες
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {buildings.map((building) => (
              <tr key={building.id} className="hover:bg-gray-50 transition-colors">
                {/* Κτίριο */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <BuildingIcon className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {building.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {building.id}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Διεύθυνση */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm text-gray-900">{building.address}</div>
                      <div className="text-sm text-gray-500">
                        {building.city && building.postal_code 
                          ? `${building.city}, ${building.postal_code}`
                          : building.city || building.postal_code || 'Δεν έχει οριστεί'
                        }
                      </div>
                    </div>
                  </div>
                </td>

                {/* Διαμερίσματα */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Home className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">
                      {building.apartments_count || 0} {building.apartments_count === 1 ? 'διαμέρισμα' : 'διαμερίσματα'}
                    </span>
                  </div>
                </td>

                {/* Διαχειριστής */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {building.internal_manager_name ? (
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm text-gray-900">{building.internal_manager_name}</div>
                        {building.internal_manager_phone && (
                          <div className="text-sm text-gray-500 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {building.internal_manager_phone}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Δεν έχει οριστεί</span>
                  )}
                </td>



                {/* Ημ/νία Δημιουργίας */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">
                      {formatDate(building.created_at)}
                    </span>
                  </div>
                </td>

                {/* Ενέργειες */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-1">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleSelectBuilding(building)}
                      className="text-xs px-2 py-1"
                    >
                      Διαχείριση
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                    
                    {canManage && (
                      <>
                        <Link href={`/buildings/${building.id}/edit`}>
                          <Button variant="outline" size="sm" className="text-xs px-2 py-1">
                            <Edit className="w-3 h-3 mr-1" />
                            Επεξεργασία
                          </Button>
                        </Link>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs text-red-600 hover:bg-red-50 border-red-200 px-2 py-1"
                          onClick={() => handleDelete(building)}
                          disabled={deletingId === building.id}
                        >
                          {deletingId === building.id ? (
                            <div className="animate-spin h-3 w-3 border-2 border-red-600 border-t-transparent rounded-full" />
                          ) : (
                            <>
                              <Trash className="w-3 h-3 mr-1" />
                              Διαγραφή
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BuildingTable; 