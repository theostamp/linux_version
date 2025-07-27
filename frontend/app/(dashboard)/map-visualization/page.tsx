'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Building, Filter, Search, Download, RefreshCw } from 'lucide-react';
import GoogleMapsVisualization from '@/components/GoogleMapsVisualization';
import { fetchAllBuildings, Building as BuildingType } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function MapVisualizationPage() {
  const [buildings, setBuildings] = useState<BuildingType[]>([]);
  const [filteredBuildings, setFilteredBuildings] = useState<BuildingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [showOnlyWithCoordinates, setShowOnlyWithCoordinates] = useState(true);

  // Fetch buildings on component mount
  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedBuildings = await fetchAllBuildings();
      setBuildings(fetchedBuildings);
      setFilteredBuildings(fetchedBuildings);
    } catch (err) {
      console.error('Error fetching buildings:', err);
      setError('Σφάλμα φόρτωσης κτιρίων');
    } finally {
      setLoading(false);
    }
  };

  // Filter buildings based on search term and filters
  useEffect(() => {
    let filtered = buildings;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(building =>
        building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        building.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (building.city && building.city.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by city
    if (selectedCity) {
      filtered = filtered.filter(building => building.city === selectedCity);
    }

    // Filter by coordinates
    if (showOnlyWithCoordinates) {
      filtered = filtered.filter(building => 
        (building.latitude && building.longitude) || (building.coordinates?.lat && building.coordinates?.lng)
      );
    }

    setFilteredBuildings(filtered);
  }, [buildings, searchTerm, selectedCity, showOnlyWithCoordinates]);

  // Get unique cities for filter dropdown
  const cities = Array.from(new Set(buildings.map(b => b.city).filter(Boolean))).sort();

  // Calculate statistics
  const totalBuildings = buildings.length;
  const buildingsWithCoordinates = buildings.filter(b => 
    (b.latitude && b.longitude) || (b.coordinates?.lat && b.coordinates?.lng)
  ).length;
  const buildingsWithoutCoordinates = totalBuildings - buildingsWithCoordinates;

  const exportToCSV = () => {
    const headers = ['ID', 'Όνομα', 'Διεύθυνση', 'Πόλη', 'Τ.Κ.', 'Συντεταγμένες', 'Διαμερίσματα'];
    const csvContent = [
      headers.join(','),
      ...filteredBuildings.map(building => [
        building.id,
        `"${building.name}"`,
        `"${building.address}"`,
        `"${building.city || ''}"`,
        `"${building.postal_code || ''}"`,
        (building.latitude && building.longitude) ? `${building.latitude},${building.longitude}` : 
        (building.coordinates ? `${building.coordinates.lat},${building.coordinates.lng}` : ''),
        building.apartments_count || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `buildings_map_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Φόρτωση κτιρίων...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <MapPin className="w-12 h-12 mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">{error}</p>
          <Button onClick={fetchBuildings} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Δοκιμή ξανά
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <MapPin className="w-6 h-6 mr-2 text-blue-600" />
                Οπτικοποίηση Κτιρίων στον Χάρτη
              </h1>
              <p className="text-gray-600 mt-1">
                Προβολή όλων των κτιρίων σε διαδραστικό χάρτη Google Maps
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button onClick={exportToCSV} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Εξαγωγή CSV
              </Button>
              <Button onClick={fetchBuildings} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Ανανέωση
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <Building className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Σύνολο Κτιρίων</p>
                <p className="text-2xl font-bold text-gray-900">{totalBuildings}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <MapPin className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Με Συντεταγμένες</p>
                <p className="text-2xl font-bold text-gray-900">{buildingsWithCoordinates}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <MapPin className="w-8 h-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Χωρίς Συντεταγμένες</p>
                <p className="text-2xl font-bold text-gray-900">{buildingsWithoutCoordinates}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">
                  {filteredBuildings.length}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Εμφανίζονται</p>
                <p className="text-2xl font-bold text-gray-900">{filteredBuildings.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Αναζήτηση κτιρίων..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Όλες οι πόλεις</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showOnlyWithCoordinates}
                  onChange={(e) => setShowOnlyWithCoordinates(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Μόνο με συντεταγμένες</span>
              </label>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {filteredBuildings.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Δεν βρέθηκαν κτίρια</p>
                <p className="text-sm">Δοκιμάστε να αλλάξετε τα φίλτρα αναζήτησης</p>
              </div>
            </div>
          ) : (
            <GoogleMapsVisualization
              buildings={filteredBuildings}
              height="600px"
              showInfoWindows={true}
            />
          )}
        </div>

        {/* Buildings without coordinates warning */}
        {buildingsWithoutCoordinates > 0 && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <MapPin className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Κτίρια χωρίς συντεταγμένες
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {buildingsWithoutCoordinates} κτίρια δεν έχουν συντεταγμένες και δεν εμφανίζονται στον χάρτη. 
                  Ενημερώστε τα στοιχεία τους για να εμφανιστούν.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 