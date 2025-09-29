'use client';

import React from 'react';
import type { Building } from '@/lib/api';
import { 
  X, 
  Building as BuildingIcon, 
  MapPin, 
  Home, 
  Phone, 
  Calendar,
  User,
  Mail,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BuildingDetailsModalProps {
  building: Building | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function BuildingDetailsModal({ 
  building, 
  isOpen, 
  onClose 
}: BuildingDetailsModalProps) {
  if (!isOpen || !building) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('el-GR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const openInGoogleMaps = () => {
    const lat = building.latitude || building.coordinates?.lat;
    const lng = building.longitude || building.coordinates?.lng;
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BuildingIcon className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Λεπτομέρειες Κτιρίου
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Building Name */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {building.name}
            </h3>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            {/* Address */}
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-gray-900 font-medium">Διεύθυνση</p>
                <p className="text-gray-600">{building.address}</p>
                {building.city && (
                  <p className="text-gray-600">
                    {building.city}
                    {building.postal_code && `, ${building.postal_code}`}
                  </p>
                )}
              </div>
            </div>

            {/* Apartments Count */}
            {building.apartments_count && (
              <div className="flex items-center space-x-3">
                <Home className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-gray-900 font-medium">Διαμερίσματα</p>
                  <p className="text-gray-600">{building.apartments_count} διαμερίσματα</p>
                </div>
              </div>
            )}

            {/* Manager Info */}
            {building.internal_manager_name && (
              <div className="flex items-start space-x-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium">Διαχειριστής</p>
                  <p className="text-gray-600">{building.internal_manager_name}</p>
                  {building.internal_manager_phone && (
                    <div className="flex items-center space-x-2 mt-1">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <a 
                        href={`tel:${building.internal_manager_phone}`}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        {building.internal_manager_phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Management Office Info */}
            {building.management_office_name && (
              <div className="flex items-start space-x-3">
                <BuildingIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium">Γραφείο Διαχείρισης</p>
                  <p className="text-gray-600">{building.management_office_name}</p>
                  {building.management_office_phone && (
                    <div className="flex items-center space-x-2 mt-1">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <a 
                        href={`tel:${building.management_office_phone}`}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        {building.management_office_phone}
                      </a>
                    </div>
                  )}
                  {building.management_office_address && (
                    <div className="flex items-center space-x-2 mt-1">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 text-sm">{building.management_office_address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Created Date */}
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-gray-900 font-medium">Ημερομηνία δημιουργίας</p>
                <p className="text-gray-600">{formatDate(building.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-3 pt-4 border-t">
            {/* Google Maps Button */}
            {(building.latitude || building.coordinates?.lat) && (
              <Button 
                onClick={openInGoogleMaps}
                variant="outline" 
                className="w-full flex items-center justify-center space-x-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Άνοιγμα σε Google Maps</span>
              </Button>
            )}

            {/* View Details Button */}
            <Button 
              onClick={() => {
                // Navigate to building details page
                window.location.href = `/buildings/${building.id}`;
              }}
              className="w-full"
            >
              Προβολή πλήρων στοιχείων
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 