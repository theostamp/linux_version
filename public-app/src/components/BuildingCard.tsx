'use client';

import Link from 'next/link';
import type { Building } from '@/lib/api';
import { typography } from '@/lib/typography';
import { deleteBuilding } from '@/lib/api';
import { useAuth } from '@/components/contexts/AuthContext';
import { Building as BuildingIcon, Home, MapPin, User, Edit, Trash, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useNavigationWithLoading } from '@/hooks/useNavigationWithLoading';

interface BuildingCardProps {
  building: Building;
  onRefresh?: () => void;
}

const BuildingCard: React.FC<BuildingCardProps> = ({ building, onRefresh }) => {
  const { user } = useAuth();
  const { setCurrentBuilding, refreshBuildings } = useBuilding();
  const { navigateWithLoading } = useNavigationWithLoading();
  const [isDeleting, setIsDeleting] = useState(false);

  const canManage = user?.is_superuser || user?.is_staff;

  const handleDelete = async () => {
    if (window.confirm(`Είστε βέβαιοι ότι θέλετε να διαγράψετε το κτίριο "${building.name}";`)) {
      setIsDeleting(true);
      try {
        await deleteBuilding(building.id);
        toast.success('Το κτίριο διαγράφηκε επιτυχώς');
        // Refresh buildings from server to ensure consistency
        await refreshBuildings();
        if (onRefresh) {
          onRefresh();
        }
      } catch (error: unknown) {
        const err = error as { message?: string };
        toast.error(err.message || 'Σφάλμα κατά τη διαγραφή του κτιρίου');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleSelectBuilding = async () => {
    setCurrentBuilding(building);
    await navigateWithLoading(`/buildings/${building.id}/dashboard`, `Μετάβαση στο ${building.name}...`);
  };

  return (
    <div className="bg-white border-0 rounded-none overflow-hidden shadow-sm hover:shadow-md transition-all">
      {/* Header */}
      <div className="bg-blue-50 p-3 border-b border-gray-100">
        <div className="flex items-center">
          <h3 className={`${typography.cardTitle} truncate flex items-center`}>
            <BuildingIcon className="w-4 h-4 mr-2 text-blue-600" />
            {building.name}
          </h3>
        </div>
      </div>
      
      {/* Apartments Badge */}
      {building.total_apartments && (
        <div className="bg-blue-50 px-3 py-2 border-b border-blue-100">
          <div className={`${typography.badgeInfo} flex items-center w-fit`}>
            <Home className="w-3 h-3 mr-1" />
            {building.total_apartments} {building.total_apartments === 1 ? 'διαμέρισμα' : 'διαμερίσματα'}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-start space-x-2">
          <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className={`${typography.bodySmall} text-gray-700`}>{building.address}</p>
            <p className={`${typography.bodySmall} text-gray-500`}>
              {building.city}{building.postal_code ? `, ${building.postal_code}` : ''}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 mt-3 border-t border-gray-100 flex justify-between items-center">
          <Button
            variant="default"
            className="flex-1 mr-2"
            onClick={handleSelectBuilding}
          >
            Διαχείριση
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          
          <div className="flex space-x-2">
            {canManage && (
              <>
                <Link href={`/buildings/${building.id}/edit`}>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <Edit className="w-4 h-4" />
                  </Button>
                </Link>
                
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-9 w-9 text-red-600 hover:bg-red-50"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
                  ) : (
                    <Trash className="w-4 h-4" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuildingCard;

