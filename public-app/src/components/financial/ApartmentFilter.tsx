'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Home } from 'lucide-react';
import { api } from '@/lib/api';

interface Apartment {
  id: number;
  number: string;
  owner_name: string;
}

interface ApartmentFilterProps {
  buildingId: number;
  selectedApartmentId: string;
  onApartmentChange: (apartmentId: string) => void;
  searchTerm: string;
  onSearchChange: (searchTerm: string) => void;
  className?: string;
}

export const ApartmentFilter: React.FC<ApartmentFilterProps> = ({
  buildingId,
  selectedApartmentId,
  onApartmentChange,
  searchTerm,
  onSearchChange,
  className = ''
}) => {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(false);

  // Load apartments for the building
  useEffect(() => {
    const loadApartments = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/apartments/?building_id=${buildingId}`);
        setApartments(response.data.results || response.data);
      } catch (error) {
        console.error('Σφάλμα φόρτωσης διαμερισμάτων:', error);
      } finally {
        setLoading(false);
      }
    };

    if (buildingId) {
      loadApartments();
    }
  }, [buildingId]);

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Apartment Selector */}
      <div className="flex items-center gap-2">
        <Home className="h-4 w-4 text-muted-foreground" />
        <Select
          value={selectedApartmentId}
          onValueChange={onApartmentChange}
          disabled={loading}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Όλα τα διαμερίσματα" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλα τα διαμερίσματα</SelectItem>
            {apartments.map((apartment) => (
              <SelectItem key={apartment.id} value={apartment.id.toString()}>
                {apartment.number} - {apartment.owner_name || 'Άγνωστος'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Αναζήτηση με αριθμό διαμερίσματος..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 w-64"
        />
      </div>
    </div>
  );
};
